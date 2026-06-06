# BACKEND_NOTES.md — SmartNotes AI (Phase 4a)

Implementation notes + any deviations from `API_CONTRACTS.md` / `DB_SCHEMA.md` (per CLAUDE.md, all
non-breaking — logged here, not requiring a locked-doc change). Stack per DEC-001/DEC-017: FastAPI +
SQLAlchemy 2 + SQLite, custom JWT (access+refresh) + bcrypt. No Supabase.

---

## What was built

- **Models** (`app/models/`): `User`, `Folder`, `Note`, `Preferences` exactly per DB_SCHEMA — UUID
  string PKs, `ON DELETE CASCADE` FKs, preferences CHECK constraints, all indexes.
- **Auth** (`app/core/security.py`, `app/routers/auth.py`): bcrypt hashing; JWT access + refresh with
  a `type` claim; `register` (+seeds default preferences row), `login`, `refresh`, `me`.
- **Routes**: full `/auth`, `/folders`, `/notes`, `/preferences` per API_CONTRACTS §3–§6. `/ai`
  remains stubbed (wired in Phase 4b).
- **Export** (`app/services/export_service.py`): md (raw) / html (rendered + inline styles) / txt
  (markdown stripped) + filename sanitization.
- **Migrations**: Alembic (`alembic/`, revision `initial schema`) creates all four tables. Run
  `alembic upgrade head` before first boot (ENV_SETUP §3).
- **Tests**: 69 passing (`pytest`) across auth, folders, notes, preferences, export, health.

---

## Deviations & decisions (all non-breaking)

1. **Email validation without `EmailStr`.** `email-validator` is not in the locked
   `requirements.txt` and was not installed. To keep the environment reproducible from the locked
   deps, email is validated with a dependency-free regex + lowercase normalization (DB_SCHEMA §2
   "stored lowercased"). Behavior matches the contract: a bad email on register → `422`
   (`validation_error`). If `EmailStr` is preferred later, add `email-validator` and swap the
   validator — the wire shape is unchanged.

2. **Timestamp precision = milliseconds.** `now_iso()` emits e.g. `2026-06-04T16:30:00.123Z`
   instead of whole seconds. API_CONTRACTS §0 specifies "ISO-8601 UTC strings (e.g. …00Z)" — the
   example is whole-second but the format is satisfied. Millisecond precision makes a user's notes
   sort deterministically newest-first (DB_SCHEMA §4 `ix_notes_user_updated`); whole-second
   timestamps tie when rows are created in the same second. JS `Date` parses both identically.

3. **Folder reparent cycle guard.** `PATCH /folders/{id}` rejects moving a folder into itself or one
   of its descendants with `422` (`validation_error`). Not enumerated in API_CONTRACTS §4 but it
   reuses the existing 422/validation_error shape and prevents a self-referential cycle that would
   corrupt the tree and cascade delete. Additive safety only.

4. **`ix_notes_user_updated` is an expression index** `(user_id, updated_at DESC)` per DB_SCHEMA §4.
   SQLite cannot introspect expression indexes, so Alembic autogenerate/`alembic check` would report
   a perpetual false diff. `alembic/env.py` excludes this one index from comparison via
   `include_object`; the initial migration creates it explicitly. `alembic check` is clean.

5. **Structured errors.** Every non-2xx response is `{detail, code}` (API_CONTRACTS §0). Stable
   codes used: `email_exists`, `invalid_credentials`, `invalid_refresh`, `unauthorized`,
   `not_found`, `validation_error`. A catch-all handler coerces any stray `HTTPException` into the
   same shape so the contract holds even for framework-raised errors.

6. **Schema creation is Alembic-owned.** The app does not auto-create tables on startup (keeps
   Alembic the single source of truth). Dev/prod: `alembic upgrade head`. Tests build the schema on
   an isolated in-memory SQLite via `Base.metadata.create_all` with `PRAGMA foreign_keys=ON` so
   cascade behavior is covered (`tests/conftest.py`).

7. **`GET /preferences` is get-or-create.** Registration already seeds the row; the read path
   re-creates defaults defensively if it is ever absent. No contract change.

8. **AI provider = Google Gemini (DEC-018).** `ai_service.py` uses the `google-genai` SDK behind the
   same `complete()` / `stream_tokens()` seams. Models are task-routed via `settings.model_for(task)`
   (`AI_MODEL_DEFAULT=gemini-2.5-flash-lite`, optional `AI_MODEL_TRANSFORM` / `AI_MODEL_NOTEPILOT`
   overrides). Gemini thinking is disabled (`thinking_budget=0`) so NotePilot's 80-token budget is
   not eaten by reasoning. No `/ai/*` contract change.

---

## Run

```bash
cd backend && source .venv/bin/activate
alembic upgrade head          # create smartnotes.db
uvicorn app.main:app --reload # http://localhost:8000
pytest                        # 69 passed
```
