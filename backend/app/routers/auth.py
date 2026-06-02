"""Auth routes — REQ-AUTH-*. Stubs in Phase 2; implemented in Phase 4a.

Routes (see API_CONTRACTS.md §3): POST /auth/register, /auth/login, /auth/refresh; GET /auth/me.
"""
from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/auth", tags=["auth"])

_NOT_IMPL = HTTPException(status.HTTP_501_NOT_IMPLEMENTED, detail="Implemented in Phase 4a.")


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register():
    raise _NOT_IMPL


@router.post("/login")
def login():
    raise _NOT_IMPL


@router.post("/refresh")
def refresh():
    raise _NOT_IMPL


@router.get("/me")
def me():
    raise _NOT_IMPL
