"""Phase 2 skeleton smoke test: app imports and /health responds."""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_ok():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_protected_routes_mounted():
    # Stubbed routes are mounted (return 501 until their phase) — confirms contract surface exists.
    assert client.post("/auth/login").status_code == 501
    assert client.get("/notes").status_code == 501
    assert client.get("/preferences").status_code == 501
