"""Note routes — REQ-EDIT-*, REQ-SAVE-*, REQ-EXP-*. Stubs in Phase 2; implemented in Phase 4a.

Routes (see API_CONTRACTS.md §5): GET/POST /notes, GET/PATCH/DELETE /notes/{id},
GET /notes/{id}/export?format=md|html|txt.
"""
from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/notes", tags=["notes"])

_NOT_IMPL = HTTPException(status.HTTP_501_NOT_IMPLEMENTED, detail="Implemented in Phase 4a.")


@router.get("")
def list_notes():
    raise _NOT_IMPL


@router.post("", status_code=status.HTTP_201_CREATED)
def create_note():
    raise _NOT_IMPL


@router.get("/{note_id}")
def get_note(note_id: str):
    raise _NOT_IMPL


@router.patch("/{note_id}")
def update_note(note_id: str):
    raise _NOT_IMPL


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(note_id: str):
    raise _NOT_IMPL


@router.get("/{note_id}/export")
def export_note(note_id: str, format: str):
    raise _NOT_IMPL
