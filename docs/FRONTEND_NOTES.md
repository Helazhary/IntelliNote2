# FRONTEND_NOTES.md — SmartNotes AI (Phase 3)

Phase 3 (`senior-frontend`) output log. Records deviations from the **locked** `COMPONENT_TREE.md`
(per CLAUDE.md, locked docs can't change; non-breaking deviations are logged here). All deviations
below are **non-breaking**: component contracts, mock data shapes, and the routes/stores in
`COMPONENT_TREE.md §1/§4` are honored; mock data shapes match `API_CONTRACTS.md §1` exactly.

Stack as specified: Next.js 14 App Router, React 18, TypeScript, Tailwind, Zustand, TanStack Query,
cmdk, CodeMirror 6 (`@uiw/react-codemirror`). Phase 3 uses **mocked data only** — no real API calls.

---

## 1. Theme palette locked (SPEC Feature 8)

Exact hex values locked in `app/globals.css` (SPEC Feature 8 deferred them to Phase 3):

- **DeepTech (dark):** bg `#161a21`, surface `#1c212b`, panel `#232a36`, accent `#38bdf8`, text `#e6edf3`, muted `#8b97a7`, border `#2c3543`.
- **LightDesk (light):** bg `#faf9f6`, surface `#ffffff`, panel `#f0eee9`, accent `#5b7a99`, text `#2b2b2b`, muted `#7a7a72`, border `#e2ded6`.

Editor font: JetBrains Mono → `ui-monospace, monospace` (DEC-011); UI chrome: system sans. Theme is
applied via `data-theme` on `<html>` and persisted to localStorage (REQ-THEME-04 — DB-backed in 4b).

## 2. `FolderNodeProps` shape refined (non-breaking)

`COMPONENT_TREE §3` sketched `FolderNode` with `{ childFolders, notes, onMove(kind,id,parentId), onRequestDelete }`.
Implemented signature passes `allFolders` + `notes` (node filters its own children for true recursion)
and adds `onCreateNote` / `onCreateSubfolder` for the inline context actions. The `onMove` reparent
behavior (REQ-FLDR-07) is implemented in `notesStore.moveNote` / `moveFolder` and unit-tested, but
**drag-and-drop is not wired as a UI affordance in Phase 3** (no DnD dependency added). Move is
reachable programmatically/by store action; a DnD or move-to-menu UI can be added in QA/polish.

## 3. AI Review sub-components consolidated

`COMPONENT_TREE §2` lists `ReviewLoading`, `DiffView`, `DiffTabs`, `EditableOutput`, `ReviseInput`,
`ReviewActions` as children. They are implemented **inline within `AIReviewPanel`** rather than as
separate files. All behaviors (loading, side-by-side diff desktop / tabbed mobile, in-panel edit,
revise input, action bar) are present and tested (REQ-REV-01..08, NFR-RESP-04).

## 4. Added `lib/store/aiBridge.ts` (not in tree)

A tiny imperative bridge so `CommandPalette` (rendered at the workspace level) can invoke the active
`EditorPane`'s full-document AI action, custom prompt, and export handlers (REQ-CMDK-04) without
prop-drilling through the overlay layer. Set/cleared by the mounted `EditorPane`.

## 5. Added pure helper modules for testability (not in tree)

`lib/editor/{bionic,focuspro,markdown}.ts` and `lib/export/exporters.ts` extract pure logic
(bionic split, 150-word chunking, Markdown detection/strip/HTML, export build + filename sanitize)
out of the CodeMirror/React layers. Reason: CodeMirror 6 does not render reliably in jsdom, so the
spec-critical logic is unit-tested directly. The CM extensions (`components/editor/cm/*`) consume
these helpers.

## 6. Export runs client-side in Phase 3

`lib/export/exporters.ts` builds the `.md` / `.html` / `.txt` file and triggers the browser download
locally (REQ-EXP-*, DEC-016) instead of calling `GET /notes/{id}/export`. Appropriate for the mocked
phase; Phase 4b can switch the same call site to the real endpoint (output shapes already match).

## 7. NotePilot invalid delay snaps instead of rejects

`API_CONTRACTS §6` returns `422` for a `notepilot_delay_ms` outside {500..5000 step 500}. The mocked
client (`prefsStore`) **snaps to the nearest valid step** so the UI can never submit an invalid value
(REQ-NP-10, DEC-015). Non-breaking — the server-side 422 still applies in Phase 4b.

## 8. CommandPalette fuzzy search via cmdk

REQ-CMDK-02 fuzzy match over note titles uses cmdk's built-in filter rather than a custom matcher.

## 9. Auth is mocked (Phase 3)

`login`/`register` validate client-side and store a mock token (`authStore`, persisted). Duplicate
email registration surfaces the contract error (REQ-AUTH-02). Real JWT flow lands in Phase 4a.

---

## Validation gate — status

- **Mock data shapes match `API_CONTRACTS.md`:** ✅ `lib/api/types.ts` is the single source; mock
  data (`lib/mock/data.ts`) and the mock AI layer (`lib/mock/ai.ts`) use those exact shapes.
- **Both themes render with no broken styles:** ✅ tokens locked; theme switch is instant via
  `data-theme` (REQ-THEME-03); verified via build + boot.
- **Interactive elements respond on desktop and mobile:** ✅ responsive via `useIsMobile` + Tailwind
  `md:` breakpoints — sidebar drawer on mobile, review diff → tabs (NFR-RESP-04), toolbar lifts above
  the keyboard (REQ-TBAR-05).
- **All component tests pass:** ✅ `vitest run` → **63 passed** across 12 files. `next build` clean;
  dev server boots (`/`, `/login`, `/register` → 200).

## Test coverage map

| Area | File |
|---|---|
| Bionic / FocusPro chunking / Markdown helpers | `__tests__/lib.editor.test.ts` |
| Export build + filename sanitize (REQ-EXP-*) | `__tests__/lib.export.test.ts` |
| Real API client + NotePilot SSE + refresh-on-401 (Phase 4b) | `__tests__/api.endpoints.test.ts` |
| Stores (folders/prefs/auth/editor) | `__tests__/stores.test.ts` |
| SelectionToolbar (REQ-TBAR-*) | `__tests__/components.toolbar.test.tsx` |
| Header pieces (save/preset/focuspro/doc/export) | `__tests__/components.header.test.tsx` |
| Sidebar + NoteRow + DeleteFolderDialog | `__tests__/components.sidebar.test.tsx` |
| AIReviewPanel (REQ-REV-*) | `__tests__/components.review.test.tsx` |
| Preferences + CustomPrompt (REQ-PREF/CPMT) | `__tests__/components.preferences.test.tsx` |
| CommandPalette (REQ-CMDK-*) | `__tests__/components.palette.test.tsx` |
| AuthForm (REQ-AUTH-*) | `__tests__/components.auth.test.tsx` |
| EditorPane autosave + doc-AI flow (REQ-SAVE/AIA/REV) | `__tests__/components.editorPane.test.tsx` |

---

# Phase 4b — Real API Integration (mocks removed)

The app is now disconnected from mocks and wired to the real backend. `lib/mock/ai.ts` is deleted;
`lib/mock/data.ts` remains **only as a test-fixtures module** (no app code imports it).

## 4b.1 New API client — `lib/api/endpoints.ts`
One typed function per `API_CONTRACTS` route (auth/folders/notes/preferences/ai), plus: token
storage in `localStorage`, a transparent **refresh-on-401** interceptor that retries the original
request once (REQ-AUTH-05), authenticated blob export download, and a **NotePilot SSE consumer** that
parses `event: token` frames and fails silently on error/empty (REQ-NP-07).

## 4b.2 Stores wired to the API
- **authStore** — real JWT: `login`/`register` (register then login for tokens) / `loadSession`
  (restores via `GET /auth/me`) / `logout`. No longer Zustand-persisted; the token store is the
  session authority, so a reload re-validates rather than trusting stale persisted auth.
- **notesStore** — `hydrate()` loads folders + note summaries; `createNote`/`createFolder`/
  `moveNote`/`moveFolder`/`renameFolder`/`deleteNote`/`deleteFolder`/`selectNote` call the API and
  update local state. `renameNote` + `applyNoteUpdate` stay local — the editor autosave PATCH is the
  persistence path (avoids a double write on title edits). `deleteFolder` mirrors the server cascade
  locally for snappy UI.
- **prefsStore** — `hydrate()` from `GET /preferences`; every change is optimistic (instant, no
  reload — NFR-PERF-04) and persisted via `PATCH /preferences`. The localStorage cache only prevents
  a theme flash before hydrate resolves. Invalid delay still snaps client-side (note #7).

## 4b.3 AI wired (EditorPane + MarkdownEditor)
Toolbar/doc actions → `POST /ai/transform`; revise → `POST /ai/revise`; NotePilot → SSE
`POST /ai/notepilot` (note id threaded through `MarkdownEditor`). A transform/revise failure (502)
shows a non-destructive notice in the review panel; the note is never mutated (REQ-REV-01).

## 4b.4 Autosave is a real PATCH
`EditorPane.saveNow` debounces 1000ms then `PATCH /notes/{id}`; on failure it shows `Error saving`
with a working **Retry** (REQ-SAVE-03, NFR-REL-01). Unchanged content still skips the request
(REQ-SAVE-04).

## 4b.5 `deletePreview` stays client-side
Computed from the already-hydrated folder/note tree for an **instant** confirm dialog (REQ-FLDR-04).
The server `GET /folders/{id}/delete-preview` endpoint exists and is tested (Phase 4a) for parity.

## 4b.6 Export stays client-side (carried from note #6)
`handleExport` renders the **live editor content** to `.md/.html/.txt` and downloads locally — this
exports exactly what's on screen (no unsaved-content race) and avoids a round trip. The authenticated
server export endpoint exists in the client (`notesApi.exportNote`) for parity / Phase 7.

## 4b.7 AI verified against a mocked provider
No `GEMINI_API_KEY` is set in dev (provider is Google Gemini per DEC-018), so AI flows are validated against monkeypatched seams (backend
`test_ai.py`) and a stubbed `fetch` (frontend `api.endpoints.test.ts`). Live model output (real ghost
text / transformed content) requires the key — exercised in Phase 6 QA / Phase 7. The live HTTP smoke
confirmed CORS for `localhost:3000`, the full auth round trip, and graceful `502 ai_error` without a
key.

## 4b.8 Validation gate — status
- **NotePilot ghost text streams correctly:** ✅ backend SSE + frontend SSE-parse tests; editor
  onToken→ghost wiring unchanged from the Phase 3 (tested) rendering.
- **All toolbar actions return previewed output:** ✅ 8 actions (backend) + EditorPane doc-AI flow.
- **Presets produce observably different outputs:** ✅ backend `test_presets_produce_observably_different_output`.
- **All integration tests pass:** ✅ frontend `vitest run` → **62 passed / 12 files**; `next build`
  clean. (Backend: **88 passed**.)
- **No AI call without user intent:** ✅ NotePilot only on the explicit idle-trigger; transform/revise
  only on explicit action; no background/idle AI calls (NFR-REL-03).
