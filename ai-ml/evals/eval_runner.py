"""
eval_runner.py
--------------
Automated evaluation runner for Professor Ada (AI Teaching Assistant).

Reads test_scenarios.json, calls the backend /api/ask endpoint for each scenario,
validates the JSON schema, checks latency, word count, and mood accuracy.

Environment Variables:
    BACKEND_URL  : Backend base URL  (e.g. http://localhost:5000)
                   Required — no default to avoid silently pointing at wrong server.
    REQUEST_TIMEOUT_SECONDS : Per-request timeout (default: 10)

Usage:
    # Run all scenarios
    python ai-ml/evals/eval_runner.py

    # Run a single scenario
    python ai-ml/evals/eval_runner.py --scenario scenario-01

    # Run only 'hard' difficulty scenarios
    python ai-ml/evals/eval_runner.py --difficulty hard

    # Verbose output
    python ai-ml/evals/eval_runner.py --verbose

    # Skip saving results to disk
    python ai-ml/evals/eval_runner.py --no-save
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import httpx  # pip install httpx

# ── Paths ─────────────────────────────────────────────────────────────────────

_THIS_DIR = Path(__file__).parent               # ai-ml/evals/
_SCENARIOS_PATH = _THIS_DIR / "test_scenarios.json"
_RESULTS_DIR = _THIS_DIR / "results"

# ── Import validator from prompt_builder (no hardcoded schema here) ───────────

_PROMPTS_DIR = _THIS_DIR.parent / "prompts"
sys.path.insert(0, str(_PROMPTS_DIR))

try:
    from prompt_builder import validate_response_schema, MAX_EXPLANATION_WORDS
except ImportError as exc:
    print(f"[ERROR] Could not import prompt_builder: {exc}")
    print("Ensure ai-ml/prompts/prompt_builder.py exists.")
    sys.exit(1)

# ── Environment config ────────────────────────────────────────────────────────

def _require_env(key: str) -> str:
    """Read an env var — raise a clear error if it is missing."""
    value = os.environ.get(key, "").strip()
    if not value:
        raise EnvironmentError(
            f"\n[eval_runner] Required environment variable '{key}' is not set.\n"
            f"Please set it before running:\n"
            f"  Windows : $env:{key} = 'http://localhost:5000'\n"
            f"  Linux   : export {key}=http://localhost:5000"
        )
    return value


def _env(key: str, default: str) -> str:
    return os.environ.get(key, default).strip() or default


def _resolve_backend_url() -> str:
    url = os.environ.get("BACKEND_URL", "").strip()
    if url:
        return url
    import socket
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.settimeout(0.3)
        if s.connect_ex(("127.0.0.1", 5001)) == 0:
            return "http://localhost:5001"
    except Exception:
        pass
    finally:
        s.close()
    return "http://localhost:5000"

BACKEND_URL: str = _resolve_backend_url()
REQUEST_TIMEOUT: float = float(_env("REQUEST_TIMEOUT_SECONDS", "10"))

# ── ANSI colour helpers ───────────────────────────────────────────────────────

class Color:
    RESET  = "\x1b[0m"
    BOLD   = "\x1b[1m"
    GREEN  = "\x1b[32m"
    RED    = "\x1b[31m"
    YELLOW = "\x1b[33m"
    CYAN   = "\x1b[36m"
    GRAY   = "\x1b[90m"
    WHITE  = "\x1b[37m"

c = Color()

def log_pass(msg: str) -> None:  print(f"  {c.GREEN}✓{c.RESET} {msg}")
def log_fail(msg: str) -> None:  print(f"  {c.RED}✗{c.RESET} {c.RED}{msg}{c.RESET}")
def log_warn(msg: str) -> None:  print(f"  {c.YELLOW}⚠{c.RESET} {msg}")
def log_info(msg: str) -> None:  print(f"  {c.CYAN}ℹ{c.RESET} {msg}")
def log_gray(msg: str) -> None:  print(f"  {c.GRAY}{msg}{c.RESET}")
def log_header(msg: str) -> None: print(f"\n{c.BOLD}{c.WHITE}{msg}{c.RESET}")

# ── Scenario validation ────────────────────────────────────────────────────────

def validate_response(response_body: Dict, scenario: Dict) -> Tuple[List[str], List[str]]:
    """
    Validate a backend response against a test scenario's expectations.

    Returns:
        (passes, issues) — both as lists of human-readable strings.
    """
    passes: List[str] = []
    issues: List[str] = []

    if not response_body or not isinstance(response_body, dict):
        return [], ["Response is not a valid JSON object"]

    # ── explanation word count ─────────────────────────────────────────────────
    explanation = response_body.get("explanation", "")
    if not explanation:
        issues.append('"explanation" is missing or empty')
    else:
        word_count = len(explanation.strip().split())
        limit = scenario.get("max_explanation_words", MAX_EXPLANATION_WORDS)
        if word_count > limit:
            issues.append(f'"explanation" is {word_count} words — exceeds limit of {limit}')
        else:
            passes.append(f"explanation word count OK ({word_count}/{limit})")

    # ── mood ──────────────────────────────────────────────────────────────────
    mood = response_body.get("mood")
    expected_mood = scenario.get("expected_mood")
    if mood == expected_mood:
        passes.append(f'mood matches expected: "{mood}"')
    else:
        issues.append(f'mood mismatch: expected "{expected_mood}", got "{mood}"')

    # ── suggestedFollowUps ────────────────────────────────────────────────────
    follow_ups = response_body.get("suggestedFollowUps")
    if isinstance(follow_ups, list) and len(follow_ups) == 2:
        passes.append("suggestedFollowUps has correct count (2)")
    else:
        issues.append(f'"suggestedFollowUps" must be array of 2 (got {type(follow_ups).__name__})')

    # ── out-of-scope check ────────────────────────────────────────────────────
    if scenario.get("expected_visual_type") is None:
        if response_body.get("code") is None:
            passes.append("code is null (correct for out-of-scope)")
        else:
            issues.append('Out-of-scope: "code" should be null')
        if response_body.get("visualSequence") is None:
            passes.append("visualSequence is null (correct for out-of-scope)")
        else:
            issues.append('Out-of-scope: "visualSequence" should be null')
        return passes, issues

    # ── in-scope: code block ──────────────────────────────────────────────────
    code = response_body.get("code")
    if isinstance(code, dict):
        lang = code.get("language")
        if lang in {"python", "java", "cpp"}:
            passes.append(f'code.language valid: "{lang}"')
        else:
            issues.append(f'Invalid code language: "{lang}"')
        if code.get("snippet", "").strip():
            passes.append("code.snippet is present")
        else:
            issues.append("code.snippet is empty")
    else:
        issues.append('"code" object missing for in-scope question')

    # ── in-scope: visualSequence ──────────────────────────────────────────────
    vs = response_body.get("visualSequence")
    if isinstance(vs, dict):
        vs_type = vs.get("type")
        expected_type = scenario.get("expected_visual_type")
        if vs_type == expected_type:
            passes.append(f'visualSequence.type matches: "{vs_type}"')
        else:
            issues.append(f'visualSequence.type mismatch: expected "{expected_type}", got "{vs_type}"')

        steps = vs.get("steps", [])
        if isinstance(steps, list) and len(steps) >= 3:
            passes.append(f"visualSequence has {len(steps)} steps (≥3 required)")
        else:
            issues.append(f"visualSequence needs ≥3 steps (got {len(steps) if isinstance(steps, list) else 0})")
    else:
        issues.append('"visualSequence" missing for in-scope question')

    return passes, issues


# ── Single scenario runner ─────────────────────────────────────────────────────

def run_scenario(scenario: Dict, verbose: bool) -> Dict[str, Any]:
    sid = scenario["id"]
    name = scenario["name"]
    difficulty = scenario.get("difficulty", "unknown").upper()
    user_input = scenario["user_input"]
    max_latency = scenario.get("max_latency_seconds", 2.0)

    log_header(f"[{sid}] {name}  ({difficulty})")
    log_gray(f'Input: "{user_input}"')

    start = time.time()
    try:
        resp = httpx.post(
            f"{BACKEND_URL}/api/ask",
            json={"question": user_input, "sessionId": f"eval-{sid}"},
            timeout=REQUEST_TIMEOUT,
        )
    except httpx.ConnectError:
        log_fail(f"Cannot connect to {BACKEND_URL} — is the backend running?")
        return {"scenarioId": sid, "status": "ERROR", "issues": ["Connection refused"], "passes": [], "latencyMs": None}
    except httpx.TimeoutException:
        log_fail(f"Request timed out after {REQUEST_TIMEOUT}s")
        return {"scenarioId": sid, "status": "ERROR", "issues": ["Timeout"], "passes": [], "latencyMs": None}

    latency_ms = int((time.time() - start) * 1000)
    latency_s = latency_ms / 1000

    # Latency
    if latency_s <= max_latency:
        log_pass(f"Latency: {latency_ms}ms  (limit: {int(max_latency * 1000)}ms)")
    else:
        log_fail(f"Latency: {latency_ms}ms EXCEEDS limit of {int(max_latency * 1000)}ms")

    # HTTP status
    if resp.status_code != 200:
        log_fail(f"HTTP {resp.status_code}: {resp.text[:200]}")
        return {"scenarioId": sid, "status": "FAIL", "latencyMs": latency_ms, "passes": [], "issues": [f"HTTP {resp.status_code}"]}

    try:
        body = resp.json()
    except Exception:
        log_fail("Response is not valid JSON")
        return {"scenarioId": sid, "status": "FAIL", "latencyMs": latency_ms, "passes": [], "issues": ["Invalid JSON response"]}

    passes, issues = validate_response(body, scenario)

    if verbose:
        for p in passes:
            log_pass(p)
        for i in issues:
            log_fail(i)
    else:
        if not issues:
            log_pass(f"Schema: all {len(passes)} checks passed")
        else:
            for i in issues:
                log_fail(i)

    latency_ok = latency_s <= max_latency
    status = "PASS" if not issues and latency_ok else "FAIL"
    return {
        "scenarioId": sid,
        "name": name,
        "status": status,
        "latencyMs": latency_ms,
        "passes": passes,
        "issues": issues,
    }


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Professor Ada — Automated Eval Runner")
    parser.add_argument("--scenario",   help="Run a single scenario by ID (e.g. scenario-01)")
    parser.add_argument("--difficulty", help="Filter by difficulty: easy | medium | hard | edge")
    parser.add_argument("--verbose",    action="store_true", help="Print every individual check")
    parser.add_argument("--no-save",    action="store_true", help="Do not save results JSON")
    args = parser.parse_args()

    print(f"\n{c.BOLD}{c.CYAN}╔══════════════════════════════════════════════╗{c.RESET}")
    print(f"{c.BOLD}{c.CYAN}║   Professor Ada — Automated Eval Runner      ║{c.RESET}")
    print(f"{c.BOLD}{c.CYAN}╚══════════════════════════════════════════════╝{c.RESET}")
    print(f"{c.GRAY}  Backend : {BACKEND_URL}{c.RESET}")
    print(f"{c.GRAY}  Scenarios: {_SCENARIOS_PATH}{c.RESET}")

    # ── Health check ─────────────────────────────────────────────────────────
    try:
        health = httpx.get(f"{BACKEND_URL}/health", timeout=5)
        log_info(f"Backend health: {health.json()}")
    except Exception as exc:
        print(f"\n{c.RED}{c.BOLD}ERROR: Cannot reach backend at {BACKEND_URL}{c.RESET}")
        print(f"{c.YELLOW}Set BACKEND_URL and ensure the server is running.{c.RESET}\n")
        sys.exit(1)

    # ── Load scenarios ────────────────────────────────────────────────────────
    if not _SCENARIOS_PATH.exists():
        print(f"{c.RED}Scenarios file not found: {_SCENARIOS_PATH}{c.RESET}")
        sys.exit(1)

    data = json.loads(_SCENARIOS_PATH.read_text(encoding="utf-8"))
    scenarios: List[Dict] = data.get("scenarios", [])

    if args.scenario:
        scenarios = [s for s in scenarios if s["id"] == args.scenario]
        if not scenarios:
            print(f"{c.RED}Scenario '{args.scenario}' not found.{c.RESET}")
            sys.exit(1)

    if args.difficulty:
        scenarios = [s for s in scenarios if s.get("difficulty") == args.difficulty]

    print(f"\n{c.GRAY}  Running {len(scenarios)} scenario(s)...{c.RESET}")

    # ── Run ───────────────────────────────────────────────────────────────────
    results: List[Dict] = []
    for scenario in scenarios:
        result = run_scenario(scenario, verbose=args.verbose)
        results.append(result)

    # ── Summary ───────────────────────────────────────────────────────────────
    passed  = sum(1 for r in results if r["status"] == "PASS")
    failed  = sum(1 for r in results if r["status"] == "FAIL")
    errored = sum(1 for r in results if r["status"] == "ERROR")
    valid_latencies = [r["latencyMs"] for r in results if r.get("latencyMs") is not None]
    avg_latency = int(sum(valid_latencies) / len(valid_latencies)) if valid_latencies else 0

    print(f"\n{c.BOLD}{'═' * 50}{c.RESET}")
    print(f"{c.BOLD}  RESULTS SUMMARY{c.RESET}")
    print(f"{'═' * 50}")
    print(f"  Total   : {len(results)}")
    print(f"  {c.GREEN}PASS    : {passed}{c.RESET}")
    print(f"  {c.RED}FAIL    : {failed}{c.RESET}")
    if errored:
        print(f"  {c.YELLOW}ERROR   : {errored}{c.RESET}")
    print(f"  Avg latency : {avg_latency}ms")
    print(f"  Pass rate   : {passed / len(results) * 100:.1f}%")
    print(f"{'═' * 50}\n")

    # ── Save results ──────────────────────────────────────────────────────────
    if not args.no_save:
        _RESULTS_DIR.mkdir(parents=True, exist_ok=True)
        ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        out_file = _RESULTS_DIR / f"eval-run-{ts}.json"
        payload = {
            "timestamp": ts,
            "backend_url": BACKEND_URL,
            "summary": {"passed": passed, "failed": failed, "errored": errored, "avg_latency_ms": avg_latency},
            "results": results,
        }
        out_file.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        log_info(f"Results saved → {out_file}")

    sys.exit(1 if (failed + errored) > 0 else 0)


if __name__ == "__main__":
    main()
