# REQUIREMENTS.md — SmartNotes AI

Phase 1 output. Derived from `docs/SPEC.md` (source of truth) and `docs/DECISIONS.md`
(DEC-001…DEC-016). **Locked after Phase 1** — do not edit without logging in `docs/DECISIONS.md`
and getting explicit user approval (per CLAUDE.md).

---

## How to read this document

- **ID convention:** area-prefixed. Functional IDs are `REQ-<AREA>-NN`; non-functional are
  `NFR-<AREA>-NN`. IDs are stable; new requirements append within their area.
- **Testability rule:** every requirement states an objective, observable pass condition. No vague
  language ("fast", "should feel", "intuitive"). All timing, count, and size values are exact.
- **Verification column:** how a tester (manual or automated) confirms the requirement passes.
- **DEC refs:** where a requirement implements a Phase 0 decision, the decision ID is cited.

---

## 1. Functional Requirements

### 1.1 Auth & Data Model (`REQ-AUTH`) — SPEC: Auth & Data Model; DEC-001

| ID | Requirement | Verification |
|---|---|---|
| REQ-AUTH-01 | Users register with an email address and a password; there is no anonymous/guest mode. | Registering with email+password creates an account; no app route is reachable without an account. |
| REQ-AUTH-02 | Registration rejects an email that already exists with a distinct, user-readable error (not a 500). | POST register with an existing email returns a 4xx conflict error and a message naming the duplicate-email cause. |
| REQ-AUTH-03 | Passwords are hashed with bcrypt before storage; plaintext passwords are never persisted. | DB user row stores a bcrypt hash (`$2*$` prefix); no column contains the plaintext password. |
| REQ-AUTH-04 | Login issues a JWT access token and a JWT refresh token; invalid credentials return HTTP 401 (not 500). | Valid login returns both tokens; login with wrong password returns HTTP 401. |
| REQ-AUTH-05 | The access token expires; the refresh token issues a new access token without forcing re-login. | After access-token expiry, calling the refresh endpoint with a valid refresh token returns a new access token; protected calls then succeed. |
| REQ-AUTH-06 | Every note, folder, AI, and preference endpoint rejects unauthenticated requests with HTTP 401. | Calling each protected endpoint with no/invalid token returns HTTP 401. |
| REQ-AUTH-07 | All notes, folders, and preferences are scoped to the authenticated user; users cannot read or modify another user's data. | A user requesting another user's note/folder ID receives 401/403/404, never the other user's content. |

### 1.2 Note Capture & Editor (`REQ-EDIT`) — SPEC: Feature 1, Core UX

| ID | Requirement | Verification |
|---|---|---|
| REQ-EDIT-01 | Opening a new note focuses the editor with the cursor ready; no click is required to begin typing. | After "create note", typing immediately produces text without an intervening click. |
| REQ-EDIT-02 | No template, required field, or structural prompt appears before the user can type. | A new note shows an empty editable area only — no modal, form, or placeholder field blocking input. |
| REQ-EDIT-03 | The editor renders Markdown live as typed: headings, bold, italic, lists, code blocks, and blockquotes format in real time without a preview toggle. | Typing `# H`, `**b**`, `*i*`, `- item`, fenced code, and `> quote` each renders its formatted output without toggling a preview. |
| REQ-EDIT-04 | The raw Markdown source remains editable at all times regardless of rendered state. | The user can place the cursor in any rendered region and edit the underlying Markdown syntax. |
| REQ-EDIT-05 | The app presents a single-panel, distraction-free writing area as the primary editing surface. | The editing view is a single writing panel (no mandatory split/preview pane). |

### 1.3 Autosave & Manual Save (`REQ-SAVE`) — SPEC: Autosave; DEC-002

| ID | Requirement | Verification |
|---|---|---|
| REQ-SAVE-01 | A note autosaves exactly 1000ms (debounced) after the last keystroke. | After a keystroke and 1000ms of inactivity, the note is persisted; rapid typing resets the timer (no save mid-burst). |
| REQ-SAVE-02 | Cmd/Ctrl+S triggers an immediate save regardless of the debounce timer. | Pressing Cmd/Ctrl+S persists the current content immediately, before the 1000ms timer elapses. |
| REQ-SAVE-03 | The editor header shows a save indicator with states idle → `Saving…` → `Saved`, or `Error saving` with a retry affordance on failure. | The indicator transitions to `Saving…` during a save and to `Saved` on success; a forced failure shows `Error saving` plus a retry control. |
| REQ-SAVE-04 | No save request fires if the note content is unchanged since the last successful save. | Triggering autosave or Cmd/Ctrl+S with unchanged content issues no network/DB write. |

### 1.4 NotePilot — Inline AI Suggestions (`REQ-NP`) — SPEC: Feature 2; DEC-004, DEC-005, DEC-006, DEC-014, DEC-015

| ID | Requirement | Verification |
|---|---|---|
| REQ-NP-01 | After the configured trigger delay of typing inactivity (default 2000ms), NotePilot requests a suggestion. | Stopping typing for the configured delay initiates exactly one suggestion request. |
| REQ-NP-02 | The context sent to the AI is the full note content from the start up to the current cursor position. | The request payload contains note text from offset 0 to the cursor, not a truncated window. (DEC-005) |
| REQ-NP-03 | A subtle animated loading placeholder (e.g. blinking ellipsis/spinner) appears at the cursor while a suggestion is being fetched. | During the fetch, an animated placeholder is visible at the cursor position. (DEC-006) |
| REQ-NP-04 | A returned suggestion appears as inline ghost text at the cursor in a muted/translucent style visually distinct from user content. | The suggestion renders inline with reduced opacity/muted color, clearly different from typed text. |
| REQ-NP-05 | Pressing Tab accepts the suggestion and inserts it as real editable text. | Tab converts the ghost text into normal note content at the cursor. |
| REQ-NP-06 | Pressing any non-Tab key or continuing to type dismisses the suggestion silently with no side effect. | Any other keypress removes the ghost text and inserts only the key's own character/effect. |
| REQ-NP-07 | If the AI returns an error or empty result, the loading placeholder disappears silently with no error shown. | A forced AI error/empty result removes the placeholder and surfaces no error message. (DEC-006) |
| REQ-NP-08 | After dismissal, a new suggestion may appear following the next full trigger-delay pause. | After dismissing, pausing again for the configured delay produces a new suggestion request. |
| REQ-NP-09 | NotePilot is enabled by default and can be fully disabled from Preferences; disabling stops all suggestions immediately. | A fresh account has NotePilot on; toggling it off in Preferences halts further suggestion requests at once. |
| REQ-NP-10 | The trigger delay is configurable in Preferences over 500–5000ms in 500ms steps; a change takes effect on the next suggestion cycle. | The control offers the 10 discrete values 500…5000; changing it alters the next cycle's delay. (DEC-015) |
| REQ-NP-11 | NotePilot uses a fixed neutral continuation prompt independent of the active AI behavior preset. | Switching presets does not change NotePilot's continuation style. (DEC-014) |

### 1.5 AI Formatting & Structuring Actions (`REQ-AIA`) — SPEC: Feature 3

| ID | Requirement | Verification |
|---|---|---|
| REQ-AIA-01 | All 8 actions exist: Format, Enhance, Summarize, Explain, Simplify, Turn into bullets, Turn into action items, Custom prompt. | Each of the 8 named actions is invocable. |
| REQ-AIA-02 | Every one of the 8 actions is available on both a text selection and the full document. | Each action can be run from the selection toolbar and from the full-document surface. |
| REQ-AIA-03 | A selection action sends only the selected text and, on accept, replaces only that selected region; surrounding text is unchanged. | Running a selection action mutates only the selected span after accept; the rest of the note is byte-identical. |
| REQ-AIA-04 | A full-document action sends the entire note content to the AI. | The full-document request payload equals the complete note text. |
| REQ-AIA-05 | AI output reflects the active behavior preset (e.g. "Format only" reorganizes structure without rewriting wording). | With "Format only" active, output preserves original sentences while adding structure; with "Meeting mode", output contains extracted tasks/decisions. |

### 1.6 Floating Inline Toolbar (`REQ-TBAR`) — SPEC: Feature 4; DEC-007

| ID | Requirement | Verification |
|---|---|---|
| REQ-TBAR-01 | Selecting text shows a compact pill toolbar above the selection, horizontally centered, within one animation frame of mouseup/touch release. | After selecting text, the toolbar appears centered above the selection within ~16ms of release. |
| REQ-TBAR-02 | The toolbar shows exactly 4 default actions — Format, Summarize, Enhance, Custom Prompt — plus a "More" button. | The default toolbar renders those 4 actions and a More control, no others. (DEC-007) |
| REQ-TBAR-03 | Clicking "More" expands the toolbar to reveal all 8 actions from REQ-AIA-01. | After More, all 8 actions are visible/selectable. |
| REQ-TBAR-04 | Clearing the selection hides the toolbar. | Collapsing/clearing the selection removes the toolbar. |
| REQ-TBAR-05 | On mobile, the toolbar appears above the selection and repositions upward so it is not obscured by the on-screen keyboard. | With the mobile keyboard open, the toolbar remains fully visible and does not overlap the keyboard. |

### 1.7 AI Output Review Flow (`REQ-REV`) — SPEC: Feature 5; DEC-008, DEC-009

| ID | Requirement | Verification |
|---|---|---|
| REQ-REV-01 | Every AI action shows its result in a preview panel before any content is modified. | The original text is unchanged at the moment the preview appears. |
| REQ-REV-02 | Accept replaces only the targeted text (selection or full document); all other content is unchanged. | After Accept, only the targeted region differs from the pre-action state. |
| REQ-REV-03 | Reject closes the panel with no modification to any content. | After Reject, the note is byte-identical to its pre-action state. |
| REQ-REV-04 | "Edit suggestion" makes the AI output editable inline within the panel (no separate modal); accepting applies the edited version. | The output becomes editable in-panel; Accept after editing applies the edited text. (DEC-008) |
| REQ-REV-05 | "Ask AI to revise" accepts a follow-up instruction in the panel and produces a new output; revisions are unlimited and each requires explicit submit. | Submitting a follow-up yields a new output; repeating works with no cap; no revision fires without an explicit submit. (DEC-009) |
| REQ-REV-06 | "Copy" copies the AI output to the clipboard without replacing any note content. | After Copy, the clipboard holds the output and the note is unchanged. |
| REQ-REV-07 | A loading state is shown while the AI is processing an initial request or a revision; the original text is never touched until Accept. | The panel shows a loading state during processing; the note stays unchanged until Accept. |
| REQ-REV-08 | Full-document transformations show a side-by-side comparison (original left, AI output right); on mobile this collapses to a tabbed Original/AI Output view. | Desktop shows two columns; at mobile width the same content is a two-tab view. |

### 1.8 Custom AI Prompt — Full Document (`REQ-CPMT`) — SPEC: Feature 6

| ID | Requirement | Verification |
|---|---|---|
| REQ-CPMT-01 | A free-form full-document prompt input is accessible from both the command palette and a dedicated editor-header button. | Both entry points open a custom-prompt input for the whole note. |
| REQ-CPMT-02 | Submitting a custom full-document prompt sends the entire note content plus the instruction to the AI. | The request payload contains the full note text and the user's instruction. |
| REQ-CPMT-03 | The full-document custom prompt is not offered from the text-selection toolbar (which has its own selection-scoped custom prompt). | The selection toolbar's Custom Prompt operates on the selection only; the full-document custom prompt is not present there. |
| REQ-CPMT-04 | The result is shown in the AI Output Review panel (REQ-REV-*) before any content is replaced. | A custom full-document result routes through the review panel; nothing changes until Accept. |

### 1.9 Folders & Notes (`REQ-FLDR`) — SPEC: Feature 7; DEC-010

| ID | Requirement | Verification |
|---|---|---|
| REQ-FLDR-01 | Users can create, rename, move, and delete both folders and notes, and all four operations persist to the database. | Each operation survives a page reload (reflected in DB state). |
| REQ-FLDR-02 | Folders support nesting with no enforced maximum depth at MVP. | A folder can be created inside another folder repeatedly with no depth cap error. |
| REQ-FLDR-03 | The sidebar displays the folder tree and allows navigation between notes. | Clicking a note in the tree opens it in the editor. |
| REQ-FLDR-04 | Deleting a folder shows a confirmation dialog stating how many notes will be deleted before any deletion occurs. | The dialog displays the count of affected notes; no deletion happens until confirmed. (DEC-010) |
| REQ-FLDR-05 | Confirming a folder deletion cascades — the folder, all subfolders, and all contained notes are permanently removed; there is no undo/recycle bin. | After confirm, the folder and every descendant note/subfolder are gone from the DB with no restore path. |
| REQ-FLDR-06 | Notes with no parent folder appear under an "Unfiled" section at the top of the sidebar. | A note created/moved with no folder is listed under Unfiled. |
| REQ-FLDR-07 | Moving a note to a different folder updates its parent reference immediately. | After a move, the note's parent folder ID reflects the new folder right away. |

### 1.10 Themes (`REQ-THEME`) — SPEC: Feature 8; DEC-011

| ID | Requirement | Verification |
|---|---|---|
| REQ-THEME-01 | Two themes are available: DeepTech (dark) and LightDesk (light), both rendering with no broken or unstyled elements. | Both themes can be selected; no element is unstyled in either. |
| REQ-THEME-02 | The editor uses a monospace stack (JetBrains Mono → `ui-monospace, monospace`); UI chrome uses system sans-serif — in both themes. | Computed editor font is the monospace stack; chrome font is system sans-serif, in both themes. (DEC-011) |
| REQ-THEME-03 | Switching themes takes effect immediately with no page reload. | Selecting the other theme restyles the app without a reload. |
| REQ-THEME-04 | The selected theme persists across sessions (close and reopen restores it). | After choosing a theme and reopening the app, the same theme is active. |

### 1.11 FocusPro Mode (`REQ-FOCUS`) — SPEC: Feature 9; DEC-012, DEC-013

| ID | Requirement | Verification |
|---|---|---|
| REQ-FOCUS-01 | Enabling FocusPro bolds the first half of each word (bionic reading) in the rendered editor view. | With FocusPro on, each rendered word shows its leading half in bold. |
| REQ-FOCUS-02 | FocusPro increases line height and paragraph spacing visibly compared to the off state. | Measured line-height/paragraph spacing is larger than in the non-FocusPro state. |
| REQ-FOCUS-03 | Paragraphs of 150 or more words display a subtle inserted spacing divider, changing presentation only — no text content is altered. | A 150+ word paragraph shows divider(s); the underlying text is unchanged. (DEC-013) |
| REQ-FOCUS-04 | FocusPro makes headings and action items more visually prominent and reduces decorative UI within the editor surface. | With FocusPro on, headings/action items are visibly emphasized and editor decoration is reduced. |
| REQ-FOCUS-05 | FocusPro affects only the editor content area; the sidebar, toolbar, command palette, and preferences panel are unaffected. | Toggling FocusPro changes only the editor content; other surfaces are visually unchanged. (DEC-012) |
| REQ-FOCUS-06 | The FocusPro toggle in the editor toolbar and in Preferences are synced (changing one updates the other). | Toggling in either location updates the state shown in the other; a short description appears in both. |

### 1.12 AI Behavior Presets (`REQ-PRESET`) — SPEC: Feature 10; DEC-014

| ID | Requirement | Verification |
|---|---|---|
| REQ-PRESET-01 | Seven presets exist: Format only, Clean up, Enhance, Explain, Summarize, Study mode, Meeting mode. Custom presets are not supported at MVP. | All 7 are selectable; no create-custom-preset affordance exists. |
| REQ-PRESET-02 | The active preset is always visible in the editor header. | The editor header continuously shows the current preset name. |
| REQ-PRESET-03 | The active preset can be changed from the editor header and from Preferences. | Changing it from either location updates the active preset. |
| REQ-PRESET-04 | A preset change takes effect on the next AI action only; it does not re-run previous actions. | After changing the preset, the next action uses it; prior outputs are not regenerated. |
| REQ-PRESET-05 | Presets apply to toolbar actions and full-document AI calls but never to NotePilot. | Preset changes alter action output style but not NotePilot output (see REQ-NP-11). |

### 1.13 Preferences Panel (`REQ-PREF`) — SPEC: Feature 11

| ID | Requirement | Verification |
|---|---|---|
| REQ-PREF-01 | Preferences exposes: theme selection, active AI behavior preset, FocusPro toggle (with description), NotePilot toggle, and NotePilot trigger delay. | All five controls are present in the panel. |
| REQ-PREF-02 | The NotePilot trigger-delay control appears only when NotePilot is enabled. | Disabling NotePilot hides the delay control; enabling it shows it. |
| REQ-PREF-03 | Every preference change takes effect immediately with no page reload. | Each change is reflected in app behavior without a reload. |
| REQ-PREF-04 | All preferences persist to the user's account in the database and are restored on reload. | After changing prefs and reloading, the saved values are restored from the DB. |

### 1.14 Command Palette (`REQ-CMDK`) — SPEC: Command Palette; DEC-003

| ID | Requirement | Verification |
|---|---|---|
| REQ-CMDK-01 | Cmd/Ctrl+K opens the command palette from any view. | The shortcut opens the palette regardless of the current view. |
| REQ-CMDK-02 | Typing filters results in real time using fuzzy matching over note titles. | Partial/fuzzy queries match relevant note titles as the user types. |
| REQ-CMDK-03 | Selecting a note result navigates to that note. | Choosing a note result opens it in the editor. |
| REQ-CMDK-04 | The palette exposes functional shortcuts: create note, create folder, switch theme, toggle FocusPro, trigger full-document AI action, and export current note. | Each listed action runs its function from the palette. |
| REQ-CMDK-05 | Escape, or clicking outside the palette, closes it without taking any action. | Pressing Escape/clicking outside dismisses the palette with no side effect. |

### 1.15 Export (`REQ-EXP`) — SPEC: Feature 12; DEC-016

| ID | Requirement | Verification |
|---|---|---|
| REQ-EXP-01 | A note can be exported as Markdown (`.md`), HTML, or plain text (`.txt`). | All three formats are selectable and produce a downloaded file. |
| REQ-EXP-02 | Export is triggerable from a note-header button and from the command palette. | Both entry points initiate an export. |
| REQ-EXP-03 | Export downloads a file with the correct MIME type and file extension for the chosen format. | The downloaded file's extension and MIME type match the format (`.md`/text/markdown, `.html`/text/html, `.txt`/text/plain). |
| REQ-EXP-04 | Markdown export preserves all raw Markdown syntax. | The `.md` output equals the note's raw Markdown. |
| REQ-EXP-05 | HTML export produces valid HTML with basic inline styles (font-family, line-height, max-width) and correctly rendered headings and lists. | The HTML opens with rendered headings/lists and contains the inline style attributes. |
| REQ-EXP-06 | Plain-text export strips all Markdown syntax. | The `.txt` output contains the note's text with Markdown markers removed. |
| REQ-EXP-07 | Exporting an empty note is allowed and produces a valid empty file with the correct extension (no error). | Exporting an empty note downloads an empty, correctly-named file and raises no error. (DEC-016) |
| REQ-EXP-08 | The exported filename defaults to the note title sanitized for filesystem safety (removing `/ \ : * ? " < > |`), falling back to `untitled` when there is no title. | A titled note exports as its sanitized title; an untitled note exports as `untitled.<ext>`. (DEC-016) |

---

## 2. Non-Functional Requirements

### 2.1 Performance & Timing (`NFR-PERF`)

| ID | Requirement | Verification |
|---|---|---|
| NFR-PERF-01 | Autosave debounce is exactly 1000ms after the last keystroke. | Measured delay between final keystroke and persistence is ~1000ms. (REQ-SAVE-01) |
| NFR-PERF-02 | NotePilot fires after exactly the configured delay (default 2000ms; range 500–5000ms). | Measured idle-to-request delay equals the configured value. (REQ-NP-01/10) |
| NFR-PERF-03 | The selection toolbar appears within one animation frame (~16ms) of mouseup/touch release. | Toolbar render occurs within one frame of the release event. (REQ-TBAR-01) |
| NFR-PERF-04 | Theme, preset, and preference changes apply without a page reload. | No reload occurs on any such change. (REQ-THEME-03, REQ-PREF-03) |

### 2.2 Security (`NFR-SEC`)

| ID | Requirement | Verification |
|---|---|---|
| NFR-SEC-01 | Passwords are stored only as bcrypt hashes. | No plaintext password exists in the DB; stored value is a bcrypt hash. (REQ-AUTH-03) |
| NFR-SEC-02 | Authentication uses JWT access + refresh tokens with access-token expiry and refresh-based renewal. | Tokens are JWTs; expired access tokens are renewable via refresh. (REQ-AUTH-04/05) |
| NFR-SEC-03 | All note, folder, AI, and preference endpoints return HTTP 401 to unauthenticated requests. | Each protected endpoint returns 401 without a valid token. (REQ-AUTH-06) |
| NFR-SEC-04 | No API keys or secrets are present in the frontend bundle or committed to the repository. | A build/bundle and repo scan find no secrets (e.g. Anthropic key). |

### 2.3 Responsiveness & Mobile (`NFR-RESP`)

| ID | Requirement | Verification |
|---|---|---|
| NFR-RESP-01 | The app is usable with no broken layout at 375px (mobile), 768px (tablet), and 1280px+ (desktop) widths. | At each width, all primary surfaces render without overflow/overlap defects. |
| NFR-RESP-02 | Interactive controls meet touch-target sizing for mobile use. | Tap targets on mobile are large enough to activate reliably (no mis-taps in manual test). |
| NFR-RESP-03 | The selection toolbar avoids the on-screen keyboard on mobile by repositioning upward. | With the mobile keyboard open, the toolbar stays visible. (REQ-TBAR-05) |
| NFR-RESP-04 | The full-document review diff collapses from side-by-side to a tabbed view at mobile width. | At mobile width the diff is tabbed Original/AI Output. (REQ-REV-08) |

### 2.4 Persistence (`NFR-PERSIST`)

| ID | Requirement | Verification |
|---|---|---|
| NFR-PERSIST-01 | Notes and folders persist per-user in the backend SQLite database and survive reload. | Created notes/folders are present after reload and re-login. (DEC-001) |
| NFR-PERSIST-02 | Preferences (theme, preset, FocusPro, NotePilot toggle, NotePilot delay) persist per-user and are restored on reload. | After reload, all preference values match what was set. (REQ-PREF-04) |

### 2.5 Reliability & Error Handling (`NFR-REL`)

| ID | Requirement | Verification |
|---|---|---|
| NFR-REL-01 | A failed save surfaces an `Error saving` state with a retry affordance and does not lose the editor's current content. | On a forced save failure, the indicator shows `Error saving` + retry; the in-editor content is intact. (REQ-SAVE-03) |
| NFR-REL-02 | A NotePilot AI failure (error or empty) fails silently with no user-facing error. | A forced NotePilot failure shows no error UI. (REQ-NP-07) |
| NFR-REL-03 | No AI call fires without explicit user intent; idle state produces no AI calls except NotePilot's defined trigger. | Leaving the app idle generates no AI request other than a NotePilot trigger after the configured pause. |

### 2.6 Usability & Accessibility (`NFR-USAB`)

| ID | Requirement | Verification |
|---|---|---|
| NFR-USAB-01 | FocusPro provides readability aids (bionic reading, increased spacing, chunking) scoped to the editor content area. | FocusPro behaviors per REQ-FOCUS-01…05 are present and editor-scoped. |
| NFR-USAB-02 | Interactive elements show visible active/selection/focus states using the theme accent color. | Active/selected/focused controls are visibly distinguished in both themes. |
| NFR-USAB-03 | Destructive folder deletion requires explicit confirmation before any data is removed. | No folder deletion proceeds without the confirmation step. (REQ-FLDR-04) |

---

## 3. Traceability Matrix — Spec coverage → Requirement IDs

Every spec feature and cross-cutting section maps to at least one requirement (validation gate #1).

| Spec section / feature | Requirement IDs |
|---|---|
| Auth & Data Model | REQ-AUTH-01…07; NFR-SEC-01…03; NFR-PERSIST-01 |
| Autosave | REQ-SAVE-01…04; NFR-PERF-01; NFR-REL-01 |
| Command Palette | REQ-CMDK-01…05 |
| Platform (mobile-responsive) | NFR-RESP-01…04 |
| Core User Experience | REQ-EDIT-01…05; REQ-NP-* ; REQ-TBAR-* ; REQ-REV-01 (preview-before-apply) |
| Feature 1 — Fast Raw Note Capture | REQ-EDIT-01…05 |
| Feature 2 — NotePilot | REQ-NP-01…11; NFR-PERF-02; NFR-REL-02 |
| Feature 3 — AI Formatting & Structuring | REQ-AIA-01…05 |
| Feature 4 — Floating Inline Toolbar | REQ-TBAR-01…05; NFR-PERF-03; NFR-RESP-03 |
| Feature 5 — AI Output Review Flow | REQ-REV-01…08; NFR-RESP-04 |
| Feature 6 — Custom AI Prompts (Full Document) | REQ-CPMT-01…04 |
| Feature 7 — Folders & Notes | REQ-FLDR-01…07; NFR-USAB-03; NFR-PERSIST-01 |
| Feature 8 — Themes | REQ-THEME-01…04; NFR-PERF-04 |
| Feature 9 — FocusPro Mode | REQ-FOCUS-01…06; NFR-USAB-01 |
| Feature 10 — AI Behavior Presets | REQ-PRESET-01…05 |
| Feature 11 — Preferences Panel | REQ-PREF-01…04; NFR-PERSIST-02; NFR-PERF-04 |
| Feature 12 — Export | REQ-EXP-01…08 |

---

## 4. Validation Gate Checklist (Phase 1)

- [x] **Every spec feature maps to at least one requirement ID** — see §3 Traceability Matrix; all 12
  features and all 6 cross-cutting sections are covered.
- [x] **Every requirement is testable** — each requirement carries an objective Verification condition;
  all timing/count/size values are exact (1000ms, 2000ms, 500–5000ms/500-step, 150 words,
  375/768/1280px, 4 default actions, 8 actions, 7 presets, 3 export formats); no vague language is used.
