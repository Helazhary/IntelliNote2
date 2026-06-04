"""Shared pytest fixtures — isolated in-memory SQLite per test, with FK cascade enforced.

Each test gets a fresh schema (via Base.metadata.create_all) and a TestClient whose `get_db`
dependency is overridden to that DB. The PRAGMA foreign_keys=ON listener is attached to the test
engine so ON DELETE CASCADE actually fires (REQ-FLDR-05) — mirroring app/db/session.py.
"""
from collections.abc import Callable, Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.session import Base, get_db
from app.main import app


@pytest.fixture()
def db_session_factory() -> Iterator[sessionmaker]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,  # one shared in-memory connection for the whole test
    )

    @event.listens_for(engine, "connect")
    def _enable_fk(dbapi_connection, _record):  # noqa: ANN001
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    yield sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture()
def client(db_session_factory: sessionmaker) -> Iterator[TestClient]:
    def _override_get_db() -> Iterator:
        db = db_session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def _register_and_login(client: TestClient, email: str, password: str = "password123") -> dict:
    reg = client.post("/auth/register", json={"email": email, "password": password})
    assert reg.status_code == 201, reg.text
    login = client.post("/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200, login.text
    tokens = login.json()
    return {
        "user": tokens["user"],
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "headers": {"Authorization": f"Bearer {tokens['access_token']}"},
        "email": email,
        "password": password,
    }


@pytest.fixture()
def make_user(client: TestClient) -> Callable[..., dict]:
    """Factory: register + login an arbitrary user (for ownership/isolation tests)."""
    return lambda email, password="password123": _register_and_login(client, email, password)


@pytest.fixture()
def auth(client: TestClient) -> dict:
    """A default authenticated user A with ready-to-use Authorization headers."""
    return _register_and_login(client, "user-a@example.com")
