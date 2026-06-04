"""Preferences routes — REQ-PREF-*, REQ-THEME-*, REQ-PRESET-*, REQ-FOCUS-*. API_CONTRACTS.md §6.

GET/PATCH /preferences. One row per user (created at registration); GET is get-or-create defensive.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models import Preferences, User
from app.schemas import PreferencesOut, PreferencesUpdate

router = APIRouter(prefix="/preferences", tags=["preferences"])


def _get_or_create(db: Session, user: User) -> Preferences:
    prefs = db.get(Preferences, user.id)
    if prefs is None:
        prefs = Preferences(user_id=user.id)
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    return prefs


@router.get("", response_model=PreferencesOut)
def get_preferences(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> Preferences:
    return _get_or_create(db, user)


@router.patch("", response_model=PreferencesOut)
def update_preferences(
    body: PreferencesUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Preferences:
    """Partial update; persisted server-side, applied instantly client-side (NFR-PERSIST-02)."""
    prefs = _get_or_create(db, user)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(prefs, field, value)
    db.commit()
    db.refresh(prefs)
    return prefs
