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
**Status:** NOT STARTED
**Agent:** `senior-backend` skill
**Reads:** `docs/ARCHITECTURE.md`, `docs/API_CONTRACTS.md`, `docs/DB_SCHEMA.md`, `docs/ENV_SETUP.md`
**Outputs:**
- All REST API routes implemented per `API_CONTRACTS.md`
- Database schema applied and migrations written
- Auth integrated (Supabase Auth)
- Notes and folders CRUD fully functional
- Export endpoints functional (Markdown, HTML, plain text)
- API-level tests for all routes (happy path + error cases)
- `docs/BACKEND_NOTES.md` — any deviations from `API_CONTRACTS.md` logged with reasoning

**Validation gate:**
- All API routes return correct responses per contract.
- All API tests pass.
- Auth flow works end to end (sign up, sign in, protected routes reject unauthenticated requests).
- No route deviates from `API_CONTRACTS.md` without a logged reason.

---

## Phase 4b — AI Feature Wiring
**Status:** NOT STARTED
**Agent:** `senior-backend` + `senior-fullstack` skills
**Reads:** `docs/SPEC.md`, `docs/REQUIREMENTS.md`, `docs/BACKEND_NOTES.md`, `docs/API_CONTRACTS.md`
**Outputs:**
- Anthropic API integrated via Python SDK
- All AI behavior presets implemented as system prompts
- NotePilot streaming endpoint implemented (SSE or streaming response)
- Text selection toolbar actions wired to AI endpoints
- Full-document AI transformation wired
- Custom prompt endpoint implemented
- Frontend disconnected from mocks and connected to real API
- Integration tests covering all AI-powered flows
- `docs/AI_PROMPTS.md` — all system prompts and per-action prompt templates documented

**Validation gate:**
- NotePilot ghost text appears and streams correctly in the editor.
- All toolbar actions return previewed output correctly.
- AI behavior presets produce observably different outputs.
- All integration tests pass.
- No AI call fires without user intent (no background calls on idle).

---

## Phase 5 — Code Review
**Status:** NOT STARTED
**Agent:** `code-reviewer` skill
**Reads:** Full codebase, all `docs/` outputs
**Outputs:**
- `docs/CODE_REVIEW.md` — findings categorized as: Critical (must fix), Important (should fix), Minor (optional)
- Patched codebase — all Critical and Important findings resolved
- Updated tests where fixes required behavioral changes

**Validation gate:**
- Zero Critical findings remain open.
- All tests still pass after patches.
- `docs/CODE_REVIEW.md` contains a sign-off confirming all Critical items resolved.

---

## Phase 6 — QA & Polish
**Status:** NOT STARTED
**Agent:** `senior-qa` skill
**Reads:** `docs/REQUIREMENTS.md`, `docs/USER_FLOWS.md`, full codebase
**Outputs:**
- Full test run against every requirement ID in `REQUIREMENTS.md` — pass/fail logged
- `docs/QA_REPORT.md` — results, bugs found, severity ratings
- All bugs rated Critical or High resolved
- UI polish pass — spacing, alignment, transitions, loading states, empty states, error states
- `docs/QA_SIGNOFF.md` — confirmation that all requirement IDs pass

**Validation gate:**
- All requirement IDs marked passing in `docs/QA_SIGNOFF.md`.
- No Critical or High bugs open.
- App tested at 375px (mobile), 768px (tablet), and 1280px+ (desktop) viewport widths.

---

## Phase 7 — Deployment
**Status:** NOT STARTED
**Agent:** `senior-fullstack` skill
**Reads:** `docs/ENV_SETUP.md`, `docs/ARCHITECTURE.md`
**Outputs:**
- Frontend deployed to Vercel
- Backend deployed to Railway or Render
- Environment variables configured for production
- Supabase project configured for production (RLS policies, auth settings)
- `docs/DEPLOYMENT.md` — production URLs, environment variable reference, redeployment instructions
- Smoke test against production URLs confirming core flows work end to end

**Validation gate:**
- App loads and renders correctly at production URL.
- Auth, note creation, AI formatting, and export all work in production.
- No API keys or secrets present in the codebase or frontend bundle.

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
