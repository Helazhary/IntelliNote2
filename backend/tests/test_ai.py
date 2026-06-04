"""AI route + service integration tests — REQ-AIA-*, REQ-REV-*, REQ-CPMT-*, REQ-NP-*.

The Anthropic seams (`ai_service.complete` / `ai_service.stream_tokens`) are monkeypatched so the
suite runs with no API key — exercising prompt construction + routing/streaming logic, not the model.
"""
import pytest

from app.services import ai_service
from app.services.ai_service import (
    ACTION_INSTRUCTIONS,
    NOTEPILOT_SYSTEM,
    PRESET_SYSTEM_PROMPTS,
    build_revise_messages,
    build_transform_messages,
)


@pytest.fixture()
def note(client, auth):
    resp = client.post("/notes", json={"title": "n", "content": "raw text"}, headers=auth["headers"])
    return resp.json()


def _echo_system(monkeypatch):
    """Patch complete() to echo back the system prompt so tests can assert preset behavior."""
    monkeypatch.setattr(ai_service, "complete", lambda system, user, **k: f"SYS::{system}")


def _echo_user(monkeypatch):
    monkeypatch.setattr(ai_service, "complete", lambda system, user, **k: f"USER::{user}")


# --- Prompt builders (pure) ---------------------------------------------------------------------
def test_all_seven_presets_have_distinct_system_prompts():
    prompts = set(PRESET_SYSTEM_PROMPTS.values())
    assert len(PRESET_SYSTEM_PROMPTS) == 7 and len(prompts) == 7  # REQ-PRESET-01


def test_build_transform_uses_preset_and_action():
    system, user = build_transform_messages("summarize", "hello", "format_only", None)
    assert PRESET_SYSTEM_PROMPTS["format_only"] in system  # REQ-AIA-05
    assert ACTION_INSTRUCTIONS["summarize"] in user and "hello" in user


def test_build_transform_custom_uses_instruction():
    system, user = build_transform_messages("custom", "body", "enhance", "Make it a poem")
    assert "Make it a poem" in user and "body" in user  # REQ-CPMT-02


def test_build_revise_includes_previous_and_instruction():
    _, user = build_revise_messages("prev output", "shorter please", "enhance")
    assert "prev output" in user and "shorter please" in user  # REQ-REV-05


# --- /ai/transform ------------------------------------------------------------------------------
def test_transform_requires_auth(client, note):
    body = {"note_id": note["id"], "action": "format", "scope": "document", "text": "x", "preset": "enhance"}
    assert client.post("/ai/transform", json=body).status_code == 401  # NFR-SEC-03


def test_transform_unknown_note_404(client, auth, monkeypatch):
    _echo_user(monkeypatch)
    body = {"note_id": "missing", "action": "format", "scope": "document", "text": "x", "preset": "enhance"}
    resp = client.post("/ai/transform", json=body, headers=auth["headers"])
    assert resp.status_code == 404


def test_transform_returns_preview_output(client, auth, note, monkeypatch):
    monkeypatch.setattr(ai_service, "complete", lambda s, u, **k: "FORMATTED")
    body = {"note_id": note["id"], "action": "format", "scope": "selection", "text": "raw", "preset": "enhance"}
    resp = client.post("/ai/transform", json=body, headers=auth["headers"])
    assert resp.status_code == 200
    assert resp.json() == {"output": "FORMATTED", "action": "format", "scope": "selection"}
    # Preview only — note content is untouched (REQ-REV-01).
    assert client.get(f"/notes/{note['id']}", headers=auth["headers"]).json()["content"] == "raw text"


def test_all_eight_actions_invocable(client, auth, note, monkeypatch):
    _echo_user(monkeypatch)
    actions = ["format", "enhance", "summarize", "explain", "simplify", "bullets", "action_items", "custom"]
    assert len(actions) == 8  # REQ-AIA-01
    for action in actions:
        body = {
            "note_id": note["id"], "action": action, "scope": "document",
            "text": "raw", "preset": "enhance",
            "instruction": "Do the thing" if action == "custom" else None,
        }
        resp = client.post("/ai/transform", json=body, headers=auth["headers"])
        assert resp.status_code == 200, (action, resp.text)
        assert resp.json()["action"] == action


def test_presets_produce_observably_different_output(client, auth, note, monkeypatch):
    _echo_system(monkeypatch)
    base = {"note_id": note["id"], "action": "format", "scope": "document", "text": "raw"}
    fmt = client.post("/ai/transform", json={**base, "preset": "format_only"}, headers=auth["headers"]).json()
    meet = client.post("/ai/transform", json={**base, "preset": "meeting_mode"}, headers=auth["headers"]).json()
    assert fmt["output"] != meet["output"]  # REQ-AIA-05 / REQ-PRESET
    assert "structure only" in fmt["output"]
    assert "meeting summary" in meet["output"]


def test_transform_custom_without_instruction_422(client, auth, note):
    body = {"note_id": note["id"], "action": "custom", "scope": "document", "text": "raw", "preset": "enhance"}
    resp = client.post("/ai/transform", json=body, headers=auth["headers"])
    assert resp.status_code == 422 and resp.json()["code"] == "validation_error"


def test_transform_ai_failure_502(client, auth, note, monkeypatch):
    def boom(*a, **k):
        raise ai_service.AIError("upstream down")

    monkeypatch.setattr(ai_service, "complete", boom)
    body = {"note_id": note["id"], "action": "format", "scope": "document", "text": "raw", "preset": "enhance"}
    resp = client.post("/ai/transform", json=body, headers=auth["headers"])
    assert resp.status_code == 502 and resp.json()["code"] == "ai_error"


# --- /ai/revise ---------------------------------------------------------------------------------
def test_revise_returns_output(client, auth, monkeypatch):
    monkeypatch.setattr(ai_service, "complete", lambda s, u, **k: "REVISED")
    body = {"previous_output": "old", "instruction": "tighten", "preset": "enhance"}
    resp = client.post("/ai/revise", json=body, headers=auth["headers"])
    assert resp.status_code == 200 and resp.json() == {"output": "REVISED"}


def test_revise_requires_auth(client):
    assert client.post("/ai/revise", json={"previous_output": "a", "instruction": "b", "preset": "enhance"}).status_code == 401


def test_revise_ai_failure_502(client, auth, monkeypatch):
    monkeypatch.setattr(ai_service, "complete", lambda *a, **k: (_ for _ in ()).throw(ai_service.AIError("x")))
    body = {"previous_output": "old", "instruction": "tighten", "preset": "enhance"}
    assert client.post("/ai/revise", json=body, headers=auth["headers"]).status_code == 502


# --- /ai/notepilot (SSE) ------------------------------------------------------------------------
def test_notepilot_streams_tokens(client, auth, note, monkeypatch):
    def fake_stream(system, user, **k):
        assert system == NOTEPILOT_SYSTEM  # fixed neutral prompt (REQ-NP-11, DEC-014)
        yield "Hello"
        yield " world"

    monkeypatch.setattr(ai_service, "stream_tokens", fake_stream)
    resp = client.post(
        "/ai/notepilot", json={"note_id": note["id"], "context": "Hel"}, headers=auth["headers"]
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/event-stream")
    body = resp.text
    assert 'event: token' in body
    assert '"text": "Hello"' in body and '"text": " world"' in body
    assert body.rstrip().endswith("event: done\ndata: {}")  # REQ-NP terminal event


def test_notepilot_silent_on_error(client, auth, note, monkeypatch):
    def boom(system, user, **k):
        raise ai_service.AIError("provider down")
        yield  # pragma: no cover (makes this a generator)

    monkeypatch.setattr(ai_service, "stream_tokens", boom)
    resp = client.post(
        "/ai/notepilot", json={"note_id": note["id"], "context": "x"}, headers=auth["headers"]
    )
    assert resp.status_code == 200  # never a user-facing error (REQ-NP-07, NFR-REL-02)
    assert "event: token" not in resp.text
    assert "event: done" in resp.text


def test_notepilot_empty_result_only_done(client, auth, note, monkeypatch):
    def empty(system, user, **k):
        return
        yield  # pragma: no cover

    monkeypatch.setattr(ai_service, "stream_tokens", empty)
    resp = client.post(
        "/ai/notepilot", json={"note_id": note["id"], "context": "x"}, headers=auth["headers"]
    )
    assert "event: token" not in resp.text and "event: done" in resp.text


def test_notepilot_requires_auth(client, note):
    assert client.post("/ai/notepilot", json={"note_id": note["id"], "context": "x"}).status_code == 401


def test_notepilot_unknown_note_404(client, auth, monkeypatch):
    monkeypatch.setattr(ai_service, "stream_tokens", lambda *a, **k: iter(["x"]))
    resp = client.post("/ai/notepilot", json={"note_id": "missing", "context": "x"}, headers=auth["headers"])
    assert resp.status_code == 404
