# API_CONTRACTS.md — SmartNotes AI

Phase 2 output. The binding contract between frontend (Phase 3) and backend (Phase 4a/4b) agents.
**Locked after Phase 2** — no route may deviate without a logged reason in `BACKEND_NOTES.md`
(non-breaking) or explicit user approval + `DECISIONS.md` (breaking), per CLAUDE.md.

Every field below is named and typed. There are no placeholder shapes (Phase 2 validation gate #3).

---

## 0. Conventions

- **Base URL:** `${API_BASE_URL}` (e.g. `http://localhost:8000`). All routes are unversioned at MVP.
- **Content type:** `application/json` for request and response bodies, except export
  (binary/text file) and `/ai/notepilot` (`text/event-stream`).
- **Auth:** all routes except `/health`, `/auth/register`, `/auth/login`, `/auth/refresh` require
  header `Authorization: Bearer <access_token>`. Missing/invalid/expired token → `401`
  (REQ-AUTH-06, NFR-SEC-03).
- **Ownership:** every resource is scoped to the authenticated user. Requesting another user's
  resource id → `404` (never another user's content) (REQ-AUTH-07).
- **Error shape (all non-2xx):**
  ```json
  { "detail": "string", "code": "string" }
  ```
  `code` is a stable machine string (e.g. `email_exists`, `invalid_credentials`, `not_found`,
  `unauthorized`, `validation_error`). `detail` is user-readable.
- **Timestamps:** ISO-8601 UTC strings (e.g. `"2026-06-02T14:30:00Z"`).
- **IDs:** UUID v4 strings.

---

## 1. Shared Types

```ts
// Enums (string literals)
type AIAction =
  | "format" | "enhance" | "summarize" | "explain"
  | "simplify" | "bullets" | "action_items" | "custom";   // REQ-AIA-01 (8 actions)

type AIScope = "selection" | "document";                   // REQ-AIA-02/03/04

type Preset =
  | "format_only" | "clean_up" | "enhance" | "explain"
  | "summarize" | "study_mode" | "meeting_mode";           // REQ-PRESET-01 (7 presets)

type Theme = "deeptech" | "lightdesk";                      // REQ-THEME-01

type ExportFormat = "md" | "html" | "txt";                 // REQ-EXP-01

// Entities
interface User {
  id: string;
  email: string;
  created_at: string;
}

interface Folder {
  id: string;
  name: string;
  parent_id: string | null;   // null = top-level folder
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface Note {
  id: string;
  title: string;               // may be "" (empty); export falls back to "untitled" (REQ-EXP-08)
  content: string;             // raw Markdown source (REQ-EDIT-04)
  folder_id: string | null;    // null = Unfiled (REQ-FLDR-06)
  user_id: string;
  created_at: string;
  updated_at: string;
}

// Lightweight note for sidebar/palette lists (no content payload)
interface NoteSummary {
  id: string;
  title: string;
  folder_id: string | null;
  updated_at: string;
}

interface Preferences {
  user_id: string;
  theme: Theme;                       // default "deeptech"
  active_preset: Preset;              // default "format_only"
  focuspro_enabled: boolean;          // default false
  notepilot_enabled: boolean;         // default true  (REQ-NP-09)
  notepilot_delay_ms: number;         // default 2000; one of 500..5000 step 500 (REQ-NP-10, DEC-015)
  updated_at: string;
}
```

---

## 2. Health

### `GET /health`
Auth: none. Used by Phase 2 boot check and Phase 7 smoke test.
- **200**
  ```json
  { "status": "ok" }
  ```

---

## 3. Auth (`/auth`)  — REQ-AUTH-*, NFR-SEC-*

### `POST /auth/register`
Auth: none.
- **Request**
  ```json
  { "email": "user@example.com", "password": "string (min 8)" }
  ```
- **201**
  ```json
  { "id": "uuid", "email": "user@example.com", "created_at": "ISO-8601" }
  ```
- **409** `{ "detail": "An account with this email already exists.", "code": "email_exists" }`
  (REQ-AUTH-02)
- **422** validation error (bad email / short password) `code: "validation_error"`

### `POST /auth/login`
Auth: none.
- **Request**
  ```json
  { "email": "user@example.com", "password": "string" }
  ```
- **200**
  ```json
  {
    "access_token": "jwt",
    "refresh_token": "jwt",
    "token_type": "bearer",
    "user": { "id": "uuid", "email": "user@example.com", "created_at": "ISO-8601" }
  }
  ```
- **401** `{ "detail": "Invalid email or password.", "code": "invalid_credentials" }` (REQ-AUTH-04)

### `POST /auth/refresh`
Auth: none (refresh token in body). REQ-AUTH-05.
- **Request**
  ```json
  { "refresh_token": "jwt" }
  ```
- **200**
  ```json
  { "access_token": "jwt", "token_type": "bearer" }
  ```
- **401** `{ "detail": "Invalid or expired refresh token.", "code": "invalid_refresh" }`

### `GET /auth/me`
Auth: required.
- **200** → `User`
- **401** unauthorized

---

## 4. Folders (`/folders`) — REQ-FLDR-*

### `GET /folders`
Returns all of the user's folders (flat list; client builds the tree). REQ-FLDR-03.
- **200** → `Folder[]`

### `POST /folders`
Create a folder, optionally nested. REQ-FLDR-01/02.
- **Request**
  ```json
  { "name": "string", "parent_id": "uuid | null" }
  ```
- **201** → `Folder`
- **404** `parent_id` not found / not owned → `code: "not_found"`

### `PATCH /folders/{folder_id}`
Rename and/or move (reparent). All fields optional; at least one required. REQ-FLDR-01.
- **Request**
  ```json
  { "name": "string?", "parent_id": "uuid | null (optional)" }
  ```
- **200** → `Folder`
- **404** not found / not owned

### `GET /folders/{folder_id}/delete-preview`
Counts affected descendants for the confirmation dialog. REQ-FLDR-04, NFR-USAB-03.
- **200**
  ```json
  { "folder_id": "uuid", "note_count": 12, "subfolder_count": 3 }
  ```
- **404** not found / not owned

### `DELETE /folders/{folder_id}`
Cascade delete: folder + all subfolders + all contained notes; no undo. REQ-FLDR-05.
- **204** no content
- **404** not found / not owned

---

## 5. Notes (`/notes`) — REQ-EDIT-*, REQ-SAVE-*, REQ-FLDR-*, REQ-CMDK-*

### `GET /notes`
List the user's notes as summaries (for sidebar + palette fuzzy search). REQ-CMDK-02, REQ-FLDR-03.
Optional query: `?folder_id=<uuid|unfiled>` to filter.
- **200** → `NoteSummary[]`

### `POST /notes`
Create a note. Opens focused/empty (REQ-EDIT-01/02 — UI behavior; API just creates).
- **Request**
  ```json
  { "title": "string (default \"\")", "content": "string (default \"\")", "folder_id": "uuid | null" }
  ```
- **201** → `Note`
- **404** `folder_id` not found / not owned

### `GET /notes/{note_id}`
Fetch full note (with content) to open in the editor. REQ-CMDK-03, REQ-FLDR-03.
- **200** → `Note`
- **404** not found / not owned

### `PATCH /notes/{note_id}`
Update title, content (autosave/manual save), and/or move folder. All optional; ≥1 required.
REQ-SAVE-01/02/04, REQ-FLDR-07.
- **Request**
  ```json
  { "title": "string?", "content": "string?", "folder_id": "uuid | null (optional)" }
  ```
- **200** → `Note` (with new `updated_at`)
- **404** not found / not owned
- Note: REQ-SAVE-04 (skip save when unchanged) is enforced client-side — no PATCH is issued.

### `DELETE /notes/{note_id}`
Delete a single note. REQ-FLDR-01.
- **204** no content
- **404** not found / not owned

### `GET /notes/{note_id}/export`
Export the note. REQ-EXP-*. Query: `?format=md|html|txt` (required).
- **200** — file download:
  - Headers: `Content-Type` = `text/markdown` | `text/html` | `text/plain` (REQ-EXP-03);
    `Content-Disposition: attachment; filename="<sanitized>.<ext>"` (REQ-EXP-08, DEC-016).
  - Body: file bytes. `md` = raw markdown (REQ-EXP-04); `html` = rendered HTML + inline styles
    `font-family,line-height,max-width` (REQ-EXP-05); `txt` = markdown stripped (REQ-EXP-06).
  - Empty note → empty body, valid file, no error (REQ-EXP-07).
- **422** unsupported/missing `format` → `code: "validation_error"`
- **404** not found / not owned

---

## 6. Preferences (`/preferences`) — REQ-PREF-*, REQ-THEME-*, REQ-PRESET-*, REQ-FOCUS-*, NFR-PERSIST-02

### `GET /preferences`
- **200** → `Preferences`

### `PATCH /preferences`
Partial update; any subset of fields. Applies immediately client-side; persisted server-side
(NFR-PERF-04, NFR-PERSIST-02). REQ-PREF-03/04, REQ-THEME-03/04, REQ-PRESET-03, REQ-FOCUS-06.
- **Request** (all optional, ≥1 required)
  ```json
  {
    "theme": "deeptech | lightdesk",
    "active_preset": "format_only | clean_up | enhance | explain | summarize | study_mode | meeting_mode",
    "focuspro_enabled": true,
    "notepilot_enabled": true,
    "notepilot_delay_ms": 2000
  }
  ```
- **200** → `Preferences`
- **422** `notepilot_delay_ms` not in {500,1000,…,5000} or invalid enum → `code: "validation_error"`
  (REQ-NP-10, DEC-015)

---

## 7. AI (`/ai`) — REQ-AIA-*, REQ-REV-*, REQ-CPMT-*, REQ-NP-*, REQ-PRESET-*  (wired in Phase 4b)

All AI routes require auth (NFR-SEC-03). No AI route fires without explicit user intent
(NFR-REL-03).

### `POST /ai/transform`
Run one of the 8 actions on a selection or the full document. REQ-AIA-01…05, REQ-CPMT-02/04.
- **Request**
  ```json
  {
    "note_id": "uuid",
    "action": "format | enhance | summarize | explain | simplify | bullets | action_items | custom",
    "scope": "selection | document",
    "text": "string (selected text for scope=selection; full note content for scope=document)",
    "preset": "format_only | clean_up | enhance | explain | summarize | study_mode | meeting_mode",
    "instruction": "string | null (required when action=custom, else null)"
  }
  ```
  - `scope=selection` sends only the selected text (REQ-AIA-03); `scope=document` sends the full
    note (REQ-AIA-04). `preset` is the active behavior preset and shapes output (REQ-AIA-05,
    REQ-PRESET-05). For the selection toolbar's custom prompt, `action=custom, scope=selection`
    (REQ-CPMT-03); for the full-document custom prompt, `action=custom, scope=document`
    (REQ-CPMT-01/02).
- **200**
  ```json
  { "output": "string (AI result, markdown)", "action": "format", "scope": "selection" }
  ```
  The response is preview-only; the backend never mutates the note (REQ-REV-01).
- **422** `action=custom` without `instruction` → `code: "validation_error"`
- **404** `note_id` not found / not owned
- **502** `{ "detail": "AI provider error.", "code": "ai_error" }` upstream failure

### `POST /ai/revise`
Produce a new output from a previous AI output + a follow-up instruction. Unlimited; each call is
one explicit revision. REQ-REV-05, DEC-009.
- **Request**
  ```json
  {
    "previous_output": "string",
    "instruction": "string",
    "preset": "format_only | clean_up | enhance | explain | summarize | study_mode | meeting_mode"
  }
  ```
- **200**
  ```json
  { "output": "string" }
  ```
- **502** `code: "ai_error"`

### `POST /ai/notepilot`
Streaming inline continuation. Uses a fixed neutral prompt independent of preset (REQ-NP-11,
DEC-014). Context = note content from start to cursor (REQ-NP-02, DEC-005).
- **Request**
  ```json
  { "note_id": "uuid", "context": "string (note[0..cursor])" }
  ```
- **200** — `Content-Type: text/event-stream` (SSE). Event stream:
  ```
  event: token
  data: {"text": "partial chunk"}

  event: done
  data: {}
  ```
  On upstream error or empty result the stream emits `event: done` with no preceding `token`
  events (frontend removes the placeholder silently — REQ-NP-07, NFR-REL-02). The server never
  returns a user-facing error body for NotePilot.
- **404** `note_id` not found / not owned

---

## 8. Status Code Summary

| Code | Meaning | Used by |
|---|---|---|
| 200 | OK | reads, updates, AI, export |
| 201 | Created | register, create folder/note |
| 204 | No Content | delete note/folder |
| 401 | Unauthenticated / bad credentials | all protected routes, login, refresh |
| 404 | Not found / not owned | any resource id (incl. cross-user, REQ-AUTH-07) |
| 409 | Conflict | duplicate email register |
| 422 | Validation error | bad body/query/enum/delay value |
| 502 | Upstream AI error | /ai/transform, /ai/revise |

---

## 9. Requirement → Endpoint Coverage (Phase 2 validation gate #2)

Every requirement in `REQUIREMENTS.md` maps to an endpoint and/or is marked client-side (CS) where
the behavior is purely frontend with no API surface.

| Requirement(s) | Endpoint / mechanism |
|---|---|
| REQ-AUTH-01,02 | `POST /auth/register` |
| REQ-AUTH-03 | bcrypt in register (see DB_SCHEMA `users.password_hash`) |
| REQ-AUTH-04 | `POST /auth/login` |
| REQ-AUTH-05 | `POST /auth/refresh` + FE 401 interceptor |
| REQ-AUTH-06, NFR-SEC-03 | `get_current_user` on all protected routes |
| REQ-AUTH-07 | per-route `user_id` scoping → 404 |
| REQ-EDIT-01..05 | CS (editor); persistence via `POST/GET/PATCH /notes` |
| REQ-SAVE-01,02,03 | `PATCH /notes/{id}` + CS debounce/indicator |
| REQ-SAVE-04 | CS (skip PATCH when unchanged) |
| REQ-NP-01..08 | `POST /ai/notepilot` + CS trigger/ghost-text/dismiss |
| REQ-NP-09,10 | `PATCH /preferences` (`notepilot_enabled`, `notepilot_delay_ms`) |
| REQ-NP-11 | `/ai/notepilot` fixed neutral prompt (no preset field) |
| REQ-AIA-01..05 | `POST /ai/transform` (action/scope/preset/text) |
| REQ-TBAR-01..05 | CS (selection toolbar) → actions call `/ai/transform` |
| REQ-REV-01..07 | `POST /ai/transform`, `POST /ai/revise` (preview), CS panel |
| REQ-REV-08, NFR-RESP-04 | CS (side-by-side/tabbed) |
| REQ-CPMT-01..04 | `POST /ai/transform` (`action=custom, scope=document`) |
| REQ-FLDR-01,02,03,07 | `GET/POST /folders`, `PATCH /folders/{id}`, `PATCH /notes/{id}` |
| REQ-FLDR-04, NFR-USAB-03 | `GET /folders/{id}/delete-preview` |
| REQ-FLDR-05 | `DELETE /folders/{id}` (cascade) |
| REQ-FLDR-06 | `folder_id: null` (Unfiled) on notes |
| REQ-THEME-01..04, NFR-PERF-04 | `GET/PATCH /preferences` (`theme`) + CS tokens |
| REQ-FOCUS-01..06 | `PATCH /preferences` (`focuspro_enabled`) + CS rendering |
| REQ-PRESET-01..05 | `PATCH /preferences` (`active_preset`); `preset` field on `/ai/*` |
| REQ-PREF-01..04, NFR-PERSIST-02 | `GET/PATCH /preferences` |
| REQ-CMDK-01..05 | CS palette over `GET /notes`; actions reuse notes/folders/ai/export/prefs |
| REQ-EXP-01..08 | `GET /notes/{id}/export?format=` |
| NFR-PERF-01,02,03 | CS timing (autosave 1000ms, notepilot delay, toolbar frame) |
| NFR-SEC-01,02 | bcrypt + JWT in auth routes |
| NFR-SEC-04 | secrets backend-only (no endpoint) |
| NFR-RESP-01,02,03 | CS responsive layout |
| NFR-PERSIST-01 | `/notes`, `/folders` persisted in SQLite |
| NFR-REL-01 | `PATCH /notes` failure → CS retry indicator |
| NFR-REL-02 | `/ai/notepilot` silent fail |
| NFR-REL-03 | no idle AI calls (CS + explicit-intent routes only) |

All functional and non-functional requirements are covered by an endpoint or an explicitly
client-side mechanism. No requirement is unmapped.
