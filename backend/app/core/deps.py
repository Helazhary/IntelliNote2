"""Shared FastAPI dependencies: DB session + authenticated-user resolution.

`get_current_user` guards every protected route (REQ-AUTH-06, NFR-SEC-03): missing/invalid/expired
access token → 401 with the contract error shape.
"""
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.errors import APIError
from app.core.security import decode_token
from app.db.session import get_db
from app.models import User

# auto_error=False → a missing header yields None (we raise 401 ourselves, not FastAPI's 403).
_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or not credentials.credentials:
        raise APIError.unauthorized()
    try:
        payload = decode_token(credentials.credentials, expected_type="access")
    except JWTError:
        raise APIError.unauthorized("Invalid or expired token.")
    user = db.get(User, payload.get("sub"))
    if user is None:
        raise APIError.unauthorized("Invalid or expired token.")
    return user


__all__ = ["get_db", "get_current_user"]
