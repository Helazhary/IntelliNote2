"""Anthropic AI integration — Phase 4b. Powers /ai/transform, /ai/revise, /ai/notepilot.

Two axes shape a transform (SPEC Features 3 & 10):
  • the active **preset** → the system prompt (how aggressively to change content; REQ-AIA-05),
  • the **action** → the user instruction (what to do; REQ-AIA-01).
NotePilot ignores the preset and uses a fixed neutral continuation prompt (REQ-NP-11, DEC-014).

The Anthropic call is isolated behind `complete()` / `stream_tokens()` so the rest of the app — and
the tests — can run without a live API key (tests monkeypatch these two seams).
"""
from collections.abc import Iterator

import anthropic

from app.core.config import settings

# Shared framing for every transform/revise call.
_BASE_SYSTEM = (
    "You are SmartNotes AI, an assistant that reformats and improves Markdown notes. "
    "Return ONLY the resulting note content as Markdown. Do not add a preamble, do not explain "
    "what you changed, and do not wrap the whole response in a code fence."
)

# Preset → behavioral system prompt (REQ-PRESET-01, SPEC Feature 10). -----------------------------
PRESET_SYSTEM_PROMPTS: dict[str, str] = {
    "format_only": (
        "Add structure only: headings, sections, bullet points, and spacing. Do NOT change, rewrite, "
        "rephrase, correct, or remove any wording. Preserve the author's exact sentences and meaning."
    ),
    "clean_up": (
        "Fix grammar, spelling, and punctuation, and make light readability improvements. Preserve "
        "the author's meaning, voice, and overall structure. Do not add new ideas."
    ),
    "enhance": (
        "Improve clarity, flow, and phrasing. Rewrite awkward or unclear sentences and tighten the "
        "wording while preserving the original meaning and intent."
    ),
    "explain": (
        "Keep the original content and add short, clear explanations beneath complex or technical "
        "ideas so they are easier to understand."
    ),
    "summarize": (
        "Distill the content into a concise summary with the key points and main takeaways. Drop "
        "redundancy; keep what matters."
    ),
    "study_mode": (
        "Rework the content into study material: clear headings, definitions of key terms, concrete "
        "examples, and a short list of review questions or points to remember."
    ),
    "meeting_mode": (
        "Reorganize into a meeting summary: extract decisions, action items, tasks, deadlines, and "
        "owners into clearly labeled sections."
    ),
}

# Action → user-message instruction (REQ-AIA-01, the 8 actions). ----------------------------------
ACTION_INSTRUCTIONS: dict[str, str] = {
    "format": "Format this note with clear headings, sections, and lists.",
    "enhance": "Enhance this note: improve its clarity, flow, and phrasing.",
    "summarize": "Summarize this note into concise key points and takeaways.",
    "explain": "Add short explanations beneath the complex ideas in this note.",
    "simplify": "Simplify this note so it is easy to understand for a general audience.",
    "bullets": "Rewrite this note as a clear, well-organized bulleted list.",
    "action_items": "Extract the actionable tasks in this note as a checklist of action items.",
    # `custom` is handled separately — the user's free-form instruction is used directly.
}

# Fixed neutral NotePilot prompt — independent of preset (REQ-NP-11, DEC-014).
NOTEPILOT_SYSTEM = (
    "You are an inline writing assistant, like autocomplete for notes. Continue the user's text "
    "naturally from exactly where it stops. Output ONLY the continuation — no preamble, no quotes, "
    "no headings, no restating prior text. Keep it short (a phrase or a sentence or two) and match "
    "the user's tone, language, and Markdown style."
)

_NOTEPILOT_MAX_TOKENS = 80
_TRANSFORM_MAX_TOKENS = 4096


class AIError(Exception):
    """Raised on any upstream/provider failure; the router maps it to 502 ai_error."""


def build_transform_messages(
    action: str, text: str, preset: str, instruction: str | None
) -> tuple[str, str]:
    """Return (system, user) for a transform. `scope` does not change the prompt — the caller already
    passes the right `text` (selection vs full document, REQ-AIA-03/04)."""
    system = f"{_BASE_SYSTEM}\n\n{PRESET_SYSTEM_PROMPTS[preset]}"
    if action == "custom":
        task = (instruction or "").strip()
    else:
        task = ACTION_INSTRUCTIONS[action]
    user = f"{task}\n\n---\n{text}"
    return system, user


def build_revise_messages(previous_output: str, instruction: str, preset: str) -> tuple[str, str]:
    system = f"{_BASE_SYSTEM}\n\n{PRESET_SYSTEM_PROMPTS[preset]}"
    user = (
        "Here is a previous AI result:\n\n---\n"
        f"{previous_output}\n---\n\n"
        f"Revise it according to this instruction: {instruction.strip()}"
    )
    return system, user


# --- Anthropic seams (monkeypatched in tests) ---------------------------------------------------
_client: anthropic.Anthropic | None = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        if not settings.ANTHROPIC_API_KEY:
            raise AIError("ANTHROPIC_API_KEY is not configured.")
        _client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _client


def complete(system: str, user: str, max_tokens: int = _TRANSFORM_MAX_TOKENS) -> str:
    """One-shot completion. Raises AIError on any provider failure."""
    try:
        message = _get_client().messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        return "".join(
            block.text for block in message.content if getattr(block, "type", None) == "text"
        ).strip()
    except AIError:
        raise
    except Exception as exc:  # anthropic.APIError, network, etc. → uniform AIError
        raise AIError(str(exc)) from exc


def stream_tokens(system: str, user: str, max_tokens: int = _NOTEPILOT_MAX_TOKENS) -> Iterator[str]:
    """Yield text chunks from a streaming completion. Raises AIError on failure."""
    try:
        with _get_client().messages.stream(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
        ) as stream:
            yield from stream.text_stream
    except AIError:
        raise
    except Exception as exc:
        raise AIError(str(exc)) from exc


# --- High-level operations used by the router ---------------------------------------------------
def run_transform(action: str, text: str, preset: str, instruction: str | None) -> str:
    system, user = build_transform_messages(action, text, preset, instruction)
    return complete(system, user)


def run_revise(previous_output: str, instruction: str, preset: str) -> str:
    system, user = build_revise_messages(previous_output, instruction, preset)
    return complete(system, user)


def notepilot_token_stream(context: str) -> Iterator[str]:
    """Continuation tokens for NotePilot (fixed neutral prompt). Raises AIError on failure."""
    yield from stream_tokens(NOTEPILOT_SYSTEM, context)
