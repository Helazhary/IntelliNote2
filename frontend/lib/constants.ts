// UI label constants for the typed enums in API_CONTRACTS §1. Centralized so the toolbar,
// document-action menu, command palette, and preferences all show identical labels.
import type { AIAction, ExportFormat, Preset, Theme } from "@/lib/api/types";

export const AI_ACTIONS: { value: AIAction; label: string }[] = [
  { value: "format", label: "Format" },
  { value: "enhance", label: "Enhance" },
  { value: "summarize", label: "Summarize" },
  { value: "explain", label: "Explain" },
  { value: "simplify", label: "Simplify" },
  { value: "bullets", label: "Turn into bullets" },
  { value: "action_items", label: "Turn into action items" },
  { value: "custom", label: "Custom prompt" },
];

// Default 4 actions in the selection toolbar (DEC-007); order matters.
export const DEFAULT_TOOLBAR_ACTIONS: AIAction[] = ["format", "summarize", "enhance", "custom"];

export const PRESETS: { value: Preset; label: string; description: string }[] = [
  { value: "format_only", label: "Format only", description: "Adds structure without changing wording or meaning" },
  { value: "clean_up", label: "Clean up", description: "Fixes grammar and lightly improves readability" },
  { value: "enhance", label: "Enhance", description: "Improves clarity, flow, and phrasing" },
  { value: "explain", label: "Explain", description: "Adds short explanations under complex ideas" },
  { value: "summarize", label: "Summarize", description: "Creates concise summaries and key takeaways" },
  { value: "study_mode", label: "Study mode", description: "Adds headings, definitions, examples, and review points" },
  { value: "meeting_mode", label: "Meeting mode", description: "Extracts decisions, tasks, deadlines, and owners" },
];

export const THEMES: { value: Theme; label: string }[] = [
  { value: "deeptech", label: "DeepTech (Dark)" },
  { value: "lightdesk", label: "LightDesk (Light)" },
  { value: "obsidianite", label: "Obsidianite (Blue)" },
  { value: "obsidianite-violet", label: "Obsidianite (Violet)" },
];

export const EXPORT_FORMATS: { value: ExportFormat; label: string; ext: string }[] = [
  { value: "md", label: "Markdown", ext: ".md" },
  { value: "html", label: "HTML", ext: ".html" },
  { value: "txt", label: "Plain text", ext: ".txt" },
];

export function actionLabel(action: AIAction): string {
  return AI_ACTIONS.find((a) => a.value === action)?.label ?? action;
}

export function presetLabel(preset: Preset): string {
  return PRESETS.find((p) => p.value === preset)?.label ?? preset;
}
