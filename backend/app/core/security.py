"""Password hashing (bcrypt) and JWT access/refresh tokens — REQ-AUTH-03/04/05, NFR-SEC-01/02.

Secrets (JWT_SECRET) come from env (settings); never hard-coded in shipped code (NFR-SEC-04).
"""
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """bcrypt hash ($2b$...) — never store plaintext (REQ-AUTH-03, NFR-SEC-01)."""
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def _create_token(sub: str, token_type: str, expires_delta: timedelta) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": sub,
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_access_token(user_id: str) -> str:
    """Short-lived access token (REQ-AUTH-04)."""
    return _create_token(
        user_id, "access", timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )


def create_refresh_token(user_id: str) -> str:
    """Long-lived refresh token (REQ-AUTH-05)."""
    return _create_token(user_id, "refresh", timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))


def decode_token(token: str, expected_type: str) -> dict:
    """Decode + verify signature/exp and that the token's `type` matches.

    Raises jose.JWTError on any failure (bad signature, expired, wrong type).
    """
    payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    if payload.get("type") != expected_type:
        raise JWTError("unexpected token type")
    return payload
