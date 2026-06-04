"""Phase 2 skeleton smoke test: app imports and /health responds."""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_ok():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_protected_routes_reject_unauthenticated():
    # Phase 4a: routes are implemented. Protected routes now reject anon requests (REQ-AUTH-06).
    assert client.get("/notes").status_code == 401
    assert client.get("/folders").status_code == 401
    assert client.get("/preferences").status_code == 401
    # Login with no body is a validation error, not a server error.
    assert client.post("/auth/login").status_code == 422
