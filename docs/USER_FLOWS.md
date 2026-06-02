# USER_FLOWS.md — SmartNotes AI

Phase 1 output. Step-by-step flows for all core scenarios, derived from `docs/SPEC.md` and
`docs/DECISIONS.md`. Each flow lists a precondition, numbered happy-path steps, the expected
result, alternate/error paths, and the requirement IDs it exercises (see `docs/REQUIREMENTS.md`).

---

## UF-1 — Register / Sign in

**Precondition:** User is not authenticated.

1. User opens the app and is presented with sign-in / register (no guest mode).
2. User registers with email + password.
3. Backend hashes the password (bcrypt) and creates the account.
4. User signs in; backend returns a JWT access token + refresh token.
5. App loads the authenticated workspace (sidebar + editor).

**Expected result:** User is authenticated; their notes/folders/preferences load.

**Alternate / error paths:**
- Duplicate email on register → user-readable conflict error, no account created (REQ-AUTH-02).
- Wrong password on login → HTTP 401 with an error message, not a 500 (REQ-AUTH-04).
- Access token expires mid-session → app silently refreshes via the refresh token; no re-login (REQ-AUTH-05).
- Any protected request without a valid token → HTTP 401 (REQ-AUTH-06).

**Exercises:** REQ-AUTH-01…07, NFR-SEC-01…03, NFR-PERSIST-01.

---

## UF-2 — Create note → write raw Markdown → live render → autosave

**Precondition:** User is authenticated.

1. User creates a new note (sidebar "+" or command palette → "Create note").
2. The note opens focused; the cursor is ready — no click needed (REQ-EDIT-01).
3. User types raw Markdown (`# Heading`, `**bold**`, `- item`, fenced code, `> quote`).
4. The editor renders each construct live, while the raw source stays editable (REQ-EDIT-03/04).
5. User pauses typing; after 1000ms the note autosaves; the header indicator shows `Saving…` → `Saved` (REQ-SAVE-01/03).
6. User presses Cmd/Ctrl+S to force an immediate save at any time (REQ-SAVE-02).

**Expected result:** Content is rendered live and persisted; indicator reads `Saved`.

**Alternate / error paths:**
- No content change since last save → no save request fires (REQ-SAVE-04).
- Save fails → indicator shows `Error saving` with retry; editor content is preserved (NFR-REL-01).

**Exercises:** REQ-EDIT-01…05, REQ-SAVE-01…04, NFR-PERF-01, NFR-PERSIST-01.

---

## UF-3 — Write note → full-document AI Format → review → accept  *(pipeline-named)*

**Precondition:** A note has content; an AI behavior preset is active (shown in header).

1. User triggers a full-document AI action (command palette → full-document AI, or the editor-header document-action button) and chooses **Format** (REQ-AIA-02/04).
2. The whole note is sent to the AI using the active preset (REQ-AIA-05).
3. The AI Output Review panel opens showing a side-by-side diff (original left, AI output right); a loading state shows while processing (REQ-REV-07/08).
4. User reviews and clicks **Accept**.
5. The note content is replaced with the AI output; the change autosaves.

**Expected result:** The full note is replaced by the formatted output; original was untouched until Accept.

**Alternate / error paths:**
- **Reject** → panel closes, note unchanged (REQ-REV-03).
- **Edit suggestion** → output becomes editable in-panel; Accept applies the edited version (REQ-REV-04).
- **Ask AI to revise** → user submits a follow-up instruction; a new output is generated; repeatable with no limit (REQ-REV-05).
- **Copy** → output copied to clipboard; note unchanged (REQ-REV-06).
- Mobile width → diff is a tabbed Original/AI Output view (REQ-REV-08, NFR-RESP-04).

**Exercises:** REQ-AIA-01…05, REQ-REV-01…08, REQ-PRESET-04/05.

---

## UF-4 — NotePilot suggestion → accept (Tab)  *(pipeline-named)*

**Precondition:** NotePilot is enabled; user is typing in a note.

1. User stops typing; after the configured delay (default 2000ms) NotePilot requests a suggestion (REQ-NP-01).
2. The full note content up to the cursor is sent as context (REQ-NP-02).
3. A loading placeholder shows at the cursor while fetching (REQ-NP-03).
4. The suggestion appears as muted inline ghost text at the cursor (REQ-NP-04).
5. User presses **Tab**; the ghost text is inserted as real editable text (REQ-NP-05).

**Expected result:** The suggestion becomes part of the note content at the cursor.

**Exercises:** REQ-NP-01…05, NFR-PERF-02.

---

## UF-5 — NotePilot suggestion → reject (keep typing / dismiss)  *(pipeline-named)*

**Precondition:** A NotePilot ghost-text suggestion is visible (per UF-4 steps 1–4).

1. User presses any non-Tab key or continues typing.
2. The ghost text is dismissed silently; only the user's keystroke takes effect (REQ-NP-06).
3. After the next full trigger-delay pause, a new suggestion may appear (REQ-NP-08).

**Expected result:** The suggestion is discarded with no side effect; the user's own input is preserved.

**Alternate / error paths:**
- AI returns an error or empty result → the loading placeholder disappears silently, no error shown (REQ-NP-07, NFR-REL-02).
- NotePilot disabled in Preferences → no suggestions appear at all (REQ-NP-09).

**Exercises:** REQ-NP-06…09, NFR-REL-02.

---

## UF-6 — Select text → floating toolbar action → review  *(pipeline-named)*

**Precondition:** A note has content; user is in the editor.

1. User selects text; within one animation frame a pill toolbar appears centered above the selection (REQ-TBAR-01).
2. The toolbar shows 4 defaults — Format, Summarize, Enhance, Custom Prompt — plus **More** (REQ-TBAR-02).
3. (Optional) User clicks **More** to reveal all 8 actions (REQ-TBAR-03).
4. User picks an action; only the selected text is sent to the AI under the active preset (REQ-AIA-03/05).
5. The AI Output Review panel opens with the result and a loading state (REQ-REV-01/07).
6. User chooses **Accept / Reject / Edit suggestion / Ask AI to revise / Copy** (REQ-REV-02…06).
7. On Accept, only the selected region is replaced; surrounding text is unchanged (REQ-AIA-03, REQ-REV-02).

**Expected result:** Only the selected span is transformed (or nothing changes on Reject/Copy).

**Alternate / error paths:**
- Selection cleared before choosing → toolbar hides (REQ-TBAR-04).
- Mobile → toolbar repositions to avoid the on-screen keyboard (REQ-TBAR-05, NFR-RESP-03).
- Custom Prompt here is selection-scoped only (REQ-CPMT-03).

**Exercises:** REQ-TBAR-01…05, REQ-AIA-01…05, REQ-REV-01…07, NFR-PERF-03.

---

## UF-7 — Custom full-document prompt

**Precondition:** A note has content.

1. User opens the custom full-document prompt from the command palette ("Custom prompt") or the editor-header button (REQ-CPMT-01).
2. User types a free-form instruction (e.g. "Extract all tasks and deadlines into a list at the top").
3. The entire note content plus the instruction is sent to the AI (REQ-CPMT-02).
4. The result appears in the AI Output Review panel (side-by-side / tabbed on mobile) before any replacement (REQ-CPMT-04, REQ-REV-08).
5. User accepts, rejects, edits, revises, or copies as in UF-3.

**Expected result:** The whole-note transformation is previewed and applied only on Accept.

**Exercises:** REQ-CPMT-01…04, REQ-REV-01…08.

---

## UF-8 — Folder creation, rename, move  *(pipeline-named)*

**Precondition:** User is authenticated.

1. User creates a folder (sidebar action or command palette → "Create folder") (REQ-FLDR-01, REQ-CMDK-04).
2. User optionally creates a nested folder inside it — no depth limit (REQ-FLDR-02).
3. User renames a folder or note inline; the change persists (REQ-FLDR-01).
4. User moves a note into a folder; its parent reference updates immediately (REQ-FLDR-07).
5. A note left with no folder appears under "Unfiled" (REQ-FLDR-06).

**Expected result:** The folder tree reflects all changes and persists across reload.

**Exercises:** REQ-FLDR-01…03, REQ-FLDR-06/07, NFR-PERSIST-01.

---

## UF-9 — Folder deletion → cascade confirmation

**Precondition:** A folder exists containing notes and/or subfolders.

1. User triggers delete on a folder.
2. A confirmation dialog appears stating how many notes will be deleted (REQ-FLDR-04, NFR-USAB-03).
3. User confirms.
4. The folder, all subfolders, and all contained notes are permanently deleted (cascade); there is no undo (REQ-FLDR-05).

**Expected result:** The folder and its entire contents are removed from the database.

**Alternate / error paths:**
- User cancels the dialog → nothing is deleted (REQ-FLDR-04).

**Exercises:** REQ-FLDR-04/05, NFR-USAB-03.

---

## UF-10 — Export note (md / html / txt)  *(pipeline-named)*

**Precondition:** A note is open.

1. User triggers export from the note-header button or command palette → "Export" (REQ-EXP-02, REQ-CMDK-04).
2. User selects a format: Markdown, HTML, or plain text (REQ-EXP-01).
3. A file downloads with the correct MIME type and extension (REQ-EXP-03).
   - Markdown preserves raw syntax (REQ-EXP-04).
   - HTML is valid with inline styles and rendered headings/lists (REQ-EXP-05).
   - Plain text strips Markdown syntax (REQ-EXP-06).
4. The filename is the sanitized note title, or `untitled` if there is no title (REQ-EXP-08).

**Expected result:** A correctly-formatted, correctly-named file is downloaded.

**Alternate / error paths:**
- Empty note → a valid empty file with the correct extension downloads; no error (REQ-EXP-07).

**Exercises:** REQ-EXP-01…08.

---

## UF-11 — Command palette

**Precondition:** User is authenticated.

1. User presses Cmd/Ctrl+K from any view; the palette opens (REQ-CMDK-01).
2. User types; results filter in real time via fuzzy matching over note titles (REQ-CMDK-02).
3. User selects a note result → navigates to that note (REQ-CMDK-03); or selects an action — create note, create folder, switch theme, toggle FocusPro, full-document AI, export — which runs (REQ-CMDK-04).
4. User presses Escape or clicks outside → palette closes with no action (REQ-CMDK-05).

**Expected result:** The palette navigates or runs actions, and dismisses cleanly.

**Exercises:** REQ-CMDK-01…05.

---

## UF-12 — Change theme / AI preset / FocusPro / NotePilot via Preferences

**Precondition:** User is authenticated.

1. User opens Preferences from the main navigation (REQ-PREF-01).
2. User switches theme (DeepTech ⇄ LightDesk); it applies immediately, no reload (REQ-THEME-03).
3. User changes the active AI behavior preset; it takes effect on the next AI action only (REQ-PRESET-03/04).
4. User toggles FocusPro; the editor content updates and the editor-toolbar toggle stays in sync (REQ-FOCUS-06).
5. User toggles NotePilot; when enabled, the trigger-delay control appears and can be set 500–5000ms in 500ms steps (REQ-PREF-02, REQ-NP-10).
6. User reloads; all preferences are restored from the database (REQ-PREF-04, NFR-PERSIST-02).

**Expected result:** All preference changes apply instantly and persist across reload.

**Exercises:** REQ-PREF-01…04, REQ-THEME-03/04, REQ-PRESET-03/04, REQ-FOCUS-06, REQ-NP-09/10, NFR-PERSIST-02.
