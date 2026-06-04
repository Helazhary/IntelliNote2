"""Folder route tests — REQ-FLDR-*, REQ-AUTH-07. API_CONTRACTS.md §4."""


def _create_folder(client, headers, name, parent_id=None):
    resp = client.post("/folders", json={"name": name, "parent_id": parent_id}, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


def _create_note(client, headers, folder_id=None, title="n"):
    resp = client.post("/notes", json={"title": title, "content": "x", "folder_id": folder_id}, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_folders_require_auth(client):
    assert client.get("/folders").status_code == 401  # REQ-AUTH-06


def test_list_starts_empty(client, auth):
    resp = client.get("/folders", headers=auth["headers"])
    assert resp.status_code == 200
    assert resp.json() == []


def test_create_top_level_folder(client, auth):
    folder = _create_folder(client, auth["headers"], "Work")
    assert folder["name"] == "Work"
    assert folder["parent_id"] is None
    assert folder["user_id"] == auth["user"]["id"]


def test_create_nested_folder_no_depth_cap(client, auth):
    # REQ-FLDR-02: nest repeatedly with no depth error.
    parent = _create_folder(client, auth["headers"], "University")
    child = _create_folder(client, auth["headers"], "Biology 101", parent["id"])
    grandchild = _create_folder(client, auth["headers"], "Lecture 1", child["id"])
    assert child["parent_id"] == parent["id"]
    assert grandchild["parent_id"] == child["id"]


def test_create_with_unknown_parent_404(client, auth):
    resp = client.post("/folders", json={"name": "x", "parent_id": "missing-id"}, headers=auth["headers"])
    assert resp.status_code == 404
    assert resp.json()["code"] == "not_found"


def test_cannot_nest_under_another_users_folder(client, auth, make_user):
    other = make_user("user-b@example.com")
    other_folder = _create_folder(client, other["headers"], "B-folder")
    resp = client.post(
        "/folders", json={"name": "x", "parent_id": other_folder["id"]}, headers=auth["headers"]
    )
    assert resp.status_code == 404  # REQ-AUTH-07 — never reveals another user's resource


def test_rename_folder(client, auth):
    folder = _create_folder(client, auth["headers"], "Old")
    resp = client.patch(f"/folders/{folder['id']}", json={"name": "New"}, headers=auth["headers"])
    assert resp.status_code == 200
    assert resp.json()["name"] == "New"


def test_move_folder_and_back_to_top_level(client, auth):
    a = _create_folder(client, auth["headers"], "A")
    b = _create_folder(client, auth["headers"], "B")
    moved = client.patch(f"/folders/{b['id']}", json={"parent_id": a["id"]}, headers=auth["headers"])
    assert moved.status_code == 200 and moved.json()["parent_id"] == a["id"]
    # Explicit null reparents to top level (distinguished from an omitted field).
    back = client.patch(f"/folders/{b['id']}", json={"parent_id": None}, headers=auth["headers"])
    assert back.status_code == 200 and back.json()["parent_id"] is None


def test_patch_empty_body_422(client, auth):
    folder = _create_folder(client, auth["headers"], "F")
    resp = client.patch(f"/folders/{folder['id']}", json={}, headers=auth["headers"])
    assert resp.status_code == 422


def test_cannot_move_folder_into_itself(client, auth):
    folder = _create_folder(client, auth["headers"], "F")
    resp = client.patch(
        f"/folders/{folder['id']}", json={"parent_id": folder["id"]}, headers=auth["headers"]
    )
    assert resp.status_code == 422


def test_cannot_move_folder_into_descendant(client, auth):
    parent = _create_folder(client, auth["headers"], "P")
    child = _create_folder(client, auth["headers"], "C", parent["id"])
    resp = client.patch(
        f"/folders/{parent['id']}", json={"parent_id": child["id"]}, headers=auth["headers"]
    )
    assert resp.status_code == 422  # would create a cycle


def test_patch_other_users_folder_404(client, auth, make_user):
    other = make_user("user-b@example.com")
    other_folder = _create_folder(client, other["headers"], "B")
    resp = client.patch(f"/folders/{other_folder['id']}", json={"name": "hax"}, headers=auth["headers"])
    assert resp.status_code == 404


def test_delete_preview_counts_descendants(client, auth):
    # Tree: root -> sub ; notes: 2 in root, 1 in sub, 1 unfiled (not counted).
    root = _create_folder(client, auth["headers"], "root")
    sub = _create_folder(client, auth["headers"], "sub", root["id"])
    _create_note(client, auth["headers"], root["id"])
    _create_note(client, auth["headers"], root["id"])
    _create_note(client, auth["headers"], sub["id"])
    _create_note(client, auth["headers"], None)  # unfiled — outside the subtree
    resp = client.get(f"/folders/{root['id']}/delete-preview", headers=auth["headers"])
    assert resp.status_code == 200
    body = resp.json()
    assert body["subfolder_count"] == 1
    assert body["note_count"] == 3  # REQ-FLDR-04


def test_delete_folder_cascades(client, auth):
    root = _create_folder(client, auth["headers"], "root")
    sub = _create_folder(client, auth["headers"], "sub", root["id"])
    note_in_sub = _create_note(client, auth["headers"], sub["id"])
    unfiled = _create_note(client, auth["headers"], None)

    resp = client.delete(f"/folders/{root['id']}", headers=auth["headers"])
    assert resp.status_code == 204  # REQ-FLDR-05

    # Subfolder + contained note are gone; unfiled note survives.
    folders = [f["id"] for f in client.get("/folders", headers=auth["headers"]).json()]
    assert root["id"] not in folders and sub["id"] not in folders
    assert client.get(f"/notes/{note_in_sub['id']}", headers=auth["headers"]).status_code == 404
    assert client.get(f"/notes/{unfiled['id']}", headers=auth["headers"]).status_code == 200


def test_delete_other_users_folder_404(client, auth, make_user):
    other = make_user("user-b@example.com")
    other_folder = _create_folder(client, other["headers"], "B")
    assert client.delete(f"/folders/{other_folder['id']}", headers=auth["headers"]).status_code == 404
    # And it still exists for its owner.
    assert client.get("/folders", headers=other["headers"]).json()[0]["id"] == other_folder["id"]
