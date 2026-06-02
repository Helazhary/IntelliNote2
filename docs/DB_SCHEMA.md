# DB_SCHEMA.md — SmartNotes AI

Phase 2 output. Full database schema: tables, columns, types, relationships, indexes, constraints.
Backed by **SQLite** via SQLAlchemy 2.x (DEC-001). **Locked after Phase 2.**

---

## 1. Overview

Four tables: `users`, `folders`, `notes`, `preferences`. All user-owned data references
`users.id`. Folders self-reference for nesting (REQ-FLDR-02). Cascade delete is enforced at the DB
level via `ON DELETE CASCADE` so deleting a folder removes its subtree and notes (REQ-FLDR-05).

> SQLite note: foreign-key enforcement is OFF by default. The engine sets
> `PRAGMA foreign_keys = ON` on every connection so `ON DELETE CASCADE` actually fires.

```
users 1───∞ folders ──┐ (self-ref parent_id, nullable)
  │                    └──∞ notes
  │ 1───∞ notes (folder_id nullable = Unfiled)
  └ 1───1 preferences
```

---

## 2. Table: `users` — REQ-AUTH-*, NFR-SEC-01

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | TEXT (UUID) | PK | UUID v4 string |
| `email` | TEXT | NOT NULL, UNIQUE | citext-style: stored lowercased; uniqueness → REQ-AUTH-02 |
| `password_hash` | TEXT | NOT NULL | bcrypt hash (`$2b$...`); never plaintext (REQ-AUTH-03, NFR-SEC-01) |
| `created_at` | TEXT (ISO-8601) | NOT NULL, default now | |

Indexes: `UNIQUE INDEX ix_users_email (email)`.

---

## 3. Table: `folders` — REQ-FLDR-01/02/05

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | TEXT (UUID) | PK | |
| `name` | TEXT | NOT NULL | |
| `parent_id` | TEXT (UUID) | NULL, FK → `folders.id` ON DELETE CASCADE | NULL = top-level; self-ref nesting, no depth cap (REQ-FLDR-02) |
| `user_id` | TEXT (UUID) | NOT NULL, FK → `users.id` ON DELETE CASCADE | ownership (REQ-AUTH-07) |
| `created_at` | TEXT (ISO-8601) | NOT NULL, default now | |
| `updated_at` | TEXT (ISO-8601) | NOT NULL, default now, on update now | |

Indexes: `ix_folders_user_id (user_id)`, `ix_folders_parent_id (parent_id)`.

Cascade: deleting a folder cascades to child folders (self-ref) and to notes whose `folder_id`
matches (see §4), implementing REQ-FLDR-05 recursively.

---

## 4. Table: `notes` — REQ-EDIT-*, REQ-SAVE-*, REQ-FLDR-06/07, NFR-PERSIST-01

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | TEXT (UUID) | PK | |
| `title` | TEXT | NOT NULL, default `''` | may be empty; export → `untitled` (REQ-EXP-08) |
| `content` | TEXT | NOT NULL, default `''` | raw Markdown source (REQ-EDIT-04) |
| `folder_id` | TEXT (UUID) | NULL, FK → `folders.id` ON DELETE CASCADE | NULL = Unfiled (REQ-FLDR-06); cascade on folder delete (REQ-FLDR-05) |
| `user_id` | TEXT (UUID) | NOT NULL, FK → `users.id` ON DELETE CASCADE | ownership (REQ-AUTH-07) |
| `created_at` | TEXT (ISO-8601) | NOT NULL, default now | |
| `updated_at` | TEXT (ISO-8601) | NOT NULL, default now, on update now | drives `Saved` indicator / list ordering |

Indexes: `ix_notes_user_id (user_id)`, `ix_notes_folder_id (folder_id)`,
`ix_notes_user_updated (user_id, updated_at DESC)` (sidebar/palette ordering).

---

## 5. Table: `preferences` — REQ-PREF-*, REQ-THEME, REQ-PRESET, REQ-FOCUS, NFR-PERSIST-02

One row per user (1:1).

| Column | Type | Constraints | Default | Notes |
|---|---|---|---|---|
| `user_id` | TEXT (UUID) | PK, FK → `users.id` ON DELETE CASCADE | — | also the PK (enforces 1:1) |
| `theme` | TEXT | NOT NULL, CHECK in (`deeptech`,`lightdesk`) | `deeptech` | REQ-THEME-01 |
| `active_preset` | TEXT | NOT NULL, CHECK in (7 presets) | `format_only` | REQ-PRESET-01 |
| `focuspro_enabled` | INTEGER (bool) | NOT NULL | `0` | REQ-FOCUS-* |
| `notepilot_enabled` | INTEGER (bool) | NOT NULL | `1` | enabled by default (REQ-NP-09) |
| `notepilot_delay_ms` | INTEGER | NOT NULL, CHECK in (500,1000,…,5000) | `2000` | DEC-004/015 |
| `updated_at` | TEXT (ISO-8601) | NOT NULL, default now, on update now | — | |

`active_preset` CHECK set: `format_only, clean_up, enhance, explain, summarize, study_mode,
meeting_mode`.
`notepilot_delay_ms` CHECK set: `500,1000,1500,2000,2500,3000,3500,4000,4500,5000` (REQ-NP-10).

A `preferences` row is created with defaults at registration (see ARCHITECTURE §4.1).

---

## 6. Relationships Summary

- `users` 1—∞ `folders` (`folders.user_id`), cascade delete.
- `users` 1—∞ `notes` (`notes.user_id`), cascade delete.
- `users` 1—1 `preferences` (`preferences.user_id` PK), cascade delete.
- `folders` 1—∞ `folders` (`folders.parent_id` self-ref), cascade delete (nesting, REQ-FLDR-02).
- `folders` 1—∞ `notes` (`notes.folder_id`, nullable), cascade delete (REQ-FLDR-05).

---

## 7. SQLAlchemy DDL Sketch (reference; finalized in Phase 4a migrations)

```python
class User(Base):
    __tablename__ = "users"
    id            = mapped_column(String, primary_key=True, default=uuid4_str)
    email         = mapped_column(String, nullable=False, unique=True, index=True)
    password_hash = mapped_column(String, nullable=False)
    created_at    = mapped_column(String, nullable=False, default=now_iso)

class Folder(Base):
    __tablename__ = "folders"
    id         = mapped_column(String, primary_key=True, default=uuid4_str)
    name       = mapped_column(String, nullable=False)
    parent_id  = mapped_column(String, ForeignKey("folders.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id    = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = mapped_column(String, nullable=False, default=now_iso)
    updated_at = mapped_column(String, nullable=False, default=now_iso, onupdate=now_iso)

class Note(Base):
    __tablename__ = "notes"
    id         = mapped_column(String, primary_key=True, default=uuid4_str)
    title      = mapped_column(String, nullable=False, default="")
    content    = mapped_column(Text, nullable=False, default="")
    folder_id  = mapped_column(String, ForeignKey("folders.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id    = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = mapped_column(String, nullable=False, default=now_iso)
    updated_at = mapped_column(String, nullable=False, default=now_iso, onupdate=now_iso)

class Preferences(Base):
    __tablename__ = "preferences"
    user_id            = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    theme              = mapped_column(String, nullable=False, default="deeptech")
    active_preset      = mapped_column(String, nullable=False, default="format_only")
    focuspro_enabled   = mapped_column(Boolean, nullable=False, default=False)
    notepilot_enabled  = mapped_column(Boolean, nullable=False, default=True)
    notepilot_delay_ms = mapped_column(Integer, nullable=False, default=2000)
    updated_at         = mapped_column(String, nullable=False, default=now_iso, onupdate=now_iso)
    __table_args__ = (
        CheckConstraint("theme in ('deeptech','lightdesk')"),
        CheckConstraint("active_preset in ('format_only','clean_up','enhance','explain','summarize','study_mode','meeting_mode')"),
        CheckConstraint("notepilot_delay_ms in (500,1000,1500,2000,2500,3000,3500,4000,4500,5000)"),
    )
```

Migrations are authored with Alembic in Phase 4a. SQLite engine connect args set
`PRAGMA foreign_keys=ON`.
