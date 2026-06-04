"""Auth routes — REQ-AUTH-*, NFR-SEC-*. API_CONTRACTS.md §3.

POST /auth/register, POST /auth/login, POST /auth/refresh, GET /auth/me.
Local JWT (access + refresh) + bcrypt — no Supabase (DEC-001/DEC-017).
"""
from fastapi import APIRouter, Depends, status
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.core.errors import APIError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models import Preferences, User
from app.schemas import (
    AccessTokenResponse,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)) -> User:
    """Create an account (REQ-AUTH-01/02/03). Seeds a default preferences row (ARCHITECTURE §4.1)."""
    if db.query(User).filter(User.email == body.email).first() is not None:
        raise APIError(
            status.HTTP_409_CONFLICT,
            "email_exists",
            "An account with this email already exists.",
        )
    user = User(email=body.email, password_hash=hash_password(body.password))
    db.add(user)
    db.flush()  # assign user.id before creating the preferences row
    db.add(Preferences(user_id=user.id))
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """Issue access + refresh JWTs (REQ-AUTH-04). Wrong credentials → 401, never 500."""
    user = db.query(User).filter(User.email == body.email).first()
    if user is None or not verify_password(body.password, user.password_hash):
        raise APIError(
            status.HTTP_401_UNAUTHORIZED, "invalid_credentials", "Invalid email or password."
        )
    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        user=UserOut.model_validate(user),
    )


@router.post("/refresh", response_model=AccessTokenResponse)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)) -> AccessTokenResponse:
    """Exchange a valid refresh token for a fresh access token (REQ-AUTH-05)."""
    try:
        payload = decode_token(body.refresh_token, expected_type="refresh")
    except JWTError:
        raise APIError(
            status.HTTP_401_UNAUTHORIZED, "invalid_refresh", "Invalid or expired refresh token."
        )
    if db.get(User, payload.get("sub")) is None:
        raise APIError(
            status.HTTP_401_UNAUTHORIZED, "invalid_refresh", "Invalid or expired refresh token."
        )
    return AccessTokenResponse(access_token=create_access_token(payload["sub"]))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> User:
    return user
