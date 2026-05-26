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

## Core User Experience

The app centers on a single-panel, distraction-free writing area. Users capture raw thoughts as fast as possible — lecture notes, meeting notes, ideas, tasks, brain dumps, research, plans — without any forced structure.

AI assistance is available on demand through two surfaces: an inline floating toolbar triggered by text selection, and NotePilot, an ambient inline suggestion system. All AI-generated changes are previewed before being applied. The user always stays in control; nothing is overwritten without confirmation.

The editor supports live Markdown rendering so the app works as a traditional Markdown editor even without AI features.

---

## Features

### 1. Fast Raw Note Capture

 No forced templates, no required fields, no structural prompts. Users open a note and start typing immediately.

Supported note types include but are not limited to: lecture notes, meeting notes, ideas, plans, study material, task lists, brain dumps, research notes, and project notes.

The editor renders Markdown live, so formatted output appears as the user types standard Markdown syntax.

---

### 2. NotePilot — Inline AI Suggestions

NotePilot is an ambient writing assistant that works like GitHub Copilot for prose and notes.

**Behavior:**
- When the user stops typing for approximately 2 seconds, NotePilot generates a contextually relevant continuation or suggestion.
- The suggestion appears as ghost text directly inline at the cursor position, rendered in a muted, translucent style clearly distinct from the user's own content.
- Pressing **Tab** accepts the suggestion and inserts it as real text.
- Pressing any other key or continuing to type dismisses the suggestion silently.
- If dismissed, a new suggestion can appear after the next 2-second pause.

**Settings:**
- NotePilot is enabled by default.
- Users can disable it entirely from the Preferences panel.
- Users can adjust the trigger delay in Preferences.

---

### 3. AI Formatting and Structuring

Users can trigger AI transformations on selected text or entire notes. The AI can:

- Add headings and sections
- Organize bullet points
- Clean grammar and improve readability
- Improve clarity and flow
- Create summaries and key takeaways
- Extract action items, decisions, and deadlines
- Highlight key ideas
- Add short explanations under complex points
- Convert rough ideas into structured plans

The AI respects the user's selected behavior preset (see Preferences) to determine how aggressively it changes content.

---

### 4. Floating Inline Toolbar — Text Selection Menu

When the user selects any text, a compact floating toolbar appears just above the selection, horizontally centered on it.

**Toolbar design:**
- Small, pill-shaped horizontal bar with icon + label buttons.
- Displays the 4 most common actions by default, with a "More" button that expands to show the full action list.
- Appears immediately on mouseup or touch release.
- Disappears when the selection is cleared.
- On mobile, appears above the selection and avoids being cut off by the keyboard.

**Available actions:**
- Format
- Enhance
- Summarize
- Explain
- Simplify
- Turn into bullets
- Turn into action items
- Custom prompt

**Custom prompt:**
The user can type a free-form instruction for the selected text, e.g. "format this in bullet points and add 3 real-life examples" or "make this sound more professional."

---

### 5. AI Output Review Flow

After any AI action is triggered, the result is shown in a preview panel before being applied.

**User options after preview:**
- Accept — replaces the selected or full text with the AI output.
- Reject — discards the AI output and keeps the original unchanged.
- Edit suggestion — opens the AI output in an editable field before accepting.
- Ask AI to revise — send a follow-up instruction to refine the output.
- Copy — copies the AI output to clipboard without replacing anything.

For full-document transformations, a side-by-side comparison view is available showing the original on the left and the AI output on the right.

The app never overwrites user content without one of the above confirmations being triggered explicitly.

---

### 6. Custom AI Prompts — Full Document

Users can send a free-form instruction that applies to the entire current note, not just a selection.

Example prompts:
- "Restructure and organize in order of chronological topics to study."
- "Extract all tasks and deadlines into a list at the top."
- "Turn this into a formal meeting summary."
- "Simplify this for someone new to the topic."

This is triggered from a button or command palette, not from the text selection toolbar.

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

---

### 8. Themes

Two themes are available at launch.

**DeepTech — Dark**
A deep, low-eye-strain dark theme built for long writing sessions. Background is a dark desaturated navy-charcoal (not pure black). Editor surface is slightly lighter than the background to create subtle depth. Menus and sidebars use a dark slate tone. Accent color is a cool electric blue or cyan used sparingly for active states, selections, and interactive elements. Typography uses a clean monospace or semi-monospace font for the editor, and a sans-serif for UI. Overall mood: focused, modern, technical.

**LightDesk — Light**
A clean, easy-on-the-eyes light theme inspired by Google Docs but softer. Background is a warm off-white (not pure white) to reduce eye strain. Panels, sidebars, and menus use a slightly darker warm gray to provide clear visual separation without harsh contrast. Accent color is a muted blue-gray used for active states and buttons. Typography uses a clean, readable sans-serif throughout. Overall mood: calm, document-like, professional.

---

### 9. FocusPro Mode

FocusPro is an optional display mode designed to improve readability and reduce cognitive friction, particularly for users with ADHD or dyslexia.

*FocusPro makes your notes easier to scan and read by adjusting text rhythm, spacing, and structure — helpful for ADHD and dyslexia.*

**When enabled, FocusPro applies:**
- Bionic reading — the first half of each word is bolded to guide the eye and speed up scanning.
- Increased line height and paragraph spacing to reduce visual crowding.
- Stronger visual separation between sections.
- Long blocks of text are broken into smaller visual chunks automatically.
- Reduced decorative UI elements for a cleaner writing surface.
- Headings and action items are made more visually prominent for easy scanning.

FocusPro is toggled from the Preferences panel and can also be toggled quickly from a persistent button in the editor toolbar. A short description of what it does is shown below the toggle in the UI.

---

### 10. AI Behavior Presets

Users can choose an AI behavior preset that controls how aggressively AI actions change their content.

| Preset | Behavior |
|---|---|
| Format only | Adds structure (headings, bullets, sections) without changing wording or meaning |
| Clean up | Fixes grammar and lightly improves readability |
| Enhance | Improves clarity, flow, and phrasing |
| Explain | Adds short explanations under complex ideas |
| Summarize | Creates concise summaries and key takeaways |
| Study mode | Adds headings, definitions, examples, and review points |
| Meeting mode | Extracts decisions, tasks, deadlines, and owners |

The active preset is shown persistently in the editor UI and can be changed at any time.

---

### 11. Preferences Panel

A clean settings panel accessible from the main navigation.

**Settings include:**
- Theme selection (DeepTech / LightDesk)
- Active AI behavior preset
- FocusPro mode toggle
- NotePilot toggle and trigger delay

---

### 12. Export

Users can export any note in the following formats:

- Markdown (`.md`)
- HTML
- Plain text (`.txt`)

Export is triggered from a button in the note header or from the command palette. Exported Markdown and HTML preserve headings, bullet points, and formatting. HTML export includes basic inline styles for readability.
