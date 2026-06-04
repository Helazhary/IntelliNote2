"""Export route + service tests — REQ-EXP-*, DEC-016. API_CONTRACTS.md §5 (export)."""
from app.services.export_service import sanitize_filename, render_export

MARKDOWN = "# Title\n\nSome **bold** and a list:\n\n- one\n- two\n"


def _create_note(client, headers, title="", content=""):
    resp = client.post("/notes", json={"title": title, "content": content}, headers=headers)
    assert resp.status_code == 201
    return resp.json()


# Service-level (pure) ---------------------------------------------------------------------------
def test_sanitize_filename_strips_unsafe_chars():
    assert sanitize_filename('a/b\\c:d*e?f"g<h>i|j') == "abcdefghij"  # DEC-016


def test_sanitize_filename_falls_back_to_untitled():
    assert sanitize_filename("") == "untitled"
    assert sanitize_filename("   ") == "untitled"
    assert sanitize_filename("///") == "untitled"


def test_render_txt_strips_markdown_markers():
    body, media_type, filename = render_export("t", MARKDOWN, "txt")
    assert media_type == "text/plain" and filename == "t.txt"
    assert "#" not in body and "**" not in body
    assert "Title" in body and "bold" in body and "one" in body  # REQ-EXP-06


def test_render_empty_content_is_empty_body():
    for fmt in ("md", "html", "txt"):
        body, _, _ = render_export("t", "", fmt)
        assert body == ""  # REQ-EXP-07


# Route-level ------------------------------------------------------------------------------------
def test_export_requires_auth(client, auth):
    note = _create_note(client, auth["headers"], "t", MARKDOWN)
    assert client.get(f"/notes/{note['id']}/export?format=md").status_code == 401


def test_export_md_is_raw_markdown(client, auth):
    note = _create_note(client, auth["headers"], "My Note", MARKDOWN)
    resp = client.get(f"/notes/{note['id']}/export?format=md", headers=auth["headers"])
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/markdown")
    assert resp.headers["content-disposition"] == 'attachment; filename="My Note.md"'
    assert resp.text == MARKDOWN  # REQ-EXP-04


def test_export_html_has_inline_styles_and_rendering(client, auth):
    note = _create_note(client, auth["headers"], "doc", MARKDOWN)
    resp = client.get(f"/notes/{note['id']}/export?format=html", headers=auth["headers"])
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/html")
    html = resp.text
    assert "<h1>Title</h1>" in html and "<li>one</li>" in html  # rendered (REQ-EXP-05)
    for style in ("font-family", "line-height", "max-width"):
        assert style in html


def test_export_txt_strips_markdown(client, auth):
    note = _create_note(client, auth["headers"], "doc", MARKDOWN)
    resp = client.get(f"/notes/{note['id']}/export?format=txt", headers=auth["headers"])
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/plain")
    assert "#" not in resp.text and "**" not in resp.text


def test_export_empty_note_valid_empty_file(client, auth):
    note = _create_note(client, auth["headers"], "", "")
    resp = client.get(f"/notes/{note['id']}/export?format=md", headers=auth["headers"])
    assert resp.status_code == 200  # REQ-EXP-07 (no error)
    assert resp.text == ""
    assert resp.headers["content-disposition"] == 'attachment; filename="untitled.md"'  # REQ-EXP-08


def test_export_missing_format_422(client, auth):
    note = _create_note(client, auth["headers"], "t", "x")
    assert client.get(f"/notes/{note['id']}/export", headers=auth["headers"]).status_code == 422


def test_export_unsupported_format_422(client, auth):
    note = _create_note(client, auth["headers"], "t", "x")
    resp = client.get(f"/notes/{note['id']}/export?format=pdf", headers=auth["headers"])
    assert resp.status_code == 422 and resp.json()["code"] == "validation_error"


def test_export_other_users_note_404(client, auth, make_user):
    other = make_user("user-b@example.com")
    other_note = _create_note(client, other["headers"], "secret", "x")
    resp = client.get(f"/notes/{other_note['id']}/export?format=md", headers=auth["headers"])
    assert resp.status_code == 404
