"""AI routes — REQ-AIA-*, REQ-REV-*, REQ-CPMT-*, REQ-NP-*. API_CONTRACTS.md §7 (Phase 4b).

POST /ai/transform, POST /ai/revise, POST /ai/notepilot (SSE). All require auth (NFR-SEC-03); none
fire without explicit user intent (NFR-REL-03) — the endpoints only run when the client calls them.
"""
import json

from fastapi import APIRouter, Depends, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.core.errors import APIError
from app.models import Note, User
from app.schemas import (
    NotePilotRequest,
    ReviseRequest,
    ReviseResponse,
    TransformRequest,
    TransformResponse,
)
from app.services import ai_service

router = APIRouter(prefix="/ai", tags=["ai"])

_AI_ERROR = APIError(status.HTTP_502_BAD_GATEWAY, "ai_error", "AI provider error.")


def _require_owned_note(db: Session, user: User, note_id: str) -> Note:
    note = db.get(Note, note_id)
    if note is None or note.user_id != user.id:
        raise APIError.not_found("Note not found.")
    return note


@router.post("/transform", response_model=TransformResponse)
def transform(
    body: TransformRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TransformResponse:
    """Run one of the 8 actions on a selection or the full document (REQ-AIA-01…05, REQ-CPMT).

    Preview only — the note is never mutated server-side (REQ-REV-01). The schema enforces that
    `action=custom` carries an `instruction` (422).
    """
    _require_owned_note(db, user, body.note_id)
    try:
        output = ai_service.run_transform(body.action, body.text, body.preset, body.instruction)
    except ai_service.AIError:
        raise _AI_ERROR
    return TransformResponse(output=output, action=body.action, scope=body.scope)


@router.post("/revise", response_model=ReviseResponse)
def revise(body: ReviseRequest, user: User = Depends(get_current_user)) -> ReviseResponse:
    """Produce a new output from a previous output + a follow-up instruction (REQ-REV-05, DEC-009)."""
    try:
        output = ai_service.run_revise(body.previous_output, body.instruction, body.preset)
    except ai_service.AIError:
        raise _AI_ERROR
    return ReviseResponse(output=output)


@router.post("/notepilot")
def notepilot(
    body: NotePilotRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    """Streaming inline continuation over SSE (REQ-NP-*). Fixed neutral prompt (REQ-NP-11, DEC-014).

    On upstream error or an empty result the stream emits `done` with no preceding `token` events and
    never a user-facing error body (REQ-NP-07, NFR-REL-02).
    """
    _require_owned_note(db, user, body.note_id)

    def event_stream():
        try:
            for token in ai_service.notepilot_token_stream(body.context):
                if token:
                    yield f"event: token\ndata: {json.dumps({'text': token})}\n\n"
        except ai_service.AIError:
            pass  # silent fail — frontend removes the placeholder (REQ-NP-07)
        yield "event: done\ndata: {}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
