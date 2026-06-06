"""Google Gemini AI integration — Phase 4b (provider migrated per DEC-018). Powers
/ai/transform, /ai/revise, /ai/notepilot.

Two axes shape a transform (SPEC Features 3 & 10):
  • the active **preset** → the system prompt (how aggressively to change content; REQ-AIA-05),
  • the **action** → the user instruction (what to do; REQ-AIA-01).
NotePilot ignores the preset and uses a fixed neutral continuation prompt (REQ-NP-11, DEC-014).

The Gemini call is isolated behind `complete()` / `stream_tokens()` so the rest of the app — and
the tests — can run without a live API key (tests monkeypatch these two seams).
"""
from collections.abc import Iterator

from google import genai
from google.genai import types

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


# --- Gemini seams (monkeypatched in tests) ------------------------------------------------------
_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        if not settings.GEMINI_API_KEY:
            raise AIError("GEMINI_API_KEY is not configured.")
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client


def _config(system: str, max_tokens: int) -> types.GenerateContentConfig:
    # thinking_budget=0 disables the gemini-2.5 thinking step so the small NotePilot
    # token budget isn't consumed by reasoning, yielding empty output.
    return types.GenerateContentConfig(
        system_instruction=system,
        max_output_tokens=max_tokens,
        thinking_config=types.ThinkingConfig(thinking_budget=0),
    )


def complete(
    system: str, user: str, max_tokens: int = _TRANSFORM_MAX_TOKENS, model: str | None = None
) -> str:
    """One-shot completion. Raises AIError on any provider failure."""
    try:
        resp = _get_client().models.generate_content(
            model=model or settings.AI_MODEL_DEFAULT,
            contents=user,
            config=_config(system, max_tokens),
        )
        return (resp.text or "").strip()
    except AIError:
        raise
    except Exception as exc:  # google.genai.errors.APIError, network, safety, etc. → uniform AIError
        raise AIError(str(exc)) from exc


def stream_tokens(
    system: str, user: str, max_tokens: int = _NOTEPILOT_MAX_TOKENS, model: str | None = None
) -> Iterator[str]:
    """Yield text chunks from a streaming completion. Raises AIError on failure."""
    try:
        stream = _get_client().models.generate_content_stream(
            model=model or settings.AI_MODEL_DEFAULT,
            contents=user,
            config=_config(system, max_tokens),
        )
        for chunk in stream:
            if chunk.text:
                yield chunk.text
    except AIError:
        raise
    except Exception as exc:
        raise AIError(str(exc)) from exc


# --- High-level operations used by the router ---------------------------------------------------
def run_transform(action: str, text: str, preset: str, instruction: str | None) -> str:
    system, user = build_transform_messages(action, text, preset, instruction)
    return complete(system, user, model=settings.model_for("transform"))


def run_revise(previous_output: str, instruction: str, preset: str) -> str:
    system, user = build_revise_messages(previous_output, instruction, preset)
    return complete(system, user, model=settings.model_for("transform"))


def notepilot_token_stream(context: str) -> Iterator[str]:
    """Continuation tokens for NotePilot (fixed neutral prompt). Raises AIError on failure."""
    yield from stream_tokens(NOTEPILOT_SYSTEM, context, model=settings.model_for("notepilot"))
