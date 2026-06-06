# DECISIONS.md — Phase 0 Assumption Log

All entries in this file represent decisions made during the Phase 0 spec review to resolve ambiguities in `docs/SPEC.md`. Each entry records what was decided, why, and what prompted it.

---

## DEC-001: Authentication & Storage — Local SQLite Database

**Decision:** Auth and all data (users, notes, folders, preferences) are stored in a local SQLite database managed by the backend (FastAPI + SQLAlchemy). Authentication uses email + password with bcrypt hashing and JWT tokens (access + refresh). There is no Supabase dependency at MVP.

**Rationale:** Simpler setup; no external service account required; faster local dev iteration; sufficient for MVP scale. The AGENT_LOG originally referenced Supabase Auth — overridden by explicit user decision during Phase 0.

**Source:** User decision during Phase 0 spec lock. AGENT_LOG Phase 4a updated accordingly.

---

## DEC-002: Autosave — 1-Second Debounce

**Decision:** Notes autosave 1 second after the user stops typing (debounced). Cmd/Ctrl+S triggers an immediate save. A save indicator shows `Saving…` / `Saved` / `Error saving` states.

**Rationale:** 1 second is short enough to avoid data loss but long enough to avoid save-on-every-keystroke. The original spec did not mention autosave at all; its absence was a critical gap since it affects both UX and backend write frequency.

**Source:** Phase 0 spec review — autosave not mentioned in original SPEC.md.

---

## DEC-003: Command Palette — Defined as a Feature

**Decision:** A command palette (Cmd/Ctrl+K) is a first-class feature. It supports fuzzy search over note titles and exposes shortcuts for: create note, create folder, switch theme, toggle FocusPro, trigger full-document AI action, and export.

**Rationale:** Features 6 (custom prompt) and 12 (export) both referenced "command palette" without defining it. Without this decision, those features had undefined trigger surfaces.

**Source:** Phase 0 spec review — command palette referenced but never defined.

---

## DEC-004: NotePilot Trigger Delay — Default 2000ms

**Decision:** The default NotePilot trigger delay is 2000ms. The original spec said "approximately 2 seconds" — locked to exactly 2000ms as the default value.

**Rationale:** "Approximately" is not implementable. Exact default required for consistent UX and for the Preferences slider range definition.

**Source:** Phase 0 spec review — "approximately 2 seconds" was vague.

---

## DEC-005: NotePilot Context Window

**Decision:** The context sent to the AI for a NotePilot suggestion is the full note content from the beginning up to the current cursor position.

**Rationale:** Using only partial context (e.g. last N characters) risks losing topic coherence in long notes. Full context up to cursor is the most natural continuation signal.

**Source:** Phase 0 spec review — context window not defined in original SPEC.md.

---

## DEC-006: NotePilot Error & Loading States

**Decision:** If the AI returns an error or empty result, the ghost text loading placeholder disappears silently — no error message is shown to the user. While waiting for a suggestion, a subtle animated placeholder (blinking ellipsis or spinner) is shown at the cursor position.

**Rationale:** NotePilot is ambient and unobtrusive. Surfacing errors for an optional suggestion system would be disruptive. The loading state prevents the editor from appearing frozen.

**Source:** Phase 0 spec review — neither error nor loading state was defined.

---

## DEC-007: Inline Toolbar — Default 4 Actions

**Decision:** The 4 actions shown by default in the inline floating toolbar are: **Format, Summarize, Enhance, Custom Prompt**. The "More" button reveals all 8 actions.

**Rationale:** The spec said "4 most common actions" without naming them. These 4 cover the most frequent use cases: structure (Format), distillation (Summarize), quality (Enhance), and open-ended (Custom Prompt).

**Source:** Phase 0 spec review — specific actions not named in original SPEC.md.

---

## DEC-008: AI Output Review — "Edit Suggestion" Is Inline

**Decision:** The "Edit suggestion" action makes the AI output editable directly within the preview panel. No separate modal is opened. The user edits in-panel and then accepts or rejects the edited version.

**Rationale:** A separate modal adds friction and loses visual context. In-panel editing is consistent with the "preview before apply" principle and avoids context switching.

**Source:** Phase 0 spec review — original spec said "opens the AI output in an editable field" without specifying where.

---

## DEC-009: AI Output Review — Revision Iterations Unlimited

**Decision:** There is no hard limit on how many times a user can ask the AI to revise output. Each revision requires the user to explicitly type and submit a follow-up instruction.

**Rationale:** Capping revisions would add arbitrary friction. Requiring an explicit action per revision prevents accidental loops and keeps the user in control.

**Source:** Phase 0 spec review — no iteration limit or revision UX was defined.

---

## DEC-010: Folder Delete — Cascade with Confirmation

**Decision:** Deleting a folder permanently deletes all notes and subfolders it contains (cascade). A confirmation dialog is shown first, indicating how many notes will be deleted. There is no recycle bin or undo.

**Rationale:** Cascade delete is the simplest behavior that avoids orphaned notes. The confirmation dialog mitigates accidental data loss. No recycle bin at MVP — too complex for the first iteration.

**Source:** Phase 0 spec review — delete behavior was entirely undefined.

---

## DEC-011: Editor & UI Fonts

**Decision:** The editor uses a monospace font stack: JetBrains Mono, falling back to `ui-monospace, monospace`. The UI chrome (sidebar, toolbar, panels) uses the system sans-serif (`ui-sans-serif, system-ui, sans-serif`). Both themes use the same font stacks.

**Rationale:** The original spec said "monospace or semi-monospace font for the editor" — the "or" is ambiguous. JetBrains Mono is free, widely available, and purpose-built for code/technical text editors. System sans-serif for UI avoids loading an additional web font for non-editor surfaces.

**Source:** Phase 0 spec review — "monospace or semi-monospace" was ambiguous; no UI font was specified.

---

## DEC-012: FocusPro — Scope Is Editor Content Area Only

**Decision:** FocusPro applies exclusively to the editor content area. The sidebar, toolbar, command palette, preferences panel, and all other UI surfaces are not affected by FocusPro mode.

**Rationale:** FocusPro is a reading/writing aid, not a full-app redesign. Applying it to navigation or chrome would degrade usability without aiding the focus goal.

**Source:** Phase 0 spec review — scope was undefined in original SPEC.md.

---

## DEC-013: FocusPro — Chunk Threshold 150 Words

**Decision:** FocusPro visually breaks paragraphs of 150 words or more by inserting a spacing divider. No text content is changed; only visual presentation.

**Rationale:** 150 words is approximately 3–5 sentences — long enough that visual chunking aids readability, short enough that shorter paragraphs aren't unnecessarily fragmented.

**Source:** Phase 0 spec review — "smaller visual chunks" was vague with no threshold defined.

---

## DEC-014: AI Behavior Presets — Do Not Affect NotePilot

**Decision:** The active AI behavior preset controls toolbar actions and full-document AI calls only. NotePilot always uses a fixed neutral continuation prompt regardless of the active preset.

**Rationale:** NotePilot is a completion/continuation tool, not a transformation tool. Applying "Meeting mode" or "Summarize" preset to a mid-sentence continuation would produce nonsensical results.

**Source:** Phase 0 spec review — spec did not define whether presets affect NotePilot.

---

## DEC-015: NotePilot Trigger Delay Range — 500ms to 5000ms

**Decision:** The configurable trigger delay range for NotePilot is 500ms to 5000ms, in 500ms increments. Displayed as a slider or step-increment control in Preferences.

**Rationale:** 500ms is the minimum that avoids firing on normal typing pauses. 5000ms is long enough for users who want to type a full paragraph before suggestions appear. 500ms steps give 10 discrete values, which is granular enough without overwhelming the UI.

**Source:** Phase 0 spec review — no range or step size was defined for the delay setting.

---

## DEC-016: Export — Empty Note Allowed; Filename Sanitization

**Decision:** Exporting an empty note is allowed and produces a valid empty file with the correct extension (no error). The exported filename defaults to the note title sanitized for filesystem safety (removing characters like `/`, `\`, `:`, `*`, `?`, `"`, `<`, `>`, `|`), falling back to `untitled` if the note has no title.

**Rationale:** Blocking export of empty notes adds unnecessary friction (e.g. a user may want to export a note they just cleared). Filename sanitization prevents download errors on all operating systems.

**Source:** Phase 0 spec review — empty note export behavior and filename format were undefined.

---

## DEC-017: AGENT_LOG Stale Supabase References Corrected

**Decision:** The Phase 4a and Phase 7 entries in `AGENT_LOG.md` still referenced Supabase ("Auth integrated (Supabase Auth)"; "Supabase project configured for production"). These contradicted the locked decision in DEC-001 (local SQLite + custom JWT/bcrypt, no Supabase) and the locked `ARCHITECTURE.md`. The AGENT_LOG wording was corrected to JWT/local-DB; `ARCHITECTURE.md`, `API_CONTRACTS.md`, and `DB_SCHEMA.md` were already correct and unchanged (they remain locked).

**Rationale:** AGENT_LOG is a non-locked tracker, so the stale instruction text could be fixed directly. Left uncorrected, the Phase 4a backend agent would have been instructed to integrate Supabase, breaking the locked architecture.

**Source:** Found during Phase 3 review. AGENT_LOG is the only file changed; no locked document was modified.

---

## DEC-018: AI Provider — Google Gemini (replaces Anthropic Claude)

**Decision:** The AI provider is migrated from Anthropic Claude (`anthropic` SDK) to Google Gemini (`google-genai` SDK), defaulting to model `gemini-2.5-flash-lite`. Model selection is task-routed: `config.py` exposes `AI_MODEL_DEFAULT` plus optional per-feature overrides (`AI_MODEL_TRANSFORM`, `AI_MODEL_NOTEPILOT`) resolved via `settings.model_for(task)`, so different features can use different models (and the pattern extends to future tasks like diagram generation). The provider remains isolated behind `complete()` / `stream_tokens()` in `ai_service.py`; all prompts, the `/ai/*` API contract, SSE framing, and the frontend are unchanged.

**Rationale:** User decision to switch providers. The task-based model registry supports using different models per feature (e.g. a fast/cheap model for low-latency NotePilot vs. a stronger model for transforms) without further refactoring. Gemini 2.5 thinking is disabled (`thinking_budget=0`) so NotePilot's small 80-token budget is not consumed by reasoning.

**Source:** User decision (post-Phase 4b). This overrides the locked `ARCHITECTURE.md` references to "Anthropic" (lines naming the AI proxy / SDK / Messages API), edited with explicit user approval per CLAUDE.md locked-document rule. The provider-agnostic locked `API_CONTRACTS.md` is unchanged.
