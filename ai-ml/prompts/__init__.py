# ai-ml/prompts — Python package marker
# Exposes prompt_builder utilities at package level for easy import.

from .prompt_builder import (
    build_prompt,
    parse_groq_response,
    validate_response_schema,
    count_words,
    SYSTEM_PROMPT,
    FEW_SHOT_EXAMPLES,
    GROQ_MODEL,
    GROQ_MAX_TOKENS,
    GROQ_TEMPERATURE,
    MAX_HISTORY_TURNS,
    MAX_EXPLANATION_WORDS,
)

__all__ = [
    "build_prompt",
    "parse_groq_response",
    "validate_response_schema",
    "count_words",
    "SYSTEM_PROMPT",
    "FEW_SHOT_EXAMPLES",
    "GROQ_MODEL",
    "GROQ_MAX_TOKENS",
    "GROQ_TEMPERATURE",
    "MAX_HISTORY_TURNS",
    "MAX_EXPLANATION_WORDS",
]
