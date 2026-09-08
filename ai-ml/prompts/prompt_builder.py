"""
prompt_builder.py
-----------------
Assembles the Groq API messages payload for Professor Ada and validates responses.
Zero hardcoded values — all settings come from environment variables or config files.

Environment Variables (set in backend/python-service/.env):
    GROQ_MODEL         : Groq model ID  (default: llama-3.3-70b-versatile)
    GROQ_MAX_TOKENS    : Max tokens to generate  (default: 1024)
    GROQ_TEMPERATURE   : Sampling temperature (default: 0.3)
    MAX_HISTORY_TURNS  : Conversation turns to keep in context (default: 6)

Usage:
    from prompt_builder import build_prompt, parse_groq_response, validate_response_schema
    payload = build_prompt(user_question, conversation_history)
    # payload → pass directly to Groq client or httpx POST
"""

import json
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# ── Paths (resolved relative to this file — never hardcoded) ──────────────────

_THIS_DIR = Path(__file__).parent              # ai-ml/prompts/
_SYSTEM_PROMPT_PATH = _THIS_DIR / "system_prompt.md"
_FEW_SHOT_PATH = _THIS_DIR / "few_shot_examples.json"

# ── Load config from environment (all have sensible non-secret defaults) ───────

GROQ_MODEL: str = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_MAX_TOKENS: int = int(os.environ.get("GROQ_MAX_TOKENS", "1024"))
GROQ_TEMPERATURE: float = float(os.environ.get("GROQ_TEMPERATURE", "0.3"))
MAX_HISTORY_TURNS: int = int(os.environ.get("MAX_HISTORY_TURNS", "6"))

# ── Valid schema values (documented here, not in the prompt) ──────────────────

VALID_MOODS = {"explaining", "thinking", "encouraging", "celebrating"}
VALID_LANGUAGES = {"python", "java", "cpp"}
VALID_VISUAL_TYPES = {"sorting", "tree", "graph", "array", "dp"}
VALID_ACTIONS = {"compare", "swap", "highlight", "traverse", "insert", "delete", "visit", "relax"}
MAX_EXPLANATION_WORDS = int(os.environ.get("MAX_EXPLANATION_WORDS", "150"))

# ── Load static assets ────────────────────────────────────────────────────────

def _load_system_prompt() -> str:
    """Load Professor Ada's system prompt from Markdown file."""
    if not _SYSTEM_PROMPT_PATH.exists():
        raise FileNotFoundError(
            f"System prompt not found at: {_SYSTEM_PROMPT_PATH}\n"
            "Ensure ai-ml/prompts/system_prompt.md exists."
        )
    return _SYSTEM_PROMPT_PATH.read_text(encoding="utf-8").strip()


def _load_few_shot_examples() -> List[Dict[str, str]]:
    """Load few-shot Q&A examples from JSON file."""
    if not _FEW_SHOT_PATH.exists():
        raise FileNotFoundError(
            f"Few-shot examples not found at: {_FEW_SHOT_PATH}\n"
            "Ensure ai-ml/prompts/few_shot_examples.json exists."
        )
    data = json.loads(_FEW_SHOT_PATH.read_text(encoding="utf-8"))
    return data.get("examples", [])


# Load once at module import time
SYSTEM_PROMPT: str = _load_system_prompt()
FEW_SHOT_EXAMPLES: List[Dict[str, str]] = _load_few_shot_examples()

# ── Core Builder ──────────────────────────────────────────────────────────────

def build_prompt(
    user_question: str,
    conversation_history: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, Any]:
    """
    Build the complete Groq API chat completions payload.

    Message order (OpenAI-compatible):
        [{role:'system'}] → [few-shot examples] → [trimmed history] → [current question]

    Args:
        user_question: The student's current DS&A question.
        conversation_history: List of prior {role, content} turns (oldest first).
            Will be trimmed to MAX_HISTORY_TURNS.

    Returns:
        Dict ready to pass to groq.chat.completions.create(**payload) or httpx POST body.

    Raises:
        ValueError: If user_question is empty or not a string.
    """
    if not user_question or not isinstance(user_question, str) or not user_question.strip():
        raise ValueError("user_question must be a non-empty string")

    history = conversation_history or []
    trimmed_history = _trim_history(history, MAX_HISTORY_TURNS)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *FEW_SHOT_EXAMPLES,
        *trimmed_history,
        {"role": "user", "content": user_question.strip()},
    ]

    return {
        "model": GROQ_MODEL,
        "max_tokens": GROQ_MAX_TOKENS,
        "temperature": GROQ_TEMPERATURE,
        "messages": messages,
    }


def _trim_history(
    history: List[Dict[str, str]],
    max_turns: int,
) -> List[Dict[str, str]]:
    """Keep only the most recent N turns (each turn = user + assistant = 2 messages)."""
    max_messages = max_turns * 2
    return history[-max_messages:] if len(history) > max_messages else history


# ── Response Parser ───────────────────────────────────────────────────────────

def parse_groq_response(raw_content: str) -> Tuple[bool, Optional[Dict], Optional[str]]:
    """
    Parse and validate the raw JSON string returned by Groq.

    Groq (like Claude) sometimes wraps JSON in markdown code fences — this strips them.

    Args:
        raw_content: The raw text from groq_response.choices[0].message.content

    Returns:
        Tuple of (is_valid, parsed_dict_or_None, error_message_or_None)
    """
    if not raw_content or not isinstance(raw_content, str):
        return False, None, "Empty or non-string response from Groq"

    # Strip markdown code fences if present
    cleaned = re.sub(r"^```json\s*", "", raw_content.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r"^```\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    cleaned = cleaned.strip()

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        return False, None, f"JSON parse failed: {exc}"

    error = validate_response_schema(parsed)
    if error:
        return False, parsed, error

    return True, parsed, None


# ── Schema Validator ──────────────────────────────────────────────────────────

def validate_response_schema(data: Dict[str, Any]) -> Optional[str]:
    """
    Validate the parsed Groq response against the Professor Ada output schema.

    Args:
        data: Parsed JSON dict from Groq.

    Returns:
        Error message string if invalid, None if valid.
    """
    # explanation
    explanation = data.get("explanation", "")
    if not explanation or not isinstance(explanation, str) or not explanation.strip():
        return 'Missing or empty "explanation" field'

    word_count = len(explanation.strip().split())
    if word_count > MAX_EXPLANATION_WORDS:
        return f'"explanation" exceeds {MAX_EXPLANATION_WORDS} words (got {word_count})'

    # mood
    mood = data.get("mood")
    if mood not in VALID_MOODS:
        return f'Invalid mood: "{mood}". Must be one of: {", ".join(sorted(VALID_MOODS))}'

    # suggestedFollowUps
    follow_ups = data.get("suggestedFollowUps")
    if not isinstance(follow_ups, list) or len(follow_ups) != 2:
        return '"suggestedFollowUps" must be an array of exactly 2 strings'

    # Out-of-scope: code and visualSequence must both be null
    if data.get("code") is None and data.get("visualSequence") is None:
        return None  # valid out-of-scope response

    # In-scope: validate code block
    code = data.get("code")
    if code and isinstance(code, dict):
        if code.get("language") not in VALID_LANGUAGES:
            return f'Invalid code language: "{code.get("language")}"'
        if not code.get("snippet") or not code["snippet"].strip():
            return "code.snippet is empty"

    # In-scope: validate visualSequence
    vs = data.get("visualSequence")
    if vs and isinstance(vs, dict):
        if vs.get("type") not in VALID_VISUAL_TYPES:
            return f'Invalid visualSequence type: "{vs.get("type")}"'
        steps = vs.get("steps", [])
        if not isinstance(steps, list) or len(steps) < 3:
            return f"visualSequence.steps must have ≥3 steps (got {len(steps)})"
        for step in steps:
            if step.get("action") not in VALID_ACTIONS:
                return f'Invalid action: "{step.get("action")}" at step {step.get("step")}'

    return None


# ── Convenience: word count helper ────────────────────────────────────────────

def count_words(text: str) -> int:
    """Count words in a string."""
    return len(text.strip().split()) if text and text.strip() else 0


# ── Module info (printed on direct run for quick sanity check) ────────────────

if __name__ == "__main__":
    print("=== prompt_builder.py self-check ===")
    print(f"GROQ_MODEL       : {GROQ_MODEL}")
    print(f"GROQ_MAX_TOKENS  : {GROQ_MAX_TOKENS}")
    print(f"GROQ_TEMPERATURE : {GROQ_TEMPERATURE}")
    print(f"MAX_HISTORY_TURNS: {MAX_HISTORY_TURNS}")
    print(f"System prompt    : {len(SYSTEM_PROMPT)} chars")
    print(f"Few-shot examples: {len(FEW_SHOT_EXAMPLES)} messages")

    sample = build_prompt("How does QuickSort work?", [])
    print(f"Sample payload model     : {sample['model']}")
    print(f"Sample payload messages  : {len(sample['messages'])} total")
    print(f"First message role       : {sample['messages'][0]['role']}")
    print("Self-check PASSED")
