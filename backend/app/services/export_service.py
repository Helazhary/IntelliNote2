"""Export rendering — REQ-EXP-*, DEC-016. Used by GET /notes/{id}/export.

md  → raw Markdown (text/markdown)        REQ-EXP-04
html→ rendered HTML + inline styles       REQ-EXP-05
txt → Markdown syntax stripped            REQ-EXP-06
Empty note → empty body, valid file, no error (REQ-EXP-07). Filename = sanitized title or
"untitled" (REQ-EXP-08).
"""
import re

import markdown as md

_MEDIA_TYPE = {"md": "text/markdown", "html": "text/html", "txt": "text/plain"}

# Filesystem-unsafe characters to strip from the export filename (DEC-016).
_BAD_FILENAME_CHARS = set('/\\:*?"<>|')

# Inline styles required by REQ-EXP-05 (font-family, line-height, max-width).
_HTML_BODY_STYLE = (
    "font-family: ui-sans-serif, system-ui, sans-serif; "
    "line-height: 1.6; max-width: 720px; margin: 2rem auto; padding: 0 1rem;"
)


def sanitize_filename(title: str) -> str:
    """Strip filesystem-unsafe characters; fall back to 'untitled' (REQ-EXP-08, DEC-016)."""
    cleaned = "".join(c for c in title if c not in _BAD_FILENAME_CHARS and ord(c) >= 32)
    cleaned = cleaned.strip().strip(".")
    return cleaned or "untitled"


def _to_html(content: str) -> str:
    body = md.markdown(content, extensions=["fenced_code", "tables", "sane_lists"])
    return (
        "<!DOCTYPE html>\n"
        '<html lang="en">\n<head>\n<meta charset="utf-8">\n</head>\n'
        f'<body style="{_HTML_BODY_STYLE}">\n{body}\n</body>\n</html>'
    )


def _strip_markdown(content: str) -> str:
    """Remove Markdown syntax markers, preserving the visible text and line structure (REQ-EXP-06)."""
    text = content
    text = re.sub(r"```[^\n]*\n(.*?)```", r"\1", text, flags=re.DOTALL)  # fenced code blocks
    text = re.sub(r"`([^`]*)`", r"\1", text)  # inline code
    text = re.sub(r"!\[([^\]]*)\]\([^)]*\)", r"\1", text)  # images -> alt text
    text = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text)  # links -> link text
    text = re.sub(r"^\s{0,3}#{1,6}\s+", "", text, flags=re.MULTILINE)  # ATX headings
    text = re.sub(r"^\s{0,3}>\s?", "", text, flags=re.MULTILINE)  # blockquotes
    text = re.sub(r"^\s*[-*+]\s+", "", text, flags=re.MULTILINE)  # bullet list markers
    text = re.sub(r"^\s*\d+\.\s+", "", text, flags=re.MULTILINE)  # ordered list markers
    text = re.sub(r"^\s*([-*_])(?:\s*\1){2,}\s*$", "", text, flags=re.MULTILINE)  # thematic breaks
    text = re.sub(r"(\*\*|__)(.*?)\1", r"\2", text)  # bold
    text = re.sub(r"(\*|_)(.*?)\1", r"\2", text)  # italics
    text = re.sub(r"~~(.*?)~~", r"\1", text)  # strikethrough
    return text


def render_export(title: str, content: str, fmt: str) -> tuple[str, str, str]:
    """Return (body, media_type, filename) for the requested format.

    `fmt` is assumed validated by the caller (md|html|txt). Empty content yields an empty body for
    every format (REQ-EXP-07).
    """
    filename = f"{sanitize_filename(title)}.{fmt}"
    media_type = _MEDIA_TYPE[fmt]
    if content == "":
        return "", media_type, filename
    if fmt == "md":
        body = content
    elif fmt == "html":
        body = _to_html(content)
    else:  # txt
        body = _strip_markdown(content)
    return body, media_type, filename
