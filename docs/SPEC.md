# App Description: AI-Powered Markdown Note-Taking App

This app is a fast, AI-assisted Markdown note-taking tool designed for students, employees, researchers, and anyone who needs to capture messy thoughts quickly and turn them into clear, structured notes.

The core idea is simple: users should be able to write notes as fast and freely as possible without worrying about formatting, structure, grammar, or organization. The app lets users jot down raw, unstructured notes during lectures, meetings, brainstorming sessions, planning, or personal thinking. AI then instantly restructures, formats, enhances, or summarizes those notes in a clean Markdown preview beside the raw text.

## Core User Experience

The app uses a two-panel writing interface:

- **Left panel:** raw note input  
    The user writes freely here. Notes can be messy, incomplete, unformatted, or stream-of-consciousness.
    
- **Right panel:** AI-formatted Markdown output  
    The AI transforms the raw text into clean, readable Markdown with headings, bullet points, sections, summaries, action items, explanations, or other formatting depending on the user’s preferences.
    

The user can review the AI-formatted version and choose to replace the raw note with the formatted version only when they approve it.

The app should feel fast, minimal, and user-friendly, with a polished interface that makes writing feel effortless.

---

# Main Features

## 1. Fast Raw Note Capture

Users can quickly write down:

- Lecture notes
    
- Meeting notes
    
- Ideas
    
- Plans
    
- Study material
    
- Task lists
    
- Brain dumps
    
- Research notes
    
- Project notes
    

The app should not force structure while the user is writing. The main goal is speed and low friction.

## 2. AI Formatting and Structuring

The AI can transform messy notes into clean Markdown by:

- Adding headings
    
- Creating sections
    
- Organizing bullet points
    
- Cleaning grammar
    
- Improving clarity
    
- Creating summaries
    
- Extracting action items
    
- Highlighting key ideas
    
- Adding small explanations
    
- Converting rough ideas into structured plans
    

The AI should respect the user’s selected preference for how much it is allowed to change the content.

## 3. Split-Screen Raw and Formatted View

The default interface should show:

- Raw editable notes on the left
    
- AI-formatted Markdown preview on the right
    

This allows users to compare their original thoughts with the structured version before accepting any changes.

## 4. Replace Raw Text After Approval

After the AI formats a note, the user can choose to:

- Keep the raw version
    
- Copy the formatted version
    
- Replace the raw text with the formatted version
    
- Apply only selected changes
    

The app should never overwrite user content without confirmation unless auto-formatting is explicitly enabled.


## 5. Text Selection AI Menu

When the user selects text, a small semi-circle or radial popup menu should appear to the right of the selection.

Example options:

- Format
    
- Enhance
    
- Summarize
    
- Explain
    
- Simplify
    
- Turn into bullets
    
- Turn into action items
    
- Custom prompt
    

This should feel lightweight and visually elegant, not intrusive.

## 6. Custom AI Prompts

Users can write custom instructions for:

- Selected text
	- e.g. format this text in bullet points and add 3 real life examples
    
- The entire document
	- e.g. restructure and organize in order of chronological topics to study
    

Example custom prompts:

- “Turn this into a paragraph.”
    
- “Make this sound more professional.”
    
- “Summarize this concisely”
    
- “Extract tasks and deadlines.”
    
- “Explain this like I’m new to the topic.”
    

## 7. AI-Aware Folders and Notes

Users can create folders and notes inside them.

The AI should be aware of relevant notes and folders as context, so it can help with:

- Connecting ideas across notes
    
- Referencing previous notes
    
- Maintaining project context
    
- Understanding class, meeting, or workspace structure
    
- Giving better suggestions based on nearby documents
    

Example structure:

```text
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

## 8. Themes

The app should support multiple visual themes, including:

- DeepTech
    
- Obsidianite
    
- Docs-like plain theme
    
- Notepad theme
    
- Dark mode
    
- More custom themes later
    

Themes should affect the editor, preview, menus, typography, background, accents, and overall mood.

## 9. Preferences Panel

The app should include a clean preferences panel where users can control:

- Theme
    
- AI behavior
    
- Formatting style
    
- Auto-format settings
    
- ADHD mode
    
- Export settings
    
- Default note behavior
    

AI behavior presets could include:

- **Format only:** structure the note without changing meaning or wording
    
- **Clean up:** fix grammar and improve readability lightly
    
- **Enhance:** improve clarity, flow, and wording
    
- **Explain:** add short explanations under complex ideas
    
- **Summarize:** create concise summaries and key takeaways
    
- **Study mode:** create headings, definitions, examples, and review points
    
- **Meeting mode:** extract decisions, tasks, deadlines, and owners
    

## 10. ADHD Mode

The app should include a toggleable ADHD-friendly mode designed to improve focus and readability.

Possible ADHD mode features:

- Highlighting key phrases
    
- Bolding important words or first half of words
    
- Breaking long text into smaller chunks
    
- Increasing spacing
    
- Reducing visual clutter
    
- Using stronger section separation
    
- Adding progress/focus indicators
    
- Supporting distraction-free writing
    
- Making headings and action items easier to scan
    

This mode should be optional and customizable.

## 11. AI Image and Diagram Generation

Users should be able to add images and diagrams inside notes.

Supported options:

- Generate an image using AI
    
- Generate a diagram from selected text
    
- Generate a flowchart or mind map
    
- Import images from the user’s device
    
- Place images anywhere inside the document
    

Example prompts:

- “Create a diagram explaining this process.”
    
- “Turn this into a flowchart.”
    
- “Generate a simple visual summary of this concept.”
    

## 12. Auto-Format Mode

The app should support toggleable auto-formatting.

When enabled:

- The AI formats the whole document after the user stops typing for around 2 seconds.
    
- Reformatting should be more focused on newly written content to make it cohesive with previous but should not keep reformatting the entire document multiple times redundantly
    
- The formatted version appears in the right-side preview.
    
- The raw note should not be overwritten unless the user approves it.
    

When disabled, users can manually format by:

- Selecting text and using the popup menu
    
- Clicking a “Format Document” button
    
- Writing a custom prompt for selected text
    
- Writing a custom prompt for the entire document
    

## 13. Export Options

Users should be able to export notes in multiple formats, including:

- Markdown `.md`
    
- HTML
    
- PDF
    
- Plain text


The exported version should preserve formatting, headings, images, diagrams, and theme-aware styling where appropriate.

---

# Product Vision

The app is not just a Markdown editor. It is a thought-structuring workspace.

Its purpose is to help users capture ideas quickly without slowing down, then use AI to turn those raw ideas into clean, useful, readable notes.

The main value is speed plus structure:

> Write messy. Think freely. Let AI organize it.

The app should feel especially useful for people who take fast notes during live situations, such as lectures or meetings, where there is no time to format properly.

The experience should be:

- Fast
    
- Clean
    
- Friendly
    
- Minimal
    
- AI-assisted
    
- Markdown-first
    
- Context-aware
    
- Easy to export
    
- Helpful for focus and clarity
    

---

# One-Sentence Summary

An AI-powered Markdown note-taking app that lets users write messy raw notes quickly, then instantly transforms them into clean, structured, beautiful Markdown using a split-screen editor, smart AI tools, customizable themes, folders, exports, diagrams, and ADHD-friendly focus features.