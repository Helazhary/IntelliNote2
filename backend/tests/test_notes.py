"""Note route tests — REQ-EDIT-*, REQ-SAVE-*, REQ-FLDR-06/07, REQ-AUTH-07. API_CONTRACTS.md §5."""
import time


def _create_note(client, headers, **body):
    resp = client.post("/notes", json=body, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_notes_require_auth(client):
    assert client.get("/notes").status_code == 401  # REQ-AUTH-06


def test_create_note_defaults(client, auth):
    resp = client.post("/notes", json={}, headers=auth["headers"])
    assert resp.status_code == 201
    note = resp.json()
    assert note["title"] == "" and note["content"] == "" and note["folder_id"] is None
    assert note["user_id"] == auth["user"]["id"]


def test_create_note_with_unknown_folder_404(client, auth):
    resp = client.post("/notes", json={"folder_id": "nope"}, headers=auth["headers"])
    assert resp.status_code == 404
    assert resp.json()["code"] == "not_found"


def test_get_note_returns_full_content(client, auth):
    created = _create_note(client, auth["headers"], title="T", content="# Body")
    resp = client.get(f"/notes/{created['id']}", headers=auth["headers"])
    assert resp.status_code == 200
    assert resp.json()["content"] == "# Body"


def test_get_other_users_note_404(client, auth, make_user):
    other = make_user("user-b@example.com")
    other_note = _create_note(client, other["headers"], title="secret")
    resp = client.get(f"/notes/{other_note['id']}", headers=auth["headers"])
    assert resp.status_code == 404  # REQ-AUTH-07


def test_list_returns_summaries_without_content(client, auth):
    _create_note(client, auth["headers"], title="A", content="lots of text")
    resp = client.get("/notes", headers=auth["headers"])
    assert resp.status_code == 200
    rows = resp.json()
    assert len(rows) == 1
    assert set(rows[0].keys()) == {"id", "title", "folder_id", "updated_at"}  # NoteSummary, no content


def test_list_orders_newest_first(client, auth):
    n1 = _create_note(client, auth["headers"], title="first")
    _create_note(client, auth["headers"], title="second")
    time.sleep(0.005)
    # Touch n1 so it becomes most-recently-updated.
    client.patch(f"/notes/{n1['id']}", json={"content": "edited"}, headers=auth["headers"])
    titles = [r["title"] for r in client.get("/notes", headers=auth["headers"]).json()]
    assert titles[0] == "first"  # DB_SCHEMA §4 ordering


def test_list_filter_by_folder_and_unfiled(client, auth):
    folder = client.post("/folders", json={"name": "F"}, headers=auth["headers"]).json()
    in_folder = _create_note(client, auth["headers"], title="filed", folder_id=folder["id"])
    unfiled = _create_note(client, auth["headers"], title="unfiled")

    filed = client.get(f"/notes?folder_id={folder['id']}", headers=auth["headers"]).json()
    assert [r["id"] for r in filed] == [in_folder["id"]]

    none = client.get("/notes?folder_id=unfiled", headers=auth["headers"]).json()
    assert [r["id"] for r in none] == [unfiled["id"]]


def test_patch_updates_title_and_content(client, auth):
    note = _create_note(client, auth["headers"], title="old", content="old")
    resp = client.patch(
        f"/notes/{note['id']}", json={"title": "new", "content": "new body"}, headers=auth["headers"]
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["title"] == "new" and body["content"] == "new body"


def test_patch_partial_leaves_other_fields(client, auth):
    note = _create_note(client, auth["headers"], title="keep", content="orig")
    resp = client.patch(f"/notes/{note['id']}", json={"content": "changed"}, headers=auth["headers"])
    assert resp.status_code == 200
    assert resp.json()["title"] == "keep"  # title untouched


def test_patch_move_to_folder_then_unfiled(client, auth):
    folder = client.post("/folders", json={"name": "F"}, headers=auth["headers"]).json()
    note = _create_note(client, auth["headers"], title="n")
    moved = client.patch(f"/notes/{note['id']}", json={"folder_id": folder["id"]}, headers=auth["headers"])
    assert moved.json()["folder_id"] == folder["id"]  # REQ-FLDR-07
    unfiled = client.patch(f"/notes/{note['id']}", json={"folder_id": None}, headers=auth["headers"])
    assert unfiled.json()["folder_id"] is None  # REQ-FLDR-06


def test_patch_empty_body_422(client, auth):
    note = _create_note(client, auth["headers"], title="n")
    assert client.patch(f"/notes/{note['id']}", json={}, headers=auth["headers"]).status_code == 422


def test_patch_move_to_unknown_folder_404(client, auth):
    note = _create_note(client, auth["headers"], title="n")
    resp = client.patch(f"/notes/{note['id']}", json={"folder_id": "nope"}, headers=auth["headers"])
    assert resp.status_code == 404


def test_patch_other_users_note_404(client, auth, make_user):
    other = make_user("user-b@example.com")
    other_note = _create_note(client, other["headers"], title="secret")
    resp = client.patch(f"/notes/{other_note['id']}", json={"title": "hax"}, headers=auth["headers"])
    assert resp.status_code == 404


def test_delete_note(client, auth):
    note = _create_note(client, auth["headers"], title="n")
    assert client.delete(f"/notes/{note['id']}", headers=auth["headers"]).status_code == 204
    assert client.get(f"/notes/{note['id']}", headers=auth["headers"]).status_code == 404


def test_delete_other_users_note_404(client, auth, make_user):
    other = make_user("user-b@example.com")
    other_note = _create_note(client, other["headers"], title="secret")
    assert client.delete(f"/notes/{other_note['id']}", headers=auth["headers"]).status_code == 404
