// Shared wire types — mirror docs/API_CONTRACTS.md §1. Single source of truth for the API client
// and components (docs/COMPONENT_TREE.md). Phase 3+ import from here.

export type AIAction =
  | "format" | "enhance" | "summarize" | "explain"
  | "simplify" | "bullets" | "action_items" | "custom";

export type AIScope = "selection" | "document";

export type Preset =
  | "format_only" | "clean_up" | "enhance" | "explain"
  | "summarize" | "study_mode" | "meeting_mode";

export type Theme = "deeptech" | "lightdesk";

export type ExportFormat = "md" | "html" | "txt";

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  folder_id: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface NoteSummary {
  id: string;
  title: string;
  folder_id: string | null;
  updated_at: string;
}

export interface Preferences {
  user_id: string;
  theme: Theme;
  active_preset: Preset;
  focuspro_enabled: boolean;
  notepilot_enabled: boolean;
  notepilot_delay_ms: number;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  user: User;
}

// POST /auth/refresh response (API_CONTRACTS §3).
export interface AccessToken {
  access_token: string;
  token_type: "bearer";
}

export interface ApiError {
  detail: string;
  code: string;
}

// Folder delete-preview counts (API_CONTRACTS §4).
export interface DeletePreview {
  folder_id: string;
  note_count: number;
  subfolder_count: number;
}

// /ai/transform response (API_CONTRACTS §7).
export interface TransformResult {
  output: string;
  action: AIAction;
  scope: AIScope;
}

// NotePilot SSE consumer callbacks.
export interface NotePilotHandlers {
  onToken: (text: string) => void;
  onDone: () => void;
}
