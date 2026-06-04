"""Preferences route tests — REQ-PREF-*, REQ-THEME-*, REQ-PRESET-*, REQ-NP-10. API_CONTRACTS.md §6."""


def test_preferences_require_auth(client):
    assert client.get("/preferences").status_code == 401  # REQ-AUTH-06


def test_get_returns_defaults(client, auth):
    body = client.get("/preferences", headers=auth["headers"]).json()
    assert body == {
        "user_id": auth["user"]["id"],
        "theme": "deeptech",
        "active_preset": "format_only",
        "focuspro_enabled": False,
        "notepilot_enabled": True,
        "notepilot_delay_ms": 2000,
        "updated_at": body["updated_at"],
    }


def test_patch_theme_and_persist(client, auth):
    resp = client.patch("/preferences", json={"theme": "lightdesk"}, headers=auth["headers"])
    assert resp.status_code == 200 and resp.json()["theme"] == "lightdesk"
    # REQ-PREF-04 — persisted, restored on reload.
    assert client.get("/preferences", headers=auth["headers"]).json()["theme"] == "lightdesk"


def test_patch_multiple_fields(client, auth):
    resp = client.patch(
        "/preferences",
        json={"active_preset": "meeting_mode", "focuspro_enabled": True, "notepilot_enabled": False},
        headers=auth["headers"],
    )
    body = resp.json()
    assert body["active_preset"] == "meeting_mode"
    assert body["focuspro_enabled"] is True
    assert body["notepilot_enabled"] is False


def test_patch_invalid_theme_422(client, auth):
    resp = client.patch("/preferences", json={"theme": "midnight"}, headers=auth["headers"])
    assert resp.status_code == 422 and resp.json()["code"] == "validation_error"


def test_patch_invalid_preset_422(client, auth):
    resp = client.patch("/preferences", json={"active_preset": "wizard"}, headers=auth["headers"])
    assert resp.status_code == 422


def test_patch_invalid_delay_422(client, auth):
    # REQ-NP-10 / DEC-015: only 500..5000 in 500ms steps.
    resp = client.patch("/preferences", json={"notepilot_delay_ms": 700}, headers=auth["headers"])
    assert resp.status_code == 422 and resp.json()["code"] == "validation_error"


def test_patch_valid_delay_bounds(client, auth):
    for value in (500, 2500, 5000):
        resp = client.patch(
            "/preferences", json={"notepilot_delay_ms": value}, headers=auth["headers"]
        )
        assert resp.status_code == 200 and resp.json()["notepilot_delay_ms"] == value


def test_patch_empty_body_422(client, auth):
    assert client.patch("/preferences", json={}, headers=auth["headers"]).status_code == 422
