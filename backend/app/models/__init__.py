"""SQLAlchemy ORM models — implements docs/DB_SCHEMA.md (Phase 4a).

Four tables: users, folders, notes, preferences. All user-owned data references users.id with
ON DELETE CASCADE; folders self-reference for nesting (REQ-FLDR-02); folder/note cascade implements
REQ-FLDR-05. CHECK constraints on preferences mirror DB_SCHEMA §5.
"""
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base

# Enum value sets (mirror API_CONTRACTS.md §1 / DB_SCHEMA.md §5) ----------------------------------
THEMES = ("deeptech", "lightdesk", "obsidianite", "obsidianite-violet")
PRESETS = (
    "format_only",
    "clean_up",
    "enhance",
    "explain",
    "summarize",
    "study_mode",
    "meeting_mode",
)
NOTEPILOT_DELAYS = (500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000)


def uuid4_str() -> str:
    """UUID v4 string PK (API_CONTRACTS.md §0 — IDs are UUID v4 strings)."""
    return str(uuid4())


def now_iso() -> str:
    """ISO-8601 UTC timestamp, 'Z'-suffixed (API_CONTRACTS.md §0).

    Millisecond precision so a user's notes sort deterministically newest-first even when created
    in the same second (DB_SCHEMA §4 ix_notes_user_updated ordering).
    """
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid4_str)
    # Stored lowercased; uniqueness enforces REQ-AUTH-02.
    email: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    # bcrypt hash ($2b$...); never plaintext (REQ-AUTH-03, NFR-SEC-01).
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=now_iso)


class Folder(Base):
    __tablename__ = "folders"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid4_str)
    name: Mapped[str] = mapped_column(String, nullable=False)
    # NULL = top-level; self-ref nesting, no depth cap (REQ-FLDR-02).
    parent_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("folders.id", ondelete="CASCADE"), nullable=True, index=True
    )
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=now_iso)
    updated_at: Mapped[str] = mapped_column(
        String, nullable=False, default=now_iso, onupdate=now_iso
    )


class Note(Base):
    __tablename__ = "notes"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid4_str)
    # May be empty; export falls back to "untitled" (REQ-EXP-08).
    title: Mapped[str] = mapped_column(String, nullable=False, default="")
    # Raw Markdown source (REQ-EDIT-04).
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    # NULL = Unfiled (REQ-FLDR-06); cascade on folder delete (REQ-FLDR-05).
    folder_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("folders.id", ondelete="CASCADE"), nullable=True, index=True
    )
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=now_iso)
    updated_at: Mapped[str] = mapped_column(
        String, nullable=False, default=now_iso, onupdate=now_iso
    )

    # Sidebar/palette ordering: list a user's notes newest-first (DB_SCHEMA §4).
    __table_args__ = (
        Index("ix_notes_user_updated", "user_id", text("updated_at DESC")),
    )


class Preferences(Base):
    __tablename__ = "preferences"

    # PK == FK enforces the 1:1 relationship (DB_SCHEMA §5).
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    theme: Mapped[str] = mapped_column(String, nullable=False, default="deeptech")
    active_preset: Mapped[str] = mapped_column(String, nullable=False, default="format_only")
    focuspro_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    notepilot_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    notepilot_delay_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=2000)
    updated_at: Mapped[str] = mapped_column(
        String, nullable=False, default=now_iso, onupdate=now_iso
    )

    __table_args__ = (
        CheckConstraint(
            "theme in ('deeptech','lightdesk','obsidianite','obsidianite-violet')",
            name="ck_pref_theme",
        ),
        CheckConstraint(
            "active_preset in "
            "('format_only','clean_up','enhance','explain','summarize','study_mode','meeting_mode')",
            name="ck_pref_preset",
        ),
        CheckConstraint(
            "notepilot_delay_ms in (500,1000,1500,2000,2500,3000,3500,4000,4500,5000)",
            name="ck_pref_delay",
        ),
    )


__all__ = [
    "User",
    "Folder",
    "Note",
    "Preferences",
    "uuid4_str",
    "now_iso",
    "THEMES",
    "PRESETS",
    "NOTEPILOT_DELAYS",
]
