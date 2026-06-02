"""Folder routes — REQ-FLDR-*. Stubs in Phase 2; implemented in Phase 4a.

Routes (see API_CONTRACTS.md §4): GET/POST /folders, PATCH /folders/{id},
GET /folders/{id}/delete-preview, DELETE /folders/{id}.
"""
from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/folders", tags=["folders"])

_NOT_IMPL = HTTPException(status.HTTP_501_NOT_IMPLEMENTED, detail="Implemented in Phase 4a.")


@router.get("")
def list_folders():
    raise _NOT_IMPL


@router.post("", status_code=status.HTTP_201_CREATED)
def create_folder():
    raise _NOT_IMPL


@router.patch("/{folder_id}")
def update_folder(folder_id: str):
    raise _NOT_IMPL


@router.get("/{folder_id}/delete-preview")
def delete_preview(folder_id: str):
    raise _NOT_IMPL


@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_folder(folder_id: str):
    raise _NOT_IMPL
