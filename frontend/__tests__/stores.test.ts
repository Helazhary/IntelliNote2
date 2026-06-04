import { beforeEach, describe, expect, it, vi } from "vitest";

// Stub the real API client — the stores now call it; tests assert wiring + local state, not the network.
vi.mock("@/lib/api/endpoints", () => ({
  authApi: { login: vi.fn(), register: vi.fn(), me: vi.fn() },
  foldersApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), deletePreview: vi.fn(), remove: vi.fn() },
  notesApi: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  prefsApi: { get: vi.fn(), update: vi.fn() },
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
  getAccessToken: vi.fn(),
}));

import { useNotesStore } from "@/lib/store/notesStore";
import { usePrefsStore, NOTEPILOT_DELAY_VALUES } from "@/lib/store/prefsStore";
import { useAuthStore } from "@/lib/store/authStore";
import { useEditorStore } from "@/lib/store/editorStore";
import { authApi, foldersApi, notesApi, prefsApi } from "@/lib/api/endpoints";
import { MOCK_FOLDERS, MOCK_NOTES, MOCK_PREFERENCES, toSummary } from "@/lib/mock/data";
import type { Folder, Note } from "@/lib/api/types";

const m = vi.mocked;
let seq = 0;

function resetNotes() {
  useNotesStore.setState({
    folders: [...MOCK_FOLDERS],
    noteSummaries: MOCK_NOTES.map(toSummary),
    notesById: Object.fromEntries(MOCK_NOTES.map((n) => [n.id, n])),
    activeNoteId: null,
    activeNote: null,
    loaded: true,
  });
  // Default fakes: create echoes the body with a fresh id; update/remove resolve.
  m(notesApi.create).mockImplementation(async (body) => ({
    id: `new-${++seq}`,
    title: body.title ?? "",
    content: body.content ?? "",
    folder_id: body.folder_id ?? null,
    user_id: "u1",
    created_at: "",
    updated_at: "",
  } as Note));
  m(notesApi.update).mockImplementation(async (id, patch) => ({ id, ...patch } as Note));
  m(notesApi.remove).mockResolvedValue(undefined as unknown as void);
  m(foldersApi.create).mockImplementation(async (name, parentId = null) => ({
    id: `nf-${++seq}`,
    name,
    parent_id: parentId,
    user_id: "u1",
    created_at: "",
    updated_at: "",
  } as Folder));
  m(foldersApi.update).mockResolvedValue({} as Folder);
  m(foldersApi.remove).mockResolvedValue(undefined as unknown as void);
}

describe("notesStore (REQ-FLDR-*)", () => {
  beforeEach(resetNotes);

  it("creates notes in Unfiled (folder_id=null) and persists via the API (REQ-FLDR-06)", async () => {
    const id = await useNotesStore.getState().createNote(null);
    expect(notesApi.create).toHaveBeenCalledWith({ folder_id: null });
    expect(id).not.toBeNull();
    expect(useNotesStore.getState().notesById[id!].folder_id).toBeNull();
    expect(useNotesStore.getState().activeNoteId).toBe(id);
  });

  it("delete preview counts descendant notes + subfolders locally (REQ-FLDR-04)", () => {
    // University > Biology 101 has 3 notes; 1 subfolder.
    const preview = useNotesStore.getState().deletePreview("f-university");
    expect(preview.subfolder_count).toBe(1);
    expect(preview.note_count).toBe(3);
  });

  it("cascade delete removes folder, subfolders, and contained notes (REQ-FLDR-05)", async () => {
    await useNotesStore.getState().deleteFolder("f-university");
    expect(foldersApi.remove).toHaveBeenCalledWith("f-university");
    const s = useNotesStore.getState();
    expect(s.folders.find((f) => f.id === "f-biology")).toBeUndefined();
    expect(s.noteSummaries.find((n) => n.id === "n-lecture1")).toBeUndefined();
  });

  it("moves a note to a new folder (REQ-FLDR-07)", async () => {
    await useNotesStore.getState().moveNote("n-scratch", "f-work");
    expect(notesApi.update).toHaveBeenCalledWith("n-scratch", { folder_id: "f-work" });
    expect(useNotesStore.getState().notesById["n-scratch"].folder_id).toBe("f-work");
  });

  it("renames a folder via the API", async () => {
    await useNotesStore.getState().renameFolder("f-work", "Job");
    expect(foldersApi.update).toHaveBeenCalledWith("f-work", { name: "Job" });
    expect(useNotesStore.getState().folders.find((f) => f.id === "f-work")!.name).toBe("Job");
  });
});

describe("prefsStore (REQ-PREF-*, REQ-NP-10)", () => {
  beforeEach(() => {
    usePrefsStore.setState({ prefs: { ...MOCK_PREFERENCES } });
    m(prefsApi.update).mockResolvedValue({} as never);
  });

  it("snaps notepilot delay to nearest valid step and persists (DEC-015)", () => {
    usePrefsStore.getState().update({ notepilot_delay_ms: 1700 });
    expect(NOTEPILOT_DELAY_VALUES).toContain(usePrefsStore.getState().prefs.notepilot_delay_ms);
    expect(usePrefsStore.getState().prefs.notepilot_delay_ms).toBe(1500);
    expect(prefsApi.update).toHaveBeenCalledWith({ notepilot_delay_ms: 1500 });
  });

  it("toggles theme and focuspro (optimistic + persisted)", () => {
    usePrefsStore.getState().toggleTheme();
    expect(usePrefsStore.getState().prefs.theme).toBe("lightdesk");
    usePrefsStore.getState().toggleFocusPro();
    expect(usePrefsStore.getState().prefs.focuspro_enabled).toBe(true);
    expect(prefsApi.update).toHaveBeenCalledWith({ theme: "lightdesk" });
  });
});

describe("authStore (REQ-AUTH-*)", () => {
  const tokens = {
    access_token: "a",
    refresh_token: "r",
    token_type: "bearer" as const,
    user: { id: "u1", email: "a@b.co", created_at: "" },
  };

  beforeEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false, initialized: false });
    vi.clearAllMocks();
  });

  it("authenticates on a successful login (REQ-AUTH-04)", async () => {
    m(authApi.login).mockResolvedValue(tokens);
    const res = await useAuthStore.getState().login("a@b.co", "password123");
    expect(res.ok).toBe(true);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("surfaces invalid credentials without authenticating", async () => {
    m(authApi.login).mockRejectedValue({ detail: "Invalid email or password.", code: "invalid_credentials" });
    const res = await useAuthStore.getState().login("a@b.co", "wrong");
    expect(res.ok).toBe(false);
    expect(res.error).toContain("Invalid email or password.");
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("surfaces the duplicate-email error on register (REQ-AUTH-02)", async () => {
    m(authApi.register).mockRejectedValue({ detail: "An account with this email already exists.", code: "email_exists" });
    const res = await useAuthStore.getState().register("demo@smartnotes.app", "password123");
    expect(res.ok).toBe(false);
    expect(res.error).toContain("already exists");
  });
});

describe("editorStore (REQ-SAVE-04)", () => {
  beforeEach(() => useEditorStore.getState().loadContent("hello"));

  it("is not dirty until content diverges from last saved", () => {
    expect(useEditorStore.getState().isDirty()).toBe(false);
    useEditorStore.getState().setContent("hello world");
    expect(useEditorStore.getState().isDirty()).toBe(true);
    useEditorStore.getState().markSaved();
    expect(useEditorStore.getState().isDirty()).toBe(false);
  });
});
