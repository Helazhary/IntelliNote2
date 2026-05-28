# Product Spec: AI-Powered Markdown Note-Taking App 
---

## One-Line Summary

An AI-powered Markdown note-taking app that lets users write raw, unstructured notes quickly, then intelligently transforms them into clean, structured Markdown using smart AI tools, customizable themes, folders, and focus-assistance features.

---

## Product Vision

The app is a fast, distraction-free thought-structuring workspace. Users write freely without worrying about formatting, grammar, or organization. AI then restructures, enhances, or summarizes those notes into clean, readable Markdown.

> Write messy. Think freely. Let AI organize it.

The experience must feel fast, minimal, and polished — low friction from first keystroke to finished note.

---

## Platform

Web application. Built mobile-responsive from the start — layouts, touch targets, and interactions must degrade gracefully to smaller screens without requiring a separate codebase or redesign pass later.

---

## Auth & Data Model

Users must register and sign in with an email address and password. There is no anonymous or guest mode. All notes and folders are scoped to the authenticated user and stored in a local SQLite database via the backend (FastAPI + SQLAlchemy). Authentication uses JWT tokens (access + refresh). Passwords are hashed with bcrypt before storage. Protected routes reject unauthenticated requests with HTTP 401.

**Acceptance conditions:**
- Unauthenticated requests to any note/folder/AI endpoint return 401.
- Registration rejects duplicate email addresses with a clear error.
- Login with invalid credentials returns 401, not a 500.
- JWT access token expires; refresh token issues a new access token without re-login.

---

## Autosave

Notes autosave automatically 1 second after the user stops typing (debounced). Explicit manual save is also available via Cmd/Ctrl+S. A save indicator in the editor header shows one of three states: `Saving…`, `Saved`, or `Error saving` (with retry). Autosave does not fire if the note content has not changed since the last save.

**Acceptance conditions:**
- After 1 second of inactivity following a keystroke, the note is persisted to the database.
- Cmd/Ctrl+S triggers an immediate save regardless of the debounce timer.
- Save indicator transitions: idle → `Saving…` → `Saved` (or `Error saving`).
- No redundant save request fires if the note content is unchanged.

---

## Command Palette

A command palette is accessible via Cmd/Ctrl+K from anywhere in the app. It supports fuzzy search across note titles and exposes shortcuts for common actions: create note, create folder, switch theme, toggle FocusPro, trigger full-document AI action, and export current note. It is dismissed by pressing Escape or clicking outside it.

**Acceptance conditions:**
- Cmd/Ctrl+K opens the command palette from any view.
- Typing filters results in real time with fuzzy matching.
- Selecting a note result navigates to that note.
- All listed action shortcuts are functional.
- Escape closes the palette without taking any action.

---

## Core User Experience

The app centers on a single-panel, distraction-free writing area. Users capture raw thoughts as fast as possible — lecture notes, meeting notes, ideas, tasks, brain dumps, research, plans — without any forced structure.

AI assistance is available on demand through two surfaces: an inline floating toolbar triggered by text selection, and NotePilot, an ambient inline suggestion system. All AI-generated changes are previewed before being applied. The user always stays in control; nothing is overwritten without confirmation.

The editor supports live Markdown rendering so the app works as a traditional Markdown editor even without AI features.

---

## Features

### 1. Fast Raw Note Capture

No forced templates, no required fields, no structural prompts. Users open a note and start typing immediately.

Supported note types include but are not limited to: lecture notes, meeting notes, ideas, plans, study material, task lists, brain dumps, research notes, and project notes.

The editor renders Markdown live as the user types — headings, bold, italic, lists, code blocks, and blockquotes are rendered immediately without requiring a preview toggle. The raw Markdown syntax remains editable at all times.

**Acceptance conditions:**
- A new note opens with the cursor focused and ready to type — no click required.
- Typing standard Markdown syntax (e.g. `# Heading`, `**bold**`, `- item`) renders the formatted output in real time.
- Raw Markdown source remains editable regardless of rendered state.
- No template, prompt, or required field appears before the user can type.

---

### 2. NotePilot — Inline AI Suggestions

NotePilot is an ambient writing assistant that works like GitHub Copilot for prose and notes.

**Behavior:**
- When the user stops typing for **2000ms** (the default; configurable in Preferences), NotePilot generates a contextually relevant continuation or suggestion. The context sent to the AI is the full note content up to the current cursor position.
- The suggestion appears as ghost text directly inline at the cursor position, rendered in a muted, translucent style clearly distinct from the user's own content.
- While a suggestion is being fetched, a subtle animated placeholder (e.g. a blinking ellipsis or spinner) is shown at the cursor position so the user knows a suggestion is loading.
- Pressing **Tab** accepts the suggestion and inserts it as real text.
- Pressing any other key or continuing to type dismisses the suggestion silently.
- If the AI returns an error or an empty result, the loading placeholder disappears silently with no error shown to the user.
- If dismissed, a new suggestion can appear after the next 2000ms pause.

**Settings:**
- NotePilot is enabled by default.
- Users can disable it entirely from the Preferences panel.
- Users can adjust the trigger delay in Preferences (range: 500ms–5000ms in 500ms steps).

**Acceptance conditions:**
- After 2000ms of typing inactivity, a ghost text suggestion appears at the cursor (or a loading placeholder appears while the suggestion is being fetched).
- Tab inserts the suggestion; any other keypress dismisses it with no side effect.
- An AI error produces no visible error — the ghost text simply disappears.
- Disabling NotePilot in Preferences stops all suggestions immediately.
- Changing the trigger delay in Preferences takes effect for the next suggestion cycle.

---

### 3. AI Formatting and Structuring

Users can trigger AI transformations on selected text (via the inline toolbar) or on the entire note (via the command palette or a dedicated button). The complete list of available actions is:

- Format (add headings and sections)
- Enhance (improve clarity, flow, and phrasing)
- Summarize (create concise summaries and key takeaways)
- Explain (add short explanations under complex ideas)
- Simplify (reduce complexity for general audiences)
- Turn into bullets
- Turn into action items
- Custom prompt (free-form instruction)

The AI respects the user's active behavior preset (see Feature 10) to determine how aggressively it changes content. The same action list is available both for text selections (via the floating toolbar) and for full-document transformations (via the command palette / document action button). When invoked on a selection, only the selected text is sent to and replaced by the AI. When invoked on the full document, the entire note content is sent.

**Acceptance conditions:**
- Each of the 8 actions is available on both selected text and full document.
- The AI output reflects the active behavior preset (e.g. "Format only" does not change wording).
- Selected-text actions only modify the selected region; surrounding text is unchanged.
- Full-document actions send the entire note to the AI.

---

### 4. Floating Inline Toolbar — Text Selection Menu

When the user selects any text, a compact floating toolbar appears just above the selection, horizontally centered on it.

**Toolbar design:**
- Small, pill-shaped horizontal bar with icon + label buttons.
- Displays **4 default actions**: Format, Summarize, Enhance, Custom Prompt. A "More" button expands to show the full action list (all 8 actions from Feature 3).
- Appears immediately on mouseup or touch release.
- Disappears when the selection is cleared.
- On mobile, appears above the selection and is repositioned if it would be obscured by the on-screen keyboard (shifts upward to remain visible).

**Acceptance conditions:**
- Selecting text causes the toolbar to appear within one animation frame of mouseup/touch release.
- The toolbar shows exactly 4 actions by default (Format, Summarize, Enhance, Custom Prompt) plus a "More" button.
- Clicking "More" reveals all 8 actions in an expanded state.
- Clearing the selection hides the toolbar.
- On mobile, the toolbar does not overlap the on-screen keyboard.

---

### 5. AI Output Review Flow

After any AI action is triggered, the result is shown in a preview panel before being applied.

**User options after preview:**
- **Accept** — replaces the selected or full text with the AI output.
- **Reject** — discards the AI output and keeps the original unchanged.
- **Edit suggestion** — makes the AI output editable inline within the preview panel (no separate modal). The user edits directly in the panel, then accepts or rejects the edited version.
- **Ask AI to revise** — a text input appears in the panel for the user to type a follow-up instruction. The AI generates a new output. There is no hard limit on revision iterations; each revision requires an explicit user action (typing and submitting a follow-up).
- **Copy** — copies the AI output to clipboard without replacing anything.

While the AI is processing (initial request or revision), the preview panel shows a loading state. The original text is never touched until the user explicitly accepts.

For full-document transformations, a side-by-side comparison view is shown: original on the left, AI output on the right. On mobile, this collapses to a tabbed view (Original / AI Output).

**Acceptance conditions:**
- The preview panel appears before any text is modified.
- Accept replaces only the targeted text (selection or full doc); all other content unchanged.
- Reject closes the panel with no modification to any content.
- Edit suggestion makes the output editable in-panel; accepting the edited version applies that edited text.
- Each revision cycle requires the user to type and submit a new instruction.
- Loading state is visible while AI is processing.
- Side-by-side diff is shown for full-document actions; tabbed on mobile.

---

### 6. Custom AI Prompts — Full Document

Users can send a free-form instruction that applies to the entire current note, not just a selection.

Example prompts:
- "Restructure and organize in order of chronological topics to study."
- "Extract all tasks and deadlines into a list at the top."
- "Turn this into a formal meeting summary."
- "Simplify this for someone new to the topic."

This is triggered from the command palette (Cmd/Ctrl+K → "Custom prompt") or from a dedicated button in the editor header. It is not accessible from the text selection toolbar (which has its own custom prompt for selections only).

**Acceptance conditions:**
- A custom prompt input is accessible from both the command palette and the editor header button.
- Submitting a prompt sends the entire note content plus the prompt to the AI.
- The result is shown in the AI Output Review panel (Feature 5) before any content is replaced.

---

### 7. Folders and Notes

Users can organize notes into a nested folder structure.

Example structure:
```
University
  Biology 101
    Lecture 1
    Lecture 2
    Exam Notes

Work
  Project Alpha
    Meeting Notes
    Product Ideas
    Action Items
```

Users can create, rename, move, and delete folders and notes. The sidebar displays the folder tree and allows navigation between notes.

**Delete behavior:** Deleting a folder cascades — all notes and subfolders it contains are permanently deleted. A confirmation dialog is shown before deletion. There is no recycle bin or undo for deletion. There is no enforced maximum nesting depth at MVP.

Notes not placed in any folder are shown in an "Unfiled" section at the top of the sidebar.

**Acceptance conditions:**
- Creating, renaming, moving, and deleting folders and notes all persist to the database.
- Deleting a folder shows a confirmation dialog listing how many notes will be deleted.
- Confirming deletion removes the folder and all its contents from the database.
- Notes with no parent folder appear under "Unfiled" in the sidebar.
- Moving a note to a different folder updates its parent reference immediately.

---

### 8. Themes

Two themes are available at launch.

**DeepTech — Dark**
A deep, low-eye-strain dark theme built for long writing sessions. Background is a dark desaturated navy-charcoal (not pure black). Editor surface is slightly lighter than the background to create subtle depth. Menus and sidebars use a dark slate tone. Accent color is a cool electric blue or cyan used sparingly for active states, selections, and interactive elements. Editor font: monospace (JetBrains Mono, falling back to `ui-monospace, monospace`). UI chrome font: system sans-serif. Overall mood: focused, modern, technical.

**LightDesk — Light**
A clean, easy-on-the-eyes light theme inspired by Google Docs but softer. Background is a warm off-white (not pure white) to reduce eye strain. Panels, sidebars, and menus use a slightly darker warm gray to provide clear visual separation without harsh contrast. Accent color is a muted blue-gray used for active states and buttons. Editor font: monospace (JetBrains Mono, falling back to `ui-monospace, monospace`). UI chrome font: system sans-serif. Overall mood: calm, document-like, professional.

Exact hex color values are defined during Phase 3 and locked in the design token file. Theme selection persists across sessions.

**Acceptance conditions:**
- Both themes render with no broken or unstyled elements.
- The editor uses a monospace font stack in both themes.
- Switching themes takes effect immediately with no page reload.
- The selected theme persists when the user closes and reopens the app.

---

### 9. FocusPro Mode

FocusPro is an optional display mode designed to improve readability and reduce cognitive friction, particularly for users with ADHD or dyslexia. FocusPro applies exclusively to the **editor content area** — it does not affect the sidebar, toolbar, command palette, preferences panel, or any other UI surface.

*FocusPro makes your notes easier to scan and read by adjusting text rhythm, spacing, and structure — helpful for ADHD and dyslexia.*

**When enabled, FocusPro applies:**
- Bionic reading — the first half of each word in the rendered editor view is bolded to guide the eye and speed up scanning.
- Increased line height and paragraph spacing to reduce visual crowding.
- Stronger visual separation between sections.
- Paragraphs of 150 words or more are visually broken into smaller chunks by inserting a subtle spacing divider — no text content is changed, only visual presentation.
- Reduced decorative UI elements within the editor surface for a cleaner writing area.
- Headings and action items are made more visually prominent for easy scanning.

FocusPro is toggled from the Preferences panel and can also be toggled quickly from a persistent button in the editor toolbar. A short description of what it does is shown below the toggle in both locations.

**Acceptance conditions:**
- Enabling FocusPro bolds the first half of each word in the rendered editor view.
- Line height and paragraph spacing increase visibly compared to the non-FocusPro state.
- Paragraphs of 150+ words display a visual break divider.
- FocusPro has no visual effect on the sidebar, toolbar, command palette, or preference panel.
- The FocusPro toggle in the editor toolbar matches the state in the Preferences panel (they are synced).

---

### 10. AI Behavior Presets

Users can choose an AI behavior preset that controls how aggressively AI actions change their content. The active preset applies to all toolbar actions and full-document AI calls. NotePilot uses a fixed neutral continuation prompt regardless of which preset is active.

| Preset | Behavior |
|---|---|
| Format only | Adds structure (headings, bullets, sections) without changing wording or meaning |
| Clean up | Fixes grammar and lightly improves readability |
| Enhance | Improves clarity, flow, and phrasing |
| Explain | Adds short explanations under complex ideas |
| Summarize | Creates concise summaries and key takeaways |
| Study mode | Adds headings, definitions, examples, and review points |
| Meeting mode | Extracts decisions, tasks, deadlines, and owners |

Custom presets are not supported at MVP. The active preset is shown persistently in the editor header and can be changed at any time from the editor header or from the Preferences panel.

**Acceptance conditions:**
- The active preset is always visible in the editor header.
- Changing the preset takes effect on the next AI action (does not re-run previous actions).
- "Format only" produces output that structurally reorganizes content without rewriting sentences.
- "Meeting mode" produces output that includes extracted tasks and decisions.
- NotePilot suggestions are observably the same style regardless of which preset is active.

---

### 11. Preferences Panel

A clean settings panel accessible from the main navigation.

**Settings include:**
- Theme selection (DeepTech / LightDesk)
- Active AI behavior preset
- FocusPro mode toggle (with short description)
- NotePilot toggle
- NotePilot trigger delay (range: 500ms–5000ms, in 500ms increments; shown as a slider or dropdown)

All preferences persist to the user's account in the database.

**Acceptance conditions:**
- All preference changes take effect immediately with no page reload required.
- Preferences survive a page reload and are restored from the database.
- The NotePilot trigger delay control only appears when NotePilot is enabled.
- FocusPro toggle state in Preferences matches the toggle in the editor toolbar.

---

### 12. Export

Users can export any note in the following formats:

- Markdown (`.md`)
- HTML
- Plain text (`.txt`)

Export is triggered from a button in the note header or from the command palette. Exported Markdown and HTML preserve headings, bullet points, and formatting. HTML export includes basic inline styles for readability (font-family, line-height, max-width). Exporting an empty note is allowed and produces an empty file with the correct extension. The exported filename defaults to the note title (sanitized for filesystem safety), falling back to `untitled` if the note has no title.

**Acceptance conditions:**
- Triggering export downloads a file to the user's browser with the correct MIME type and extension.
- Markdown export preserves all raw Markdown syntax.
- HTML export produces valid HTML with inline styles and correct rendering of headings and lists.
- Plain text export strips all Markdown syntax.
- Exporting an empty note produces a valid empty file (no error).
- The downloaded filename matches the note title (sanitized) or `untitled`.
