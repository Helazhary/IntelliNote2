"""Folder routes — REQ-FLDR-*. API_CONTRACTS.md §4.

GET/POST /folders, PATCH /folders/{id}, GET /folders/{id}/delete-preview, DELETE /folders/{id}.
All routes are user-scoped (REQ-AUTH-07): another user's id → 404. Cascade delete is enforced at
the DB level (ON DELETE CASCADE + PRAGMA foreign_keys=ON) — see DB_SCHEMA §1.
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.core.errors import APIError
from app.models import Folder, Note, User
from app.schemas import DeletePreview, FolderCreate, FolderOut, FolderUpdate

router = APIRouter(prefix="/folders", tags=["folders"])


def _get_owned_folder(db: Session, user: User, folder_id: str) -> Folder:
    folder = db.get(Folder, folder_id)
    if folder is None or folder.user_id != user.id:
        raise APIError.not_found("Folder not found.")
    return folder


def _descendant_folder_ids(db: Session, user: User, root_id: str) -> set[str]:
    """All folder ids strictly below `root_id` in the user's tree (excludes root itself)."""
    folders = db.query(Folder.id, Folder.parent_id).filter(Folder.user_id == user.id).all()
    children: dict[str | None, list[str]] = {}
    for fid, parent_id in folders:
        children.setdefault(parent_id, []).append(fid)
    out: set[str] = set()
    stack = list(children.get(root_id, []))
    while stack:
        fid = stack.pop()
        if fid in out:
            continue
        out.add(fid)
        stack.extend(children.get(fid, []))
    return out


@router.get("", response_model=list[FolderOut])
def list_folders(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[Folder]:
    """Flat list; the client builds the tree (REQ-FLDR-03)."""
    return db.query(Folder).filter(Folder.user_id == user.id).all()


@router.post("", response_model=FolderOut, status_code=status.HTTP_201_CREATED)
def create_folder(
    body: FolderCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> Folder:
    if body.parent_id is not None:
        _get_owned_folder(db, user, body.parent_id)  # 404 if parent missing/not owned
    folder = Folder(name=body.name, parent_id=body.parent_id, user_id=user.id)
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return folder


@router.patch("/{folder_id}", response_model=FolderOut)
def update_folder(
    folder_id: str,
    body: FolderUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Folder:
    """Rename and/or reparent (REQ-FLDR-01). Guards against self/descendant cycles."""
    folder = _get_owned_folder(db, user, folder_id)
    fields = body.model_dump(exclude_unset=True)
    if "name" in fields:
        folder.name = fields["name"]
    if "parent_id" in fields:
        new_parent = fields["parent_id"]
        if new_parent is not None:
            if new_parent == folder_id or new_parent in _descendant_folder_ids(db, user, folder_id):
                raise APIError(
                    status.HTTP_422_UNPROCESSABLE_ENTITY,
                    "validation_error",
                    "Cannot move a folder into itself or one of its descendants.",
                )
            _get_owned_folder(db, user, new_parent)  # 404 if target missing/not owned
        folder.parent_id = new_parent
    db.commit()
    db.refresh(folder)
    return folder


@router.get("/{folder_id}/delete-preview", response_model=DeletePreview)
def delete_preview(
    folder_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> DeletePreview:
    """Count affected descendants for the confirmation dialog (REQ-FLDR-04, NFR-USAB-03)."""
    _get_owned_folder(db, user, folder_id)
    descendants = _descendant_folder_ids(db, user, folder_id)
    affected_folder_ids = descendants | {folder_id}
    note_count = (
        db.query(Note)
        .filter(Note.user_id == user.id, Note.folder_id.in_(affected_folder_ids))
        .count()
    )
    return DeletePreview(
        folder_id=folder_id, note_count=note_count, subfolder_count=len(descendants)
    )


@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_folder(
    folder_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> None:
    """Cascade delete folder + subfolders + contained notes (REQ-FLDR-05); no undo."""
    folder = _get_owned_folder(db, user, folder_id)
    db.delete(folder)  # DB ON DELETE CASCADE removes the subtree + notes
    db.commit()
