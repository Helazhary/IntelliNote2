"""Note routes — REQ-EDIT-*, REQ-SAVE-*, REQ-FLDR-*, REQ-EXP-*. API_CONTRACTS.md §5.

GET/POST /notes, GET/PATCH/DELETE /notes/{id}, GET /notes/{id}/export?format=md|html|txt.
User-scoped (REQ-AUTH-07): another user's id → 404.
"""
from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.core.errors import APIError
from app.models import Folder, Note, User
from app.schemas import ExportFormat, NoteCreate, NoteOut, NoteSummaryOut, NoteUpdate
from app.services.export_service import render_export

router = APIRouter(prefix="/notes", tags=["notes"])


def _get_owned_note(db: Session, user: User, note_id: str) -> Note:
    note = db.get(Note, note_id)
    if note is None or note.user_id != user.id:
        raise APIError.not_found("Note not found.")
    return note


def _validate_owned_folder(db: Session, user: User, folder_id: str | None) -> None:
    if folder_id is None:
        return  # null = Unfiled (REQ-FLDR-06)
    folder = db.get(Folder, folder_id)
    if folder is None or folder.user_id != user.id:
        raise APIError.not_found("Folder not found.")


@router.get("", response_model=list[NoteSummaryOut])
def list_notes(
    folder_id: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Note]:
    """Summaries for sidebar + palette (REQ-CMDK-02, REQ-FLDR-03), newest first.

    `?folder_id=<uuid>` filters to a folder; `?folder_id=unfiled` filters to Unfiled notes.
    """
    query = db.query(Note).filter(Note.user_id == user.id)
    if folder_id == "unfiled":
        query = query.filter(Note.folder_id.is_(None))
    elif folder_id is not None:
        query = query.filter(Note.folder_id == folder_id)
    return query.order_by(Note.updated_at.desc(), Note.created_at.desc()).all()


@router.post("", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
def create_note(
    body: NoteCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> Note:
    _validate_owned_folder(db, user, body.folder_id)
    note = Note(title=body.title, content=body.content, folder_id=body.folder_id, user_id=user.id)
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.get("/{note_id}", response_model=NoteOut)
def get_note(
    note_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> Note:
    return _get_owned_note(db, user, note_id)


@router.patch("/{note_id}", response_model=NoteOut)
def update_note(
    note_id: str,
    body: NoteUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Note:
    """Update title/content (autosave/manual save) and/or move folder (REQ-SAVE-*, REQ-FLDR-07)."""
    note = _get_owned_note(db, user, note_id)
    fields = body.model_dump(exclude_unset=True)
    if "title" in fields:
        note.title = fields["title"]
    if "content" in fields:
        note.content = fields["content"]
    if "folder_id" in fields:
        _validate_owned_folder(db, user, fields["folder_id"])
        note.folder_id = fields["folder_id"]
    db.commit()
    db.refresh(note)
    return note


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    note_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> None:
    note = _get_owned_note(db, user, note_id)
    db.delete(note)
    db.commit()


@router.get("/{note_id}/export")
def export_note(
    note_id: str,
    format: ExportFormat = Query(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    """Download the note as md/html/txt (REQ-EXP-*). Missing/invalid format → 422 (validation_error)."""
    note = _get_owned_note(db, user, note_id)
    body, media_type, filename = render_export(note.title, note.content, format)
    return Response(
        content=body,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
