# QA_REPORT.md — SmartNotes AI

Phase 6 output (`senior-qa`). Full QA pass against every requirement ID in `docs/REQUIREMENTS.md`
and every flow in `docs/USER_FLOWS.md`, plus a UI polish pass. Companion sign-off:
`docs/QA_SIGNOFF.md`.

**Date:** 2026-06-08
**Build under test:** branch `Phase6`, on top of Phase 5 (`58d53ac`).
**Result:** PASS — all 108 requirement IDs verified; 0 Critical/High bugs open.

---

## 1. Test Environment

| Layer | Setup |
|---|---|
| Backend | FastAPI + SQLite (`smartnotes.db`), `uvicorn` on `:8000`, Alembic at head |
| Frontend | Next.js 14 dev server on `:3100` (`:3000` was held by another process) |
| AI provider | **Live** Google Gemini (`gemini-2.5-flash-lite`) — real `GEMINI_API_KEY` present, so AI flows were exercised end-to-end against the model, not a mock |
| Browser | Chromium via Playwright, viewports 375 / 768 / 1280 px |
| Auth | Fresh account `qa-phase6@smartnotes.test` registered live |

### Method
Three complementary layers, so each requirement has at least one objective check:
1. **Automated suites** — backend `pytest` (90) and frontend `vitest` (67), each test tagged with the REQ/NFR IDs it covers.
2. **Live system test** — Playwright drove the real stack (register → write → NotePilot → AI transform → review → folders → export → themes → FocusPro → command palette) across the three viewport widths; selected behaviors asserted via DOM/`getComputedStyle`.
3. **Targeted probes** — `curl` for auth/401, SQLite read for the bcrypt hash, repo+bundle `grep` for secrets, forced-failure `fetch` override for the save-error path.

---

## 2. Test Run Summary

| Suite | Result |
|---|---|
| Backend `pytest` | **90 passed** |
| Frontend `vitest` | **67 passed** (was 64; +3 Phase-6 regression tests) |
| `next build` | **clean** (types + lint pass, 7/7 static pages) |
| Live system test (3 viewports) | **pass** — no broken layout, no console errors beyond those resolved below |
| Secret scan (repo + `.next` bundle) | **clean** — no API key/JWT secret present (NFR-SEC-04) |

---

## 3. Bugs Found & Resolved

Severity scale: **Critical** (data loss / unusable), **High** (a named requirement fails),
**Medium** (misleading/wrong but recoverable), **Low** (cosmetic/polish). Per the Phase 6 gate, all
Critical/High must be closed; Medium/Low fixed opportunistically.

### BUG-01 — Editor not focused on note open (**High**) — REQ-EDIT-01 — FIXED
- **Found:** Opening/creating a note left focus on `<body>`; pressing a key inserted nothing — the user had to click into the editor before typing. Directly violates REQ-EDIT-01 ("no click is required to begin typing"), the headline promise of Feature 1 (Fast Raw Note Capture).
- **Cause:** `MarkdownEditor`'s `onCreateEditor` stored the CodeMirror view but never called `view.focus()`, and nothing re-focused on note switch.
- **Fix:** `components/editor/MarkdownEditor.tsx` — `view.focus()` in `onCreateEditor` (mount) + a `useEffect` on `noteId` that re-focuses on every note switch.
- **Verify:** live — after opening a note, `document.activeElement` is inside `.cm-editor` (`.cm-focused`) and typed keys land with no click. Regression test: `__tests__/components.editorFocus.test.tsx` (focus on mount + on noteId change).

### BUG-02 — Selection custom-prompt dialog mislabeled "entire note" (**Medium**) — REQ-CPMT-03 — FIXED
- **Found:** The floating toolbar's *Custom prompt* opened a dialog titled "Custom prompt — entire note" / `aria-label="…whole document"`, even though it is correctly **selection-scoped** on submit. Misleading: REQ-CPMT-03 requires the selection toolbar's custom prompt to operate on the selection only.
- **Cause:** `CustomPromptInput` had hard-coded document-scoped copy but was reused for both scopes.
- **Fix:** `components/editor/CustomPromptInput.tsx` — new optional `scope` prop drives the heading/`aria-label`/placeholder ("selected text" vs "entire note"); `EditorPane` passes `customPrompt.scope`.
- **Verify:** live — selection prompt's review opens with scope `selection` and replaces only the selected span (the rest byte-identical). Regression test: `__tests__/components.preferences.test.tsx` → "labels the dialog by scope".

### BUG-03 — `favicon.ico` 404 (**Low**, polish) — FIXED
- **Found:** Console logged a 404 for `/favicon.ico` on every page load.
- **Fix:** Added `frontend/app/icon.svg` (App-Router icon convention); Next now emits the icon link and serves `/icon.svg`.

### BUG-04 — Auth inputs missing `autocomplete` (**Low**, usability) — FIXED
- **Found:** Browser DevTools warned the password field lacked an `autocomplete` attribute (hurts password-manager UX).
- **Fix:** `components/auth/AuthForm.tsx` — `autoComplete="email"` on email; `current-password` (login) / `new-password` (register) on password.

> No Critical bugs found. The one High (BUG-01) is fixed and regression-tested. No bugs remain open.

---

## 4. Requirement Verification — Functional

Every ID below was verified PASS. "Method" notes the strongest evidence (A = automated suite,
L = live system test, P = targeted probe).

### Auth & Data Model (REQ-AUTH)
| ID | Status | Method / Evidence |
|---|---|---|
| REQ-AUTH-01 | PASS | L — unauthenticated visit redirects to `/login`; register → workspace. No guest route. |
| REQ-AUTH-02 | PASS | A (`test_auth`, stores/auth) — duplicate email → 409 `email_exists`, readable message. |
| REQ-AUTH-03 | PASS | P — DB row stores `$2b$12$…` bcrypt hash; no plaintext column. |
| REQ-AUTH-04 | PASS | A + L — login returns access+refresh; wrong password → 401. |
| REQ-AUTH-05 | PASS | A (`api.endpoints` refresh-on-401) — expired access auto-refreshes, request retried. |
| REQ-AUTH-06 | PASS | P — `/notes /folders /preferences /ai/transform` all → 401 with no token. |
| REQ-AUTH-07 | PASS | A (`test_auth`, `test_notes`) — cross-user note/folder access denied. |

### Editor (REQ-EDIT)
| ID | Status | Method / Evidence |
|---|---|---|
| REQ-EDIT-01 | PASS *(after BUG-01 fix)* | L — typed keys land in the editor immediately on note open, no click. |
| REQ-EDIT-02 | PASS | L — new note shows only an empty editable surface; no modal/template/required field. |
| REQ-EDIT-03 | PASS | A (`lib.editor`) + L — `#`, `**b**`, `*i*`, `- item`, `> quote` render live while typing. |
| REQ-EDIT-04 | PASS | L — raw Markdown markers stay visible and editable inside rendered regions. |
| REQ-EDIT-05 | PASS | L — single distraction-free panel; no mandatory split/preview pane. |

### Autosave (REQ-SAVE)
| ID | Status | Method / Evidence |
|---|---|---|
| REQ-SAVE-01 | PASS | A (`editorPane`) + L — debounced PATCH ~1000ms after last keystroke; header → `Saved`. |
| REQ-SAVE-02 | PASS | L (code path) — Cmd/Ctrl+S handler forces immediate `saveNow`, bypassing the timer. |
| REQ-SAVE-03 | PASS | A (`SaveIndicator`) + L — idle→`Saving…`→`Saved`; forced failure shows `Error saving` + Retry. |
| REQ-SAVE-04 | PASS | A (`editorStore`) — unchanged content issues no write; mid-save edits stay dirty (Phase-5 C1 guard). |

### NotePilot (REQ-NP)
| ID | Status | Method / Evidence |
|---|---|---|
| REQ-NP-01 | PASS | L — one suggestion request fires after the configured idle delay. |
| REQ-NP-02 | PASS | A (`api.endpoints`) + L — context is doc text from offset 0 to the cursor. |
| REQ-NP-03 | PASS | L — animated loading placeholder shows at the cursor during fetch. |
| REQ-NP-04 | PASS | L — ghost text renders inline, muted gray (`rgb(107,119,138)`, opacity 0.85), distinct from typed text. |
| REQ-NP-05 | PASS | L — Tab converts ghost text into real editable content. |
| REQ-NP-06 | PASS | L — a non-Tab key dismisses the ghost and inserts only that character. |
| REQ-NP-07 | PASS | A (`test_ai`, `api.endpoints`) — error/empty result clears the placeholder silently. |
| REQ-NP-08 | PASS | L — after dismissal, a fresh suggestion appears following the next pause. |
| REQ-NP-09 | PASS | L — disabling NotePilot in Preferences halts suggestions immediately. |
| REQ-NP-10 | PASS | A (`prefsStore`) + L — delay slider min 500 / max 5000 / step 500 (10 values). |
| REQ-NP-11 | PASS | A (`test_ai`) — NotePilot uses the fixed neutral prompt, independent of preset. |

### AI Actions (REQ-AIA)
| ID | Status | Method / Evidence |
|---|---|---|
| REQ-AIA-01 | PASS | A (`test_ai`) — all 8 actions invocable. |
| REQ-AIA-02 | PASS | A (`header`/`toolbar`) + L — all 8 on the doc menu; 4+More→8 on the selection toolbar. |
| REQ-AIA-03 | PASS | L — selection action replaced only the selected span; surrounding text byte-identical. |
| REQ-AIA-04 | PASS | A (`editorPane`) + L — full-document action sends the whole note. |
| REQ-AIA-05 | PASS | A (`test_ai`) + L — "Format only" preserved wording, added structure; presets differ observably. |

### Toolbar (REQ-TBAR)
| ID | Status | Method / Evidence |
|---|---|---|
| REQ-TBAR-01 | PASS | L — pill toolbar appears centered above the selection on release. |
| REQ-TBAR-02 | PASS | A (`toolbar`) + L — exactly Format/Summarize/Enhance/Custom prompt + More. |
| REQ-TBAR-03 | PASS | A (`toolbar`) + L — More reveals all 8 actions. |
| REQ-TBAR-04 | PASS | A (`toolbar`) — clearing the selection hides the toolbar. |
| REQ-TBAR-05 | PASS | A (`toolbar` isMobile path) — mobile toolbar repositions above selection (keyboard-aware). |

### Review Flow (REQ-REV)
| ID | Status | Method / Evidence |
|---|---|---|
| REQ-REV-01 | PASS | A (`test_ai`) + L — output previewed; original untouched until Accept. |
| REQ-REV-02 | PASS | A (`review`) + L — Accept replaces only the targeted region. |
| REQ-REV-03 | PASS | A (`review`) + L — Reject closes panel; note byte-identical. |
| REQ-REV-04 | PASS | A (`review`) — in-panel editable output; Accept applies the edit. |
| REQ-REV-05 | PASS | A (`review`, `test_ai`) — follow-up revise, unlimited, explicit submit. |
| REQ-REV-06 | PASS | A (`review`) — Copy copies output, leaves note unchanged. |
| REQ-REV-07 | PASS | A (`review`) + L — loading state shown; note untouched during processing. |
| REQ-REV-08 | PASS | A (`review`) + L — desktop side-by-side diff; mobile tabbed view. |

### Custom Prompt (REQ-CPMT)
| ID | Status | Method / Evidence |
|---|---|---|
| REQ-CPMT-01 | PASS | A (`CustomPromptInput`) + L — reachable from header button and command palette. |
| REQ-CPMT-02 | PASS | A (`test_ai`) — payload contains full note + instruction. |
| REQ-CPMT-03 | PASS *(after BUG-02 fix)* | A + L — toolbar custom prompt is selection-scoped; dialog copy now matches scope. |
| REQ-CPMT-04 | PASS | L — custom full-doc result routes through the review panel before any replace. |

### Folders (REQ-FLDR)
| ID | Status | Method / Evidence |
|---|---|---|
| REQ-FLDR-01 | PASS | A (`stores`, `test_folders`) + L — create/rename/move/delete persist. |
| REQ-FLDR-02 | PASS | A (`test_folders`) — unlimited nesting depth. |
| REQ-FLDR-03 | PASS | L — sidebar tree; clicking a note opens it. |
| REQ-FLDR-04 | PASS | A (`sidebar`) + L — delete dialog states note count before deleting. |
| REQ-FLDR-05 | PASS | A (`stores`, `test_folders`) + L — confirmed delete cascades; folder gone, no undo. |
| REQ-FLDR-06 | PASS | A (`stores`) + L — no-folder notes appear under "Unfiled". |
| REQ-FLDR-07 | PASS | A (`stores`) — moving a note updates its parent immediately. |

### Themes (REQ-THEME)
| ID | Status | Method / Evidence |
|---|---|---|
| REQ-THEME-01 | PASS | L — both DeepTech and LightDesk render with no broken/unstyled elements. |
| REQ-THEME-02 | PASS | L — editor font = JetBrains Mono stack; chrome = system sans, in both themes. |
| REQ-THEME-03 | PASS | L — theme switch applies instantly (`data-theme`), no reload. |
| REQ-THEME-04 | PASS | L — LightDesk persisted across a full page reload. |

### FocusPro (REQ-FOCUS)
| ID | Status | Method / Evidence |
|---|---|---|
| REQ-FOCUS-01 | PASS | A (`lib.editor` bionic) + L — leading half of each word bolded. |
| REQ-FOCUS-02 | PASS | L — line-height/paragraph spacing visibly increased (≈33px line height). |
| REQ-FOCUS-03 | PASS | A (`lib.editor` dividerOffsets) — 150+ word paragraphs get a spacing divider; text unchanged. |
| REQ-FOCUS-04 | PASS | L — headings/action items emphasized; editor decoration reduced. |
| REQ-FOCUS-05 | PASS | L — bionic spans present only in `.cm-content` (13), none in sidebar/chrome. |
| REQ-FOCUS-06 | PASS | A (`FocusProToggle`) + L — header and Preferences toggles share state; description shown. |

### Presets (REQ-PRESET)
| ID | Status | Method / Evidence |
|---|---|---|
| REQ-PRESET-01 | PASS | A (`test_ai`) + L — 7 presets, no custom-preset affordance. |
| REQ-PRESET-02 | PASS | A (`PresetSelector`) + L — active preset always shown in the header. |
| REQ-PRESET-03 | PASS | L — preset changeable from header and Preferences. |
| REQ-PRESET-04 | PASS | A (`test_ai`) — change applies to the next action only; prior outputs not re-run. |
| REQ-PRESET-05 | PASS | A (`test_ai`) — presets affect actions, never NotePilot. |

### Preferences (REQ-PREF)
| ID | Status | Method / Evidence |
|---|---|---|
| REQ-PREF-01 | PASS | A (`preferences`) + L — theme, preset, FocusPro (+desc), NotePilot, delay all present. |
| REQ-PREF-02 | PASS | A (`preferences`) + L — delay control shown only when NotePilot is enabled. |
| REQ-PREF-03 | PASS | L — every preference change applies without reload. |
| REQ-PREF-04 | PASS | A (`test_preferences`) — prefs persist to DB, restored on reload. |

### Command Palette (REQ-CMDK)
| ID | Status | Method / Evidence |
|---|---|---|
| REQ-CMDK-01 | PASS | L — Cmd/Ctrl+K opens the palette. |
| REQ-CMDK-02 | PASS | A (`palette`) + L — fuzzy filtering over note titles in real time. |
| REQ-CMDK-03 | PASS | A (`palette`) + L — selecting a note navigates to it. |
| REQ-CMDK-04 | PASS | A (`palette`) + L — create note/folder, switch theme, toggle FocusPro, doc AI, export all run. |
| REQ-CMDK-05 | PASS | L — Escape / outside-click closes with no action. |

### Export (REQ-EXP)
| ID | Status | Method / Evidence |
|---|---|---|
| REQ-EXP-01 | PASS | A (`lib.export`, `header`) + L — md/html/txt selectable, file downloads. |
| REQ-EXP-02 | PASS | L — export from header button and command palette. |
| REQ-EXP-03 | PASS | A (`lib.export`) + L — correct extension/MIME per format (`untitled.html` blob produced live). |
| REQ-EXP-04 | PASS | A (`lib.export`, `test_export`) — Markdown preserves raw syntax. |
| REQ-EXP-05 | PASS | A (`lib.export`, `test_export`) — HTML valid with inline styles + rendered headings/lists. |
| REQ-EXP-06 | PASS | A (`lib.export`, `test_export`) — plain text strips Markdown. |
| REQ-EXP-07 | PASS | A (`lib.export`, `test_export`) — empty note exports a valid empty file. |
| REQ-EXP-08 | PASS | A (`lib.export`) + L — sanitized title filename; `untitled` fallback verified live. |

---

## 5. Requirement Verification — Non-Functional

| ID | Status | Method / Evidence |
|---|---|---|
| NFR-PERF-01 | PASS | A (`editorPane`) — autosave debounce 1000ms. |
| NFR-PERF-02 | PASS | A + L — NotePilot fires after the configured delay (default 2000ms; 500–5000 range). |
| NFR-PERF-03 | PASS | L — selection toolbar renders on release (within a frame). |
| NFR-PERF-04 | PASS | L — theme/preset/preference changes apply with no reload. |
| NFR-SEC-01 | PASS | P — passwords stored only as bcrypt hashes. |
| NFR-SEC-02 | PASS | A — JWT access+refresh with expiry + refresh renewal. |
| NFR-SEC-03 | PASS | P — all protected endpoints → 401 unauthenticated. |
| NFR-SEC-04 | PASS | P — no API key/secret in repo (git-ignored `.env`) or `.next` bundle. |
| NFR-PERSIST-01 | PASS | L — notes/folders survive reload + re-login. |
| NFR-PERSIST-02 | PASS | A + L — preferences persist per-user, restored on reload. |
| NFR-REL-01 | PASS | L — forced save failure → `Error saving` + Retry; content preserved; Retry recovers to `Saved`. |
| NFR-REL-02 | PASS | A — NotePilot failure is silent. |
| NFR-REL-03 | PASS | L — no AI call without explicit intent; idle produces only the NotePilot trigger. |
| NFR-RESP-01 | PASS | L — 375 (drawer), 768 (persistent sidebar), 1280 (full) all render with no overflow/overlap. |
| NFR-RESP-02 | PASS | L — touch targets sized for mobile (header/toolbar buttons usable at 375px). |
| NFR-RESP-03 | PASS | A (`toolbar`) — mobile toolbar repositions above the selection (keyboard-aware). |
| NFR-RESP-04 | PASS | A (`review`) + L — review diff collapses to tabs at mobile width. |
| NFR-USAB-01 | PASS | L — FocusPro readability aids scoped to the editor content area. |
| NFR-USAB-02 | PASS | L — active/focus states use the theme accent (`:focus` border-accent on inputs/controls). |
| NFR-USAB-03 | PASS | A (`sidebar`) + L — destructive folder delete requires explicit confirmation. |

---

## 6. User-Flow Walkthroughs (USER_FLOWS.md)

| Flow | Result |
|---|---|
| UF-1 Register / sign in | PASS — register → workspace; unauth redirected; 401 on protected calls. |
| UF-2 Create → write → live render → autosave | PASS — autofocus (BUG-01 fix), live render, `Saved`. |
| UF-3 Full-doc AI Format → review → accept | PASS — live Gemini Format, side-by-side diff, Reject/Accept. |
| UF-4 NotePilot → accept (Tab) | PASS — ghost text streamed; Tab inserts it. |
| UF-5 NotePilot → dismiss | PASS — non-Tab key dismisses; disabled → no suggestions. |
| UF-6 Select → toolbar action → review | PASS — 4+More, selection-scoped replace. |
| UF-7 Custom full-doc prompt | PASS — review panel before replace. |
| UF-8 Folder create / rename / move | PASS — persist; Unfiled for no-folder notes. |
| UF-9 Folder delete → cascade confirm | PASS — count shown, cascade on confirm. |
| UF-10 Export md/html/txt | PASS — correct extension/MIME; untitled fallback. |
| UF-11 Command palette | PASS — open, fuzzy, navigate, actions, dismiss. |
| UF-12 Prefs: theme/preset/FocusPro/NotePilot | PASS — instant apply, persist across reload. |

---

## 7. UI Polish Pass

| Area | Finding |
|---|---|
| Empty states | Present and clear — sidebar "No unfiled notes" / "No folders yet"; main "Select a note… or create a new one" + New note CTA. |
| Loading states | Review panel loading indicator; NotePilot animated cursor placeholder. |
| Error states | Save `Error saving` + Retry; AI failure routes a non-destructive notice through the review panel. |
| Transitions | Instant theme switch via `data-theme`; toolbar appears on selection. |
| Spacing / alignment | Consistent across desktop/tablet; mobile header wraps cleanly; FocusPro spacing scoped to editor. |
| Responsive | Mobile drawer + scrim; tablet keeps persistent sidebar; no horizontal overflow at any width. |
| Polish fixes applied | favicon (BUG-03), input `autocomplete` (BUG-04). |

---

## 8. Residual / Accepted Notes (non-blocking)

- **Selection-match highlight** — CodeMirror highlights other occurrences of a selected word (a green box). Native, cosmetic; not a defect.
- **NotePilot ghost opacity** — 0.85 with a muted gray color; clearly distinct from typed text and within "muted/translucent" (REQ-NP-04). No change needed.
- **`/favicon.ico`** — browsers may still probe the legacy path; the App-Router `icon.svg` is now the served icon and the in-app 404 is resolved.

No open Critical or High bugs. Phase 6 gate met — see `docs/QA_SIGNOFF.md`.
