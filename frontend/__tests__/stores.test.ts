import { beforeEach, describe, expect, it } from "vitest";
import { useNotesStore } from "@/lib/store/notesStore";
import { usePrefsStore, NOTEPILOT_DELAY_VALUES } from "@/lib/store/prefsStore";
import { useAuthStore } from "@/lib/store/authStore";
import { useEditorStore } from "@/lib/store/editorStore";
import { MOCK_FOLDERS, MOCK_NOTES, MOCK_PREFERENCES, toSummary } from "@/lib/mock/data";

function resetNotes() {
  useNotesStore.setState({
    folders: [...MOCK_FOLDERS],
    noteSummaries: MOCK_NOTES.map(toSummary),
    notesById: Object.fromEntries(MOCK_NOTES.map((n) => [n.id, n])),
    activeNoteId: null,
    activeNote: null,
  });
}

describe("notesStore (REQ-FLDR-*)", () => {
  beforeEach(resetNotes);

  it("creates notes in Unfiled (folder_id=null) (REQ-FLDR-06)", () => {
    const id = useNotesStore.getState().createNote(null);
    const note = useNotesStore.getState().notesById[id];
    expect(note.folder_id).toBeNull();
    expect(useNotesStore.getState().activeNoteId).toBe(id);
  });

  it("delete preview counts descendant notes + subfolders (REQ-FLDR-04)", () => {
    // University > Biology 101 has 3 notes; 1 subfolder.
    const preview = useNotesStore.getState().deletePreview("f-university");
    expect(preview.subfolder_count).toBe(1);
    expect(preview.note_count).toBe(3);
  });

  it("cascade delete removes folder, subfolders, and contained notes (REQ-FLDR-05)", () => {
    useNotesStore.getState().deleteFolder("f-university");
    const s = useNotesStore.getState();
    expect(s.folders.find((f) => f.id === "f-biology")).toBeUndefined();
    expect(s.noteSummaries.find((n) => n.id === "n-lecture1")).toBeUndefined();
  });

  it("moves a note to a new folder (REQ-FLDR-07)", () => {
    useNotesStore.getState().moveNote("n-scratch", "f-work");
    expect(useNotesStore.getState().notesById["n-scratch"].folder_id).toBe("f-work");
  });

  it("renames a folder", () => {
    useNotesStore.getState().renameFolder("f-work", "Job");
    expect(useNotesStore.getState().folders.find((f) => f.id === "f-work")!.name).toBe("Job");
  });
});

describe("prefsStore (REQ-PREF-*, REQ-NP-10)", () => {
  beforeEach(() => usePrefsStore.setState({ prefs: { ...MOCK_PREFERENCES } }));

  it("snaps notepilot delay to nearest valid step (DEC-015)", () => {
    usePrefsStore.getState().update({ notepilot_delay_ms: 1700 });
    expect(NOTEPILOT_DELAY_VALUES).toContain(usePrefsStore.getState().prefs.notepilot_delay_ms);
    expect(usePrefsStore.getState().prefs.notepilot_delay_ms).toBe(1500);
  });

  it("toggles theme and focuspro", () => {
    usePrefsStore.getState().toggleTheme();
    expect(usePrefsStore.getState().prefs.theme).toBe("lightdesk");
    usePrefsStore.getState().toggleFocusPro();
    expect(usePrefsStore.getState().prefs.focuspro_enabled).toBe(true);
  });
});

describe("authStore (REQ-AUTH-*)", () => {
  beforeEach(() => useAuthStore.setState({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, knownEmails: ["demo@smartnotes.app"] }));

  it("rejects short passwords and bad emails", () => {
    expect(useAuthStore.getState().login("bad", "short").ok).toBe(false);
    expect(useAuthStore.getState().login("a@b.co", "short").ok).toBe(false);
  });

  it("logs in with valid credentials", () => {
    const res = useAuthStore.getState().login("a@b.co", "password123");
    expect(res.ok).toBe(true);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("rejects duplicate email on register (REQ-AUTH-02)", () => {
    const res = useAuthStore.getState().register("demo@smartnotes.app", "password123");
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
