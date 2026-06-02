"""Preferences routes — REQ-PREF-*. Stubs in Phase 2; implemented in Phase 4a.

Routes (see API_CONTRACTS.md §6): GET/PATCH /preferences.
"""
from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/preferences", tags=["preferences"])

_NOT_IMPL = HTTPException(status.HTTP_501_NOT_IMPLEMENTED, detail="Implemented in Phase 4a.")


@router.get("")
def get_preferences():
    raise _NOT_IMPL


@router.patch("")
def update_preferences():
    raise _NOT_IMPL
