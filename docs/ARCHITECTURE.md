# ARCHITECTURE.md — SmartNotes AI

Phase 2 output. Derived from `docs/REQUIREMENTS.md` and `docs/USER_FLOWS.md` (source of truth
upstream: `docs/SPEC.md`, `docs/DECISIONS.md`). **Locked after Phase 2** — do not edit without
logging in `docs/DECISIONS.md` and getting explicit user approval (per CLAUDE.md).

---

## 1. System Overview

SmartNotes AI is a two-tier web application:

- **Frontend** — a Next.js (App Router) single-page-style React app, TypeScript + Tailwind CSS.
  Runs the editor, sidebar, toolbar, command palette, review panel, and preferences. Deploys to
  Vercel (Phase 7).
- **Backend** — a FastAPI (Python) REST API backed by a local SQLite database via SQLAlchemy.
  Owns auth (JWT access + refresh, bcrypt), all persistence (users, folders, notes, preferences),
  export rendering, and all Anthropic AI calls. Deploys to Railway/Render (Phase 7).

The Anthropic API key lives only on the backend. The frontend never holds it (NFR-SEC-04). All AI
requests proxy through the backend so the key is never shipped in the client bundle.

```
┌────────────────────────┐         HTTPS / JSON          ┌──────────────────────────────┐
│  Next.js Frontend       │  ───────────────────────────▶ │  FastAPI Backend              │
│  (Vercel)               │   Bearer <access JWT>          │  (Railway / Render)           │
│                         │                                │                               │
│  • CodeMirror 6 editor  │  ◀─── SSE stream (NotePilot) ─ │  • Auth (JWT + bcrypt)        │
│  • Sidebar / palette    │                                │  • Notes/Folders/Prefs CRUD   │
│  • Toolbar / review     │                                │  • Export renderer            │
│  • Zustand stores       │                                │  • Anthropic AI proxy         │
└────────────────────────┘                                │           │                   │
                                                            │           ▼                   │
                                                            │   ┌───────────────┐           │
                                                            │   │ SQLite (file) │           │
                                                            │   │ via SQLAlchemy│           │
                                                            │   └───────────────┘           │
                                                            │           │                   │
                                                            │           ▼                   │
                                                            │   Anthropic Messages API      │
                                                            └──────────────────────────────┘
```

---

## 2. Technology Decisions

| Layer | Choice | Why |
|---|---|---|
| Frontend framework | Next.js 14 (App Router) + React 18 | Vercel deploy target (Phase 7); mature React + TS + routing. |
| Language (FE) | TypeScript (strict) | Type-safe contracts shared with API shapes. |
| Styling | Tailwind CSS + CSS variables | Theme tokens (DeepTech/LightDesk) via CSS variables; instant theme switch with no reload (REQ-THEME-03). |
| Editor engine | CodeMirror 6 | Live Markdown decoration rendering with editable raw source (REQ-EDIT-03/04); inline widget decorations for NotePilot ghost text (REQ-NP-04); selection geometry for floating toolbar (REQ-TBAR-01). |
| Client state | Zustand | Lightweight stores for editor, notes tree, preferences, AI review. No reload on pref/theme change (NFR-PERF-04). |
| Data fetching | TanStack Query | Caching, optimistic CRUD, retry for save indicator states (REQ-SAVE-03). |
| Command palette | cmdk | Fuzzy search over note titles (REQ-CMDK-02). |
| FE tests | Vitest + React Testing Library | Component tests (Phase 3). |
| Backend framework | FastAPI | Async, Pydantic request/response models = no placeholder shapes; SSE for NotePilot streaming (Phase 4b). |
| ORM | SQLAlchemy 2.x + Alembic | Models + migrations (Phase 4a). |
| Database | SQLite (file) | Per DEC-001 — local, no external service at MVP. |
| Auth | python-jose (JWT) + passlib[bcrypt] | Access+refresh JWT, bcrypt hashing (REQ-AUTH-03/04/05). |
| AI | anthropic Python SDK | All AI actions, NotePilot streaming (Phase 4b). |
| BE tests | pytest + httpx | API tests (Phase 4a/4b). |

> **DEC-001 note:** The CLAUDE.md Phase-mapping text mentions "Supabase Auth" for Phase 4a. This is
> superseded by DEC-001 (local SQLite + custom JWT auth). No Supabase dependency exists. This
> architecture follows DEC-001.

---

## 3. Component Boundaries

### 3.1 Frontend modules
- **`app/`** — Next.js routes: `/login`, `/register`, `/` (workspace). Auth guard redirects
  unauthenticated users to `/login` (REQ-AUTH-06 enforced server-side; client guard is UX only).
- **`components/editor/`** — CodeMirror wrapper, live Markdown rendering, NotePilot ghost-text
  extension, FocusPro view plugin, save indicator, editor header (preset, FocusPro toggle, export,
  custom-prompt button).
- **`components/toolbar/`** — selection-anchored floating toolbar (REQ-TBAR-*).
- **`components/review/`** — AI Output Review panel (REQ-REV-*), side-by-side / tabbed diff.
- **`components/sidebar/`** — folder tree, Unfiled section, note list, CRUD affordances.
- **`components/palette/`** — command palette (REQ-CMDK-*).
- **`components/preferences/`** — preferences panel (REQ-PREF-*).
- **`lib/api/`** — typed API client (one function per API_CONTRACTS route), token storage, auto
  refresh-on-401 interceptor (REQ-AUTH-05).
- **`stores/`** — Zustand stores: `authStore`, `notesStore`, `editorStore`, `prefsStore`,
  `reviewStore`.

### 3.2 Backend modules
- **`app/main.py`** — FastAPI app, router registration, CORS, exception handlers.
- **`app/core/`** — config (env), security (JWT encode/decode, bcrypt), dependencies
  (`get_current_user`, `get_db`).
- **`app/db/`** — SQLAlchemy engine/session, Base, Alembic env.
- **`app/models/`** — ORM models: `User`, `Folder`, `Note`, `Preferences`.
- **`app/schemas/`** — Pydantic request/response models (the wire shapes in API_CONTRACTS.md).
- **`app/routers/`** — `auth`, `notes`, `folders`, `preferences`, `ai`, `export`.
- **`app/services/`** — `ai_service` (Anthropic, presets, NotePilot), `export_service`
  (md/html/txt rendering + filename sanitization).

---

## 4. Data Flow Sequences

### 4.1 Auth — register / login / refresh (UF-1; REQ-AUTH-*)
```
register:
  FE POST /auth/register {email, password}
  BE → validate email unique → 409 if exists (REQ-AUTH-02)
     → bcrypt hash password (REQ-AUTH-03)
     → insert User → create default Preferences row
     → 201 {user}
login:
  FE POST /auth/login {email, password}
  BE → verify bcrypt; wrong → 401 (REQ-AUTH-04)
     → issue access JWT (exp short) + refresh JWT (exp long)
     → 200 {access_token, refresh_token, token_type, user}
authed request:
  FE sends Authorization: Bearer <access>
  BE get_current_user → decode/verify → load user; invalid/missing → 401 (REQ-AUTH-06)
refresh (on 401 from expired access):
  FE POST /auth/refresh {refresh_token}
  BE → verify refresh JWT → issue new access (REQ-AUTH-05)
     → FE retries original request once
```

### 4.2 Editor write → autosave (UF-2; REQ-SAVE-*)
```
user types → editorStore.content updates → live Markdown render (REQ-EDIT-03)
debounce 1000ms after last keystroke (NFR-PERF-01):
  if content == lastSavedContent → no request (REQ-SAVE-04)
  else indicator=Saving… → PATCH /notes/{id} {title?, content}
       200 → indicator=Saved ; lastSavedContent=content
       error → indicator=Error saving + Retry (REQ-SAVE-03, NFR-REL-01)
Cmd/Ctrl+S → cancel debounce → immediate PATCH (REQ-SAVE-02)
```

### 4.3 NotePilot inline suggestion (UF-4/UF-5; REQ-NP-*) — Phase 4b wiring
```
typing idle for prefs.notepilot_delay_ms (default 2000) and notepilot_enabled (REQ-NP-01/09):
  show animated placeholder at cursor (REQ-NP-03)
  POST /ai/notepilot {note_id, context}  context = note[0..cursor] (REQ-NP-02, DEC-005)
    BE streams continuation via SSE using fixed neutral prompt (REQ-NP-11, DEC-014)
  stream tokens → render ghost text muted/inline (REQ-NP-04)
  Tab → insert as real text (REQ-NP-05)
  any other key/typing → discard ghost text, no side effect (REQ-NP-06)
  error/empty → remove placeholder silently (REQ-NP-07, NFR-REL-02)
  next idle pause → new cycle (REQ-NP-08)
```

### 4.4 AI action (selection or full-doc) → review → accept (UF-3/UF-6/UF-7; REQ-AIA/REV/CPMT)
```
trigger:
  selection action: POST /ai/transform {note_id, action, scope:"selection", text:selected, preset}
  full-doc action:  POST /ai/transform {note_id, action, scope:"document", text:fullNote, preset}
  custom full-doc:  POST /ai/transform {action:"custom", scope:"document", text:fullNote,
                                        instruction, preset}
BE → ai_service applies active preset system prompt (REQ-AIA-05, REQ-PRESET-05) → 200 {output}
FE → open Review panel; original NOT modified yet (REQ-REV-01)
     full-doc → side-by-side (desktop) / tabbed (mobile) (REQ-REV-08, NFR-RESP-04)
  Accept → replace targeted region only (REQ-REV-02, REQ-AIA-03) → triggers autosave
  Reject → close, no change (REQ-REV-03)
  Edit suggestion → output editable in-panel; Accept applies edited (REQ-REV-04, DEC-008)
  Ask AI to revise → POST /ai/revise {previous_output, instruction, preset} → new output;
                     unlimited, explicit submit each time (REQ-REV-05, DEC-009)
  Copy → clipboard, note unchanged (REQ-REV-06)
```

### 4.5 Folder/note CRUD + cascade delete (UF-8/UF-9; REQ-FLDR-*)
```
create/rename/move note or folder → POST/PATCH → persists (REQ-FLDR-01/07)
move note to folder → PATCH /notes/{id} {folder_id} (or null → Unfiled, REQ-FLDR-06)
delete folder:
  FE GET /folders/{id}/delete-preview → {note_count, subfolder_count}
  show confirm dialog with count (REQ-FLDR-04, NFR-USAB-03)
  confirm → DELETE /folders/{id} → cascade folder+subfolders+notes (REQ-FLDR-05)
```

### 4.6 Export (UF-10; REQ-EXP-*)
```
FE GET /notes/{id}/export?format=md|html|txt
BE export_service:
  md  → raw markdown, text/markdown, .md (REQ-EXP-04)
  html→ rendered + inline styles, text/html, .html (REQ-EXP-05)
  txt → markdown stripped, text/plain, .txt (REQ-EXP-06)
  filename = sanitize(title) or "untitled" (REQ-EXP-08, DEC-016)
  empty note → valid empty file, no error (REQ-EXP-07)
returns file body + Content-Type + Content-Disposition; FE triggers browser download (REQ-EXP-03)
```

### 4.7 Preferences (UF-12; REQ-PREF-*, REQ-THEME, REQ-PRESET, REQ-FOCUS)
```
load: GET /preferences → prefsStore hydrate → theme/preset/focuspro/notepilot applied
change: PATCH /preferences {partial} → optimistic store update (instant, no reload, NFR-PERF-04)
        → persist (NFR-PERSIST-02); reload restores from DB (REQ-PREF-04)
theme/focuspro/preset toggles in header and palette mutate same prefsStore (synced, REQ-FOCUS-06)
```

---

## 5. Cross-Cutting Concerns

- **Auth enforcement:** every `/notes`, `/folders`, `/preferences`, `/ai`, `/export` route depends
  on `get_current_user`; missing/invalid token → 401 (REQ-AUTH-06, NFR-SEC-03). All queries filter
  by `user_id`; cross-user access → 404 (REQ-AUTH-07).
- **Secrets:** `ANTHROPIC_API_KEY`, `JWT_SECRET` only in backend env, never in frontend bundle
  (NFR-SEC-04).
- **No idle AI calls:** AI requests fire only on explicit action or the NotePilot trigger pause
  (NFR-REL-03).
- **Error handling:** structured JSON errors `{detail}`; save failures and AI failures handled per
  REQ-SAVE-03 / REQ-NP-07.
- **Responsiveness:** Tailwind breakpoints 375/768/1280 (NFR-RESP-01); review diff and toolbar adapt
  (NFR-RESP-03/04).

---

## 6. Repository Layout

```
IntelliNote2/
├── docs/                      # all phase documents
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/              # config, security, deps
│   │   ├── db/                # session, base
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic wire shapes
│   │   ├── routers/           # auth, notes, folders, preferences, ai, export
│   │   └── services/          # ai_service, export_service
│   ├── tests/
│   ├── alembic/               # migrations (Phase 4a)
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── app/                   # Next.js App Router routes
    ├── components/            # editor, toolbar, review, sidebar, palette, preferences
    ├── lib/                   # api client, utils
    ├── stores/                # zustand stores
    ├── package.json
    ├── tailwind.config.ts
    └── .env.example
```

---

## 7. Phase 2 Scope Boundary

Phase 2 produces the documents above plus a **bootable skeleton**: folder structure, config, deps,
a FastAPI app that starts under `uvicorn` with a health route, and a Next.js app that starts under
`npm run dev`. Business logic, real CRUD, auth wiring, AI, and UI are implemented in Phases 3–4b.
Route stubs in the skeleton conform to `API_CONTRACTS.md` shapes but may return mock/`501` responses
until their phase.
