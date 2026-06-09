# Agent Pipeline — AI Notes App

---

## Pipeline Rules

- Each phase must produce all listed outputs before the next phase starts.
- Every phase ends with a validation gate. If the gate fails, the phase reruns with a correction prompt before proceeding.
- Agents read all previous phase outputs as context before executing.
- The spec (`docs/SPEC.md`) is the source of truth. Any conflict between phases is resolved by the spec.
- Tests are written in the same phase as the feature, not after.

---

## Phase 0 — Spec Lock
**Status:** DONE
**Agent:** `/ultraplan`
**Reads:** `docs/SPEC.md`
**Outputs:**
- `docs/SPEC.md` — finalized: added Auth & Data Model, Autosave, Command Palette sections; added acceptance conditions to all 12 features; resolved all 16 ambiguities
- `docs/DECISIONS.md` — 16 decision entries logged (DEC-001 through DEC-016)

**Validation gate:**
- [x] No undefined terms or vague behaviors remain in the spec.
- [x] Every feature has a clear acceptance condition.

> This phase exists to catch spec ambiguity before it becomes an architecture bug. Do not skip it.

---

## Phase 1 — Requirements
**Status:** DONE
**Summary:** Produced REQUIREMENTS.md (108 IDs across 15 functional + 6 non-functional areas, area-prefixed, each with an objective verification condition + traceability matrix) and USER_FLOWS.md (UF-1…UF-12 covering all core scenarios).
**Agent:** `/ultraplan` + `senior-architect` skill
**Reads:** `docs/SPEC.md`, `docs/DECISIONS.md`
**Outputs:**
- `docs/REQUIREMENTS.md` — functional and non-functional requirements, each with a unique area-prefixed ID (e.g. REQ-AUTH-01, NFR-PERF-01)
- `docs/USER_FLOWS.md` — step-by-step user flows for all core scenarios (write note → AI format → accept, NotePilot suggestion → accept/reject, text selection → toolbar action, folder creation, export)

**Validation gate:**
- [x] Every spec feature maps to at least one requirement ID. (REQUIREMENTS.md §3 Traceability Matrix — all 12 features + 5 cross-cutting sections covered)
- [x] Every requirement is testable — no vague language like "should feel fast." (each requirement has an objective Verification condition; all timing/count/size values are exact)

---

## Phase 2 — Architecture & Scaffold
**Status:** DONE
**Summary:** Produced ARCHITECTURE.md (Next.js + FastAPI/SQLite two-tier, 7 data-flow sequences), API_CONTRACTS.md (all routes across auth/folders/notes/preferences/ai/export, fully typed, + requirement→endpoint coverage matrix), DB_SCHEMA.md (4 tables, FK cascade), COMPONENT_TREE.md (full hierarchy + props + Zustand stores), ENV_SETUP.md. Scaffolded a bootable skeleton: backend (FastAPI, stubbed routers, /health, pytest green) and frontend (Next.js 14 + TS + Tailwind, vitest green). Both boot clean.
**Agent:** `senior-architect` skill
**Reads:** `docs/REQUIREMENTS.md`, `docs/USER_FLOWS.md`
**Outputs:**
- `docs/ARCHITECTURE.md` — system design, component boundaries, data flow described as structured text sequences
- `docs/API_CONTRACTS.md` — all API routes with request/response shapes defined (this is the contract both frontend and backend agents must honor)
- `docs/DB_SCHEMA.md` — full database schema with table definitions, relationships, and indexes
- `docs/COMPONENT_TREE.md` — full React component hierarchy with props interface sketches
- `docs/ENV_SETUP.md` — environment variables, local dev setup instructions, required services
- Project skeleton — `backend/` (FastAPI + SQLAlchemy + SQLite) and `frontend/` (Next.js 14 + TS + Tailwind); config files, deps installed, both apps boot with no errors

**Validation gate:**
- [x] App skeleton runs locally — `uvicorn app.main:app` boots clean (`/health` → 200); `npm run dev` boots clean (`/` → 200). Backend `pytest` and frontend `vitest` pass.
- [x] API contracts cover every requirement in `REQUIREMENTS.md` — API_CONTRACTS.md §9 maps every REQ/NFR ID to an endpoint or explicit client-side mechanism.
- [x] No placeholder shapes in `API_CONTRACTS.md` — all request/response fields named and typed (shared types in §1).

> Note: per DEC-001, Phase 4a uses local SQLite + custom JWT auth, not Supabase. Logged in ARCHITECTURE.md §2.

---

## Phase 3 — Frontend (Mocked Data)
**Status:** DONE
**Summary:** Built the full mocked UI on the Phase 2 skeleton: locked DeepTech/LightDesk theme tokens + instant theme switch; 5 Zustand stores (auth/notes/editor/prefs/review) + mock data and a mock AI layer matching API_CONTRACTS §1/§7 shapes. Implemented sidebar (recursive folder tree, Unfiled, inline rename, cascade delete dialog), CodeMirror 6 editor with live-Markdown render + NotePilot ghost-text (streamed, Tab-accept, silent dismiss) + FocusPro (bionic + 150-word divider) extensions, editor header (title/save-indicator/preset/FocusPro/doc-AI/custom-prompt/export), floating selection toolbar (4 default + More→8), AI review panel (accept/reject/edit/revise/copy, side-by-side diff desktop ↔ tabs mobile), command palette (Cmd/Ctrl+K fuzzy), preferences panel, and mocked auth pages. Responsive across mobile/tablet/desktop. 63 component/unit tests pass; `next build` clean; dev boots (`/`,`/login`,`/register`→200).
**Agent:** `senior-frontend` skill
**Reads:** `docs/SPEC.md`, `docs/COMPONENT_TREE.md`, `docs/API_CONTRACTS.md`
**Outputs:**
- Fully styled, fully interactive UI using mocked data only (no real API calls)
- Both themes implemented and switchable (DeepTech, LightDesk)
- NotePilot ghost text UI implemented (trigger, display, Tab-accept, dismiss)
- Floating inline toolbar implemented (selection trigger, action buttons, "More" expand)
- AI output preview panel implemented (accept, reject, edit, revise, copy)
- FocusPro mode implemented and toggleable
- Folder sidebar implemented with mock folder/note tree
- Preferences panel implemented
- Export UI implemented (format selection, download trigger — mocked)
- Component-level tests for all interactive components
- `docs/FRONTEND_NOTES.md` — any deviations from `COMPONENT_TREE.md` logged with reasoning

**Validation gate:**
- [x] All mock data shapes match `API_CONTRACTS.md` exactly. (`lib/api/types.ts` single source; `lib/mock/*` use those types)
- [x] Both themes render correctly with no broken styles. (tokens locked in `globals.css`; instant `data-theme` switch; build + boot verified)
- [x] All interactive elements respond correctly on desktop and mobile viewport sizes. (`useIsMobile` + Tailwind `md:`; drawer/tabs/keyboard-aware toolbar)
- [x] All component tests pass. (`vitest run` → 63 passed / 12 files; `next build` clean)

> Deviations from locked `COMPONENT_TREE.md` logged in `docs/FRONTEND_NOTES.md` (all non-breaking).

---

## Phase 4a — Backend & Database
**Status:** DONE
**Summary:** Implemented the full FastAPI backend on the Phase 2 skeleton: SQLAlchemy models for all 4 tables (UUID PKs, ON DELETE CASCADE, preferences CHECK constraints, indexes incl. `ix_notes_user_updated`); custom JWT (access+refresh, `type` claim) + bcrypt auth with register/login/refresh/me (register seeds default preferences); folders CRUD with recursive delete-preview counts, reparent cycle-guard, and DB-level cascade; notes CRUD with summary-list ordering + folder filter; preferences get/patch with enum+delay validation; export service (md raw / html rendered+inline-styles / txt stripped) + filename sanitization. Structured `{detail, code}` errors across the API. Alembic initial migration applies + reverses cleanly; `alembic check` clean. 69 pytest tests pass; real-DB end-to-end (auth→nested folders→cascade→export) verified.
**Agent:** `senior-backend` skill
**Reads:** `docs/ARCHITECTURE.md`, `docs/API_CONTRACTS.md`, `docs/DB_SCHEMA.md`, `docs/ENV_SETUP.md`
**Outputs:**
- All REST API routes implemented per `API_CONTRACTS.md`
- Database schema applied and migrations written
- Auth integrated (local custom JWT access+refresh, bcrypt password hashing — per DEC-001/DEC-017, NOT Supabase)
- Notes and folders CRUD fully functional
- Export endpoints functional (Markdown, HTML, plain text)
- API-level tests for all routes (happy path + error cases)
- `docs/BACKEND_NOTES.md` — any deviations from `API_CONTRACTS.md` logged with reasoning

**Validation gate:**
- [x] All API routes return correct responses per contract. (auth/folders/notes/preferences/export implemented per API_CONTRACTS §3–§6; status codes + `{detail, code}` error shape verified by tests)
- [x] All API tests pass. (`pytest` → 69 passed across auth/folders/notes/preferences/export/health)
- [x] Auth flow works end to end (sign up, sign in, protected routes reject unauthenticated requests). (register→login→me; expired-access→refresh→access restored; every protected route returns 401 without a token)
- [x] No route deviates from `API_CONTRACTS.md` without a logged reason. (all deviations are non-breaking and logged in `docs/BACKEND_NOTES.md`)

---

## Phase 4b — AI Feature Wiring
**Status:** DONE
**Summary:** Integrated Anthropic via the Python SDK behind mockable seams (`ai_service.py`): 7 preset system prompts + 8 action templates + a fixed neutral NotePilot prompt (DEC-014). Wired `/ai/transform`, `/ai/revise`, and `/ai/notepilot` (SSE, silent-fail). Disconnected the frontend from all mocks and connected it to the real backend: new typed API client (`lib/api/endpoints.ts`) with token storage + transparent refresh-on-401 + NotePilot SSE consumer; auth/notes/folders/prefs stores now hydrate + persist via the API; EditorPane runs transform/revise + real autosave PATCH (Error+Retry); MarkdownEditor streams NotePilot ghost text over SSE. Deleted `lib/mock/ai.ts` (data file kept as test fixtures only). Backend: 88 pytest pass (incl. 19 AI). Frontend: 62 vitest pass (incl. real-client SSE + refresh-on-401) + `next build` clean. Live cross-stack smoke confirmed CORS for the frontend origin, the full auth round trip, and graceful `502 ai_error` without a key. `docs/AI_PROMPTS.md` documents every prompt; frontend wiring logged in `docs/FRONTEND_NOTES.md` (Phase 4b section).
**Agent:** `senior-backend` + `senior-fullstack` skills
**Reads:** `docs/SPEC.md`, `docs/REQUIREMENTS.md`, `docs/BACKEND_NOTES.md`, `docs/API_CONTRACTS.md`
**Outputs:**
- Google Gemini API integrated via `google-genai` Python SDK (DEC-018; originally Anthropic)
- All AI behavior presets implemented as system prompts
- NotePilot streaming endpoint implemented (SSE or streaming response)
- Text selection toolbar actions wired to AI endpoints
- Full-document AI transformation wired
- Custom prompt endpoint implemented
- Frontend disconnected from mocks and connected to real API
- Integration tests covering all AI-powered flows
- `docs/AI_PROMPTS.md` — all system prompts and per-action prompt templates documented

**Validation gate:**
- [x] NotePilot ghost text appears and streams correctly in the editor. (backend SSE stream + frontend SSE-parse tests; `MarkdownEditor` onToken→ghost-text wiring; verified token-by-token + silent fail on error/empty)
- [x] All toolbar actions return previewed output correctly. (all 8 actions tested backend-side; EditorPane doc-AI flow → review preview → accept tested)
- [x] AI behavior presets produce observably different outputs. (`test_presets_produce_observably_different_output` — distinct system prompts, distinct outputs for format_only vs meeting_mode)
- [x] All integration tests pass. (backend `pytest` → 88 passed; frontend `vitest run` → 62 passed / 12 files; `next build` clean)
- [x] No AI call fires without user intent (no background calls on idle). (NotePilot only on the explicit idle-trigger; transform/revise only on explicit action; no schedulers/background tasks — NFR-REL-03)

> **Provider migration (DEC-018, post-Phase 4b):** AI provider switched from Anthropic Claude to Google Gemini (`google-genai` SDK, default `gemini-2.5-flash-lite`) with task-routed model selection (`settings.model_for`). Isolated to `ai_service.py` + config/env; prompts, `/ai/*` contract, SSE framing, and frontend unchanged. Locked `ARCHITECTURE.md` Anthropic references updated with explicit user approval.

> AI flows validated against a mocked provider (no `GEMINI_API_KEY` in dev); live model output requires the key (Phase 6 QA / Phase 7). Live HTTP smoke confirmed CORS for `localhost:3000`, the full auth round trip, and graceful `502 ai_error` without a key.

---

## Phase 5 — Code Review
**Status:** DONE
**Summary:** Full-codebase review (`code-reviewer`) → `docs/CODE_REVIEW.md`: 1 Critical, 2 Important, 4 Minor. Critical **C1** = autosave data-loss race (`markSaved` cleared the dirty flag against live content, so edits typed during an in-flight PATCH were skipped by REQ-SAVE-04 and lost) — fixed by recording the persisted snapshot + regression test. Important **I1** = forgeable default `JWT_SECRET` boots silently → added a startup warning (non-fatal; dev/tests unaffected). Important **I2** = parallel-load 401s caused a `/auth/refresh` burst → deduped onto one in-flight refresh + regression test. Minor M3 (stale Anthropic→Gemini refs) fixed; M1/M2/M4 accepted with documented rationale. Backend `pytest` 90 passed; frontend `vitest` 64 passed (+2 new); `next build` clean.
**Agent:** `code-reviewer` skill
**Reads:** Full codebase, all `docs/` outputs
**Outputs:**
- `docs/CODE_REVIEW.md` — findings categorized as: Critical (must fix), Important (should fix), Minor (optional)
- Patched codebase — all Critical and Important findings resolved
- Updated tests where fixes required behavioral changes

**Validation gate:**
- [x] Zero Critical findings remain open. (C1 fixed + regression-tested)
- [x] All tests still pass after patches. (backend `pytest` 90; frontend `vitest` 64 / 12 files; `next build` clean)
- [x] `docs/CODE_REVIEW.md` contains a sign-off confirming all Critical items resolved.

---

## Phase 6 — QA & Polish
**Status:** DONE
**Summary:** Verified all 108 requirement IDs PASS via three layers — automated suites (backend `pytest` 90, frontend `vitest` 67), a live full-stack system test (Playwright drove the real stack against **live Gemini** across 375/768/1280px), and targeted probes (auth 401s, bcrypt-hash read, repo+bundle secret scan, forced save-failure). Found 4 bugs, all fixed: **BUG-01 (High)** the editor wasn't focused on note open (REQ-EDIT-01 — typing required a click first) → `view.focus()` on mount + on note switch, regression test; **BUG-02 (Medium)** the selection toolbar's custom-prompt dialog was mislabeled "entire note" (REQ-CPMT-03) → scope-aware copy, regression test; **BUG-03/04 (Low)** favicon 404 + missing auth `autocomplete` → `app/icon.svg` + `autoComplete` attrs. 0 Critical/High open. Produced `docs/QA_REPORT.md` (per-ID evidence, flow walkthroughs, polish pass) and `docs/QA_SIGNOFF.md`.
**Agent:** `senior-qa` skill
**Reads:** `docs/REQUIREMENTS.md`, `docs/USER_FLOWS.md`, full codebase
**Outputs:**
- Full test run against every requirement ID in `REQUIREMENTS.md` — pass/fail logged (`docs/QA_REPORT.md` §4–§5; all 108 PASS)
- `docs/QA_REPORT.md` — results, bugs found, severity ratings
- All bugs rated Critical or High resolved (1 High — BUG-01 — fixed + regression-tested; 0 Critical found)
- UI polish pass — spacing, alignment, transitions, loading states, empty states, error states (`docs/QA_REPORT.md` §7)
- `docs/QA_SIGNOFF.md` — confirmation that all requirement IDs pass

**Validation gate:**
- [x] All requirement IDs marked passing in `docs/QA_SIGNOFF.md`. (108/108 PASS)
- [x] No Critical or High bugs open. (BUG-01 High fixed + regression-tested; no Critical found)
- [x] App tested at 375px (mobile), 768px (tablet), and 1280px+ (desktop) viewport widths. (Playwright; no broken layout at any width)

---

## Phase 7 — Deployment
**Status:** IN PROGRESS — deploy configs ready; blocked on user (accounts + live deploy + prod smoke test)
**Summary (so far):** Prepared the deploy path for **Vercel (frontend) + Render (backend web service + free managed Postgres)** — the $0, no-credit-card route for a first-time MVP deploy. App is DB-portable: the initial migration uses only generic SQLAlchemy types and is Postgres-compatible (verified no SQLite-only SQL in app code). Added `render.yaml` Blueprint (auto-provisions Postgres + Python web service, wires `DATABASE_URL`, auto-generates `JWT_SECRET`, leaves `GEMINI_API_KEY`/`CORS_ORIGINS` for the dashboard), `backend/start.sh` (`alembic upgrade head` → uvicorn on `$PORT`), `psycopg[binary]` driver, a `DATABASE_URL` normalizer (`postgres://`→`postgresql+psycopg://`), and `frontend/vercel.json`. Verified: backend `pytest` 90 passed (normalizer covers sqlite + both postgres forms); `next build` clean; production bundle scanned — no secrets. `docs/DEPLOYMENT.md` written (full runbook, env reference, redeploy + smoke-test + troubleshooting). **Remaining (user):** create Vercel/Render accounts, get a Gemini key, run the §3–§5 runbook, then we run the §6 production smoke test together.
**Agent:** `senior-fullstack` skill
**Reads:** `docs/ENV_SETUP.md`, `docs/ARCHITECTURE.md`
**Outputs:**
- Frontend deployed to Vercel — _pending user deploy (config + runbook ready: `frontend/vercel.json`, `docs/DEPLOYMENT.md` §4)_
- Backend deployed to Render — _pending user deploy (config + runbook ready: `render.yaml`, `backend/start.sh`, `docs/DEPLOYMENT.md` §3)_
- Environment variables configured for production — _reference + which are auto vs. manual in `docs/DEPLOYMENT.md` §7_
- Production database (Render managed Postgres, free) + JWT secrets — _provisioned by `render.yaml` on Apply; JWT secret auto-generated (per DEC-001/DEC-017, NOT Supabase)_
- [x] `docs/DEPLOYMENT.md` — production URLs (placeholders), env-var reference, redeployment instructions
- Smoke test against production URLs — _pending live URLs (`docs/DEPLOYMENT.md` §6)_

**Validation gate:**
- [ ] App loads and renders correctly at production URL. _(pending user deploy)_
- [ ] Auth, note creation, AI formatting, and export all work in production. _(pending user deploy — smoke test §6)_
- [x] No API keys or secrets present in the codebase or frontend bundle. _(production `.next` bundle scanned — clean; secrets are backend-only env)_

---

## Output Document Index

| Document | Produced In |
|---|---|
| `docs/SPEC.md` | Phase 0 |
| `docs/DECISIONS.md` | Phase 0 |
| `docs/REQUIREMENTS.md` | Phase 1 |
| `docs/USER_FLOWS.md` | Phase 1 |
| `docs/ARCHITECTURE.md` | Phase 2 |
| `docs/API_CONTRACTS.md` | Phase 2 |
| `docs/DB_SCHEMA.md` | Phase 2 |
| `docs/COMPONENT_TREE.md` | Phase 2 |
| `docs/ENV_SETUP.md` | Phase 2 |
| `docs/FRONTEND_NOTES.md` | Phase 3 |
| `docs/BACKEND_NOTES.md` | Phase 4a |
| `docs/AI_PROMPTS.md` | Phase 4b |
| `docs/CODE_REVIEW.md` | Phase 5 |
| `docs/QA_REPORT.md` | Phase 6 |
| `docs/QA_SIGNOFF.md` | Phase 6 |
| `docs/DEPLOYMENT.md` | Phase 7 |
