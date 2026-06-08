// Real API client (Phase 4b) — one function per API_CONTRACTS route, plus token storage and a
// transparent refresh-on-401 interceptor (REQ-AUTH-05). The AI provider key (Gemini, DEC-018) never
// reaches here; all AI goes through the backend proxy (NFR-SEC-04). Replaces the Phase 3 mock layer.
import { API_BASE_URL } from "./client";
import type {
  AccessToken,
  ApiError,
  AuthTokens,
  DeletePreview,
  ExportFormat,
  Folder,
  Note,
  NoteSummary,
  NotePilotHandlers,
  Preferences,
  TransformResult,
  User,
} from "./types";

const ACCESS_KEY = "smartnotes.access";
const REFRESH_KEY = "smartnotes.refresh";

let accessToken: string | null = null;
let refreshToken: string | null = null;

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

// Hydrate tokens from localStorage at module load so a reload keeps the session (NFR-PERSIST).
if (hasStorage()) {
  accessToken = window.localStorage.getItem(ACCESS_KEY);
  refreshToken = window.localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh?: string): void {
  accessToken = access;
  if (refresh !== undefined) refreshToken = refresh;
  if (hasStorage()) {
    window.localStorage.setItem(ACCESS_KEY, access);
    if (refresh !== undefined) window.localStorage.setItem(REFRESH_KEY, refresh);
  }
}

export function clearTokens(): void {
  accessToken = null;
  refreshToken = null;
  if (hasStorage()) {
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  }
}

export function getAccessToken(): string | null {
  return accessToken;
}

// Dedupe concurrent refreshes: the app fires several authed requests in parallel on load (session
// restore + folders + notes + prefs), so an expired access token would otherwise trigger a burst of
// /auth/refresh calls racing on setTokens. Share one in-flight refresh; clear it once it settles.
let refreshInFlight: Promise<boolean> | null = null;

function tryRefresh(): Promise<boolean> {
  if (!refreshToken) return Promise.resolve(false);
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (!res.ok) return false;
        const data = (await res.json()) as AccessToken;
        setTokens(data.access_token);
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

interface FetchOpts {
  skipAuth?: boolean; // login/register/refresh: never attach bearer or attempt refresh
}

// Raw fetch with bearer + one transparent refresh-and-retry on 401 (REQ-AUTH-05).
async function rawFetch(path: string, init: RequestInit, opts: FetchOpts = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined) headers.set("Content-Type", "application/json");
  if (!opts.skipAuth && accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (res.status === 401 && !opts.skipAuth && refreshToken) {
    if (await tryRefresh()) {
      const retryHeaders = new Headers(init.headers);
      if (init.body !== undefined) retryHeaders.set("Content-Type", "application/json");
      if (accessToken) retryHeaders.set("Authorization", `Bearer ${accessToken}`);
      return fetch(`${API_BASE_URL}${path}`, { ...init, headers: retryHeaders });
    }
  }
  return res;
}

async function request<T>(path: string, init: RequestInit = {}, opts: FetchOpts = {}): Promise<T> {
  const res = await rawFetch(path, init, opts);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ detail: res.statusText, code: "unknown" }))) as ApiError;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// --- Auth (§3) ---------------------------------------------------------------------------------
export const authApi = {
  register: (email: string, password: string) =>
    request<User>("/auth/register", { method: "POST", body: JSON.stringify({ email, password }) }, { skipAuth: true }),
  login: (email: string, password: string) =>
    request<AuthTokens>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }, { skipAuth: true }),
  me: () => request<User>("/auth/me"),
};

// --- Folders (§4) ------------------------------------------------------------------------------
export const foldersApi = {
  list: () => request<Folder[]>("/folders"),
  create: (name: string, parentId: string | null = null) =>
    request<Folder>("/folders", { method: "POST", body: JSON.stringify({ name, parent_id: parentId }) }),
  update: (id: string, patch: { name?: string; parent_id?: string | null }) =>
    request<Folder>(`/folders/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deletePreview: (id: string) => request<DeletePreview>(`/folders/${id}/delete-preview`),
  remove: (id: string) => request<void>(`/folders/${id}`, { method: "DELETE" }),
};

// --- Notes (§5) --------------------------------------------------------------------------------
export const notesApi = {
  list: (folderId?: string) =>
    request<NoteSummary[]>(`/notes${folderId ? `?folder_id=${encodeURIComponent(folderId)}` : ""}`),
  get: (id: string) => request<Note>(`/notes/${id}`),
  create: (body: { title?: string; content?: string; folder_id?: string | null }) =>
    request<Note>("/notes", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, patch: { title?: string; content?: string; folder_id?: string | null }) =>
    request<Note>(`/notes/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  remove: (id: string) => request<void>(`/notes/${id}`, { method: "DELETE" }),
  // Authenticated download (the bearer can't ride on a plain link), returns blob + filename.
  exportNote: async (id: string, format: ExportFormat): Promise<{ blob: Blob; filename: string }> => {
    const res = await rawFetch(`/notes/${id}/export?format=${format}`, {});
    if (!res.ok) {
      const err = (await res.json().catch(() => ({ detail: res.statusText, code: "unknown" }))) as ApiError;
      throw err;
    }
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const match = /filename="?([^"]+)"?/.exec(disposition);
    return { blob: await res.blob(), filename: match?.[1] ?? `note.${format}` };
  },
};

// --- Preferences (§6) --------------------------------------------------------------------------
export const prefsApi = {
  get: () => request<Preferences>("/preferences"),
  update: (patch: Partial<Omit<Preferences, "user_id" | "updated_at">>) =>
    request<Preferences>("/preferences", { method: "PATCH", body: JSON.stringify(patch) }),
};

// --- AI (§7) -----------------------------------------------------------------------------------
export interface TransformBody {
  note_id: string;
  action: TransformResult["action"];
  scope: TransformResult["scope"];
  text: string;
  preset: Preferences["active_preset"];
  instruction?: string | null;
}

export const aiApi = {
  transform: (body: TransformBody) =>
    request<TransformResult>("/ai/transform", { method: "POST", body: JSON.stringify(body) }),
  revise: (body: { previous_output: string; instruction: string; preset: Preferences["active_preset"] }) =>
    request<{ output: string }>("/ai/revise", { method: "POST", body: JSON.stringify(body) }),

  // Streaming NotePilot continuation over SSE. Returns a cancel fn — calling it aborts the request
  // (typing dismisses the suggestion, REQ-NP-06). Any error/empty result ends in onDone with no
  // tokens (REQ-NP-07, NFR-REL-02) — never a user-facing error.
  notePilotStream: (noteId: string, context: string, handlers: NotePilotHandlers): (() => void) => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await rawFetch("/ai/notepilot", {
          method: "POST",
          body: JSON.stringify({ note_id: noteId, context }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          handlers.onDone();
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let sep: number;
          while ((sep = buffer.indexOf("\n\n")) !== -1) {
            const block = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);
            handleSseBlock(block, handlers);
          }
        }
        handlers.onDone();
      } catch {
        if (!controller.signal.aborted) handlers.onDone(); // silent on error (REQ-NP-07)
      }
    })();
    return () => controller.abort();
  },
};

function handleSseBlock(block: string, handlers: NotePilotHandlers): void {
  let event = "message";
  let data = "";
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data += line.slice(5).trim();
  }
  if (event === "token" && data) {
    try {
      const parsed = JSON.parse(data) as { text?: string };
      if (parsed.text) handlers.onToken(parsed.text);
    } catch {
      /* ignore malformed token frame */
    }
  }
}
