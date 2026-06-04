"""Auth route tests — REQ-AUTH-*, NFR-SEC-01/02. API_CONTRACTS.md §3."""
from datetime import datetime, timedelta, timezone

from jose import jwt

from app.core.config import settings
from app.models import User


def _expired_access_token(user_id: str) -> str:
    past = datetime.now(timezone.utc) - timedelta(hours=1)
    payload = {
        "sub": user_id,
        "type": "access",
        "iat": int(past.timestamp()),
        "exp": int((past + timedelta(minutes=1)).timestamp()),  # expired ~59 min ago
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


# Register --------------------------------------------------------------------------------------
def test_register_returns_user_without_password(client):
    resp = client.post("/auth/register", json={"email": "New@Example.com", "password": "password123"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["email"] == "new@example.com"  # stored lowercased (DB_SCHEMA §2)
    assert "id" in body and "created_at" in body
    assert "password" not in body and "password_hash" not in body


def test_register_duplicate_email_409(client):
    client.post("/auth/register", json={"email": "dup@example.com", "password": "password123"})
    resp = client.post("/auth/register", json={"email": "DUP@example.com", "password": "password123"})
    assert resp.status_code == 409  # REQ-AUTH-02 (case-insensitive)
    assert resp.json()["code"] == "email_exists"


def test_register_short_password_422(client):
    resp = client.post("/auth/register", json={"email": "x@example.com", "password": "short"})
    assert resp.status_code == 422
    assert resp.json()["code"] == "validation_error"


def test_register_invalid_email_422(client):
    resp = client.post("/auth/register", json={"email": "not-an-email", "password": "password123"})
    assert resp.status_code == 422
    assert resp.json()["code"] == "validation_error"


def test_password_stored_as_bcrypt_hash(client, db_session_factory):
    client.post("/auth/register", json={"email": "hash@example.com", "password": "supersecret1"})
    db = db_session_factory()
    user = db.query(User).filter(User.email == "hash@example.com").first()
    db.close()
    assert user is not None
    assert user.password_hash.startswith("$2")  # bcrypt (REQ-AUTH-03, NFR-SEC-01)
    assert "supersecret1" not in user.password_hash


def test_register_creates_default_preferences(client, auth):
    # A fresh account can immediately read its preferences (seeded at registration).
    resp = client.get("/preferences", headers=auth["headers"])
    assert resp.status_code == 200
    prefs = resp.json()
    assert prefs["theme"] == "deeptech"
    assert prefs["active_preset"] == "format_only"
    assert prefs["notepilot_enabled"] is True
    assert prefs["notepilot_delay_ms"] == 2000


# Login -----------------------------------------------------------------------------------------
def test_login_returns_tokens_and_user(client, auth):
    resp = client.post("/auth/login", json={"email": auth["email"], "password": auth["password"]})
    assert resp.status_code == 200
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"] and body["refresh_token"]
    assert body["user"]["email"] == auth["email"]


def test_login_wrong_password_401_not_500(client, auth):
    resp = client.post("/auth/login", json={"email": auth["email"], "password": "wrongpassword"})
    assert resp.status_code == 401  # REQ-AUTH-04
    assert resp.json()["code"] == "invalid_credentials"


def test_login_unknown_email_401(client):
    resp = client.post("/auth/login", json={"email": "ghost@example.com", "password": "password123"})
    assert resp.status_code == 401
    assert resp.json()["code"] == "invalid_credentials"


# Me / protected --------------------------------------------------------------------------------
def test_me_requires_token(client):
    assert client.get("/auth/me").status_code == 401  # REQ-AUTH-06


def test_me_with_invalid_token_401(client):
    resp = client.get("/auth/me", headers={"Authorization": "Bearer garbage.token.here"})
    assert resp.status_code == 401


def test_me_returns_current_user(client, auth):
    resp = client.get("/auth/me", headers=auth["headers"])
    assert resp.status_code == 200
    assert resp.json()["id"] == auth["user"]["id"]


# Refresh (REQ-AUTH-05) -------------------------------------------------------------------------
def test_expired_access_token_then_refresh_restores_access(client, auth):
    expired = _expired_access_token(auth["user"]["id"])
    assert client.get("/auth/me", headers={"Authorization": f"Bearer {expired}"}).status_code == 401

    refreshed = client.post("/auth/refresh", json={"refresh_token": auth["refresh_token"]})
    assert refreshed.status_code == 200
    new_access = refreshed.json()["access_token"]
    assert refreshed.json()["token_type"] == "bearer"

    ok = client.get("/auth/me", headers={"Authorization": f"Bearer {new_access}"})
    assert ok.status_code == 200


def test_refresh_rejects_access_token(client, auth):
    # Passing an access token where a refresh token is expected → 401 (type check).
    resp = client.post("/auth/refresh", json={"refresh_token": auth["access_token"]})
    assert resp.status_code == 401
    assert resp.json()["code"] == "invalid_refresh"


def test_refresh_invalid_token_401(client):
    resp = client.post("/auth/refresh", json={"refresh_token": "not-a-jwt"})
    assert resp.status_code == 401
    assert resp.json()["code"] == "invalid_refresh"
