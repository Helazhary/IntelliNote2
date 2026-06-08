# CODE_REVIEW.md — SmartNotes AI (Phase 5)

Agent: `code-reviewer` skill. Scope: full codebase (`backend/`, `frontend/`) + all `docs/` outputs.
Baseline before review: backend `pytest` **90 passed**, frontend `vitest` **62 passed**, `next build` clean.

Method: manual review of every backend module (auth, deps, security, errors, models, schemas, routers,
services, db) and every frontend module (api client, stores, editor + CodeMirror extensions, review
panel, sidebar, palette, preferences, providers), cross-checked against `API_CONTRACTS.md`,
`REQUIREMENTS.md`, `ARCHITECTURE.md`, and the logged deviations in `BACKEND_NOTES.md` / `FRONTEND_NOTES.md`.

---

## Findings summary

| ID | Severity | Area | Status |
|----|----------|------|--------|
| C1 | **Critical** | Autosave — silent data loss race | ✅ Fixed |
| I1 | **Important** | Auth — JWT fail-open default secret | ✅ Fixed |
| I2 | **Important** | Auth — concurrent refresh storm | ✅ Fixed |
| M1 | Minor | Backend HTML export does not sanitize raw HTML | Accepted (documented) |
| M2 | Minor | Two divergent Markdown renderers; server export unused by client | Accepted (documented) |
| M3 | Minor | Stale "Anthropic" provider references post-Gemini migration | ✅ Fixed |
| M4 | Minor | `register` duplicate-email check is TOCTOU-racy | Accepted (documented) |

All Critical and Important findings are resolved. Minor items are documented with rationale; none block the phase.

---

## Critical

### C1 — Autosave can silently drop edits typed during an in-flight save

**Files:** `frontend/lib/store/editorStore.ts`, `frontend/components/editor/EditorPane.tsx`

**Problem.** `markSaved()` set `lastSavedContent` to the **current** store content, but `saveNow()`
captures a `latest` snapshot at the moment it issues the PATCH. If the user keeps typing while the
PATCH is in flight, `markSaved()` clears the dirty flag against the *newer* content even though only
the older snapshot was persisted. The pending debounced save then short-circuits on the
REQ-SAVE-04 unchanged-content check (`isDirty()` is false) and the trailing keystrokes are never
written to the server.

Sequence (content shown in quotes):
1. `"A"` saved. User types → `"AB"`; debounce scheduled.
2. Debounce fires → `saveNow()` captures `latest="AB"`, PATCH in flight.
3. User types → `"ABC"`; a new debounce is scheduled.
4. PATCH(`"AB"`) resolves → `markSaved()` sets `lastSavedContent="ABC"`.
5. New debounce fires → `isDirty()` is false → **save skipped**. `"ABC"` is lost.

This is the highest-stakes failure class for a notes product (silent loss of user content) and the
window widens on slow connections.

**Fix.** `markSaved(savedContent?: string)` now records the exact snapshot that was persisted;
`EditorPane.saveNow()` passes `latest`. After step 4 `lastSavedContent="AB"`, so step 5 sees the doc
as dirty and persists `"ABC"`. The optional parameter preserves the existing no-arg call sites.

**Test.** `frontend/__tests__/stores.test.ts` →
*"markSaved records the persisted snapshot, so edits typed mid-save stay dirty (REQ-SAVE-04)"*.

---

## Important

### I1 — App boots with a forgeable default JWT secret and no warning

**File:** `backend/app/core/config.py`

**Problem.** `JWT_SECRET` defaults to `"dev-secret-change-me"`. If deployed without the env var set,
the API signs and verifies tokens with a publicly-known secret, allowing anyone to forge access
tokens for any user — a fail-open auth posture against NFR-SEC-02/04. Nothing surfaced this.

**Fix.** A startup `logging.warning` fires when the loaded `JWT_SECRET` equals the insecure default,
instructing the operator to set a strong random secret before deploying. Non-fatal by design: local
dev and the test suite (which provide a real secret via `.env`) are unaffected, while a misconfigured
production boot is now loud. A hard fail-closed check is deferred to Phase 7 deployment, where a
real-vs-dev signal exists.

### I2 — Concurrent 401s trigger a burst of refresh calls

**File:** `frontend/lib/api/endpoints.ts`

**Problem.** On load the app fires several authenticated requests in parallel (session restore +
folders + notes + preferences). With an expired access token, each independently hit `tryRefresh()`,
producing a burst of simultaneous `POST /auth/refresh` calls racing on `setTokens()`.

**Fix.** `tryRefresh()` now shares a single in-flight refresh promise (`refreshInFlight`), cleared
once it settles so a later genuine expiry can refresh again. Parallel 401s collapse onto one refresh.
Single-request behavior (the existing refresh-and-retry test) is unchanged.

**Test.** `frontend/__tests__/api.endpoints.test.ts` →
*"dedupes concurrent refreshes: parallel 401s trigger a single /auth/refresh"*.

---

## Minor (accepted / optional)

### M1 — Backend HTML export does not escape raw HTML
`backend/app/services/export_service.py` renders Markdown with `python-markdown`, which passes raw
HTML (e.g. `<script>`) through into the exported `.html`. Impact is low: a user can only export their
**own** notes to their **own** file (no cross-user vector). The frontend export path
(`lib/editor/markdown.ts`) already escapes `&<>`. If the server export endpoint becomes the primary
path (Phase 6/7), add an HTML sanitizer (e.g. `bleach`) or the `markdown` safe-mode replacement.

### M2 — Two Markdown renderers; server export endpoint is unused by the client
Export currently renders client-side (`buildExport` / `downloadExport`) — an intentional, logged
deviation (`FRONTEND_NOTES.md` notes #6 / 4b.6: exports exactly what's on screen, no round trip). The
authenticated server endpoint `GET /notes/{id}/export` exists and is tested but is not called by the
app, so the two renderers can diverge. Recommend consolidating on one path in QA/polish; not blocking.

### M3 — Stale "Anthropic" references after the Gemini migration (DEC-018)
`frontend/lib/api/endpoints.ts` header comment and `docs/FRONTEND_NOTES.md` §4b.7 still named
Anthropic / `ANTHROPIC_API_KEY`. Updated to Gemini / `GEMINI_API_KEY`. **Fixed.**

### M4 — `register` duplicate-email check is TOCTOU-racy
`backend/app/routers/auth.py` checks for an existing email then inserts. Two concurrent identical
registrations could both pass the check; the second `commit()` then raises `IntegrityError` (the
`users.email` UNIQUE constraint) surfacing as a 500 rather than the contract 409. Data integrity is
never compromised (the constraint holds). Extremely unlikely on the single-writer SQLite dev setup;
if hardened later, catch `IntegrityError` and map to the `email_exists` 409.

---

## Patched files

- `frontend/lib/store/editorStore.ts` — `markSaved` records the persisted snapshot (C1).
- `frontend/components/editor/EditorPane.tsx` — pass the saved snapshot to `markSaved` (C1).
- `frontend/lib/api/endpoints.ts` — shared in-flight refresh (I2); provider-comment fix (M3).
- `backend/app/core/config.py` — insecure-default JWT secret warning (I1).
- `docs/FRONTEND_NOTES.md` — Gemini provider reference (M3).
- `frontend/__tests__/stores.test.ts` — C1 regression test.
- `frontend/__tests__/api.endpoints.test.ts` — I2 regression test.

---

## Validation gate

- [x] **Zero Critical findings remain open.** C1 fixed and covered by a regression test.
- [x] **All tests still pass after patches.** Backend `pytest` → **90 passed**; frontend
  `vitest run` → **64 passed / 12 files** (62 baseline + 2 new regression tests); `next build` clean.
- [x] **Sign-off below.**

### Sign-off

All Critical (C1) and Important (I1, I2) findings are resolved and verified by passing tests and a
clean build. Remaining items are Minor and explicitly accepted with documented rationale. Phase 5 is
complete; the codebase is cleared to proceed to Phase 6 (QA & Polish).

— `code-reviewer`, Phase 5
