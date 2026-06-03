// notesStore — REQ-FLDR-*, REQ-EDIT-*. Holds folders (flat list; client builds tree per
// API_CONTRACTS §4 GET /folders), note summaries, and the active full note. Phase 3 mutates an
// in-memory mock store; Phase 4b wires the same actions to real endpoints.
import { create } from "zustand";
import type { Folder, Note, NoteSummary } from "@/lib/api/types";
import { MOCK_FOLDERS, MOCK_NOTES, mockId, toSummary } from "@/lib/mock/data";

function nowIso(): string {
  return new Date().toISOString();
}

interface NotesState {
  folders: Folder[];
  noteSummaries: NoteSummary[];
  notesById: Record<string, Note>;
  activeNoteId: string | null;
  activeNote: Note | null;

  selectNote: (id: string) => void;
  createNote: (folderId: string | null) => string;
  createFolder: (parentId: string | null, name?: string) => string;
  renameFolder: (id: string, name: string) => void;
  renameNote: (id: string, title: string) => void;
  moveNote: (id: string, folderId: string | null) => void;
  moveFolder: (id: string, parentId: string | null) => void;
  deleteNote: (id: string) => void;
  deleteFolder: (id: string) => void;
  deletePreview: (id: string) => { note_count: number; subfolder_count: number };
  // Editor persistence (autosave / manual save target).
  applyNoteUpdate: (id: string, patch: Partial<Pick<Note, "title" | "content">>) => void;
}

function descendantFolderIds(folders: Folder[], rootId: string): string[] {
  const result: string[] = [];
  const stack = [rootId];
  while (stack.length) {
    const cur = stack.pop()!;
    result.push(cur);
    folders.filter((f) => f.parent_id === cur).forEach((f) => stack.push(f.id));
  }
  return result;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  folders: [...MOCK_FOLDERS],
  noteSummaries: MOCK_NOTES.map(toSummary),
  notesById: Object.fromEntries(MOCK_NOTES.map((n) => [n.id, n])),
  activeNoteId: null,
  activeNote: null,

  selectNote: (id) => {
    const note = get().notesById[id] ?? null;
    set({ activeNoteId: note ? id : null, activeNote: note });
  },

  createNote: (folderId) => {
    const id = mockId("n");
    const note: Note = {
      id,
      title: "",
      content: "",
      folder_id: folderId,
      user_id: MOCK_NOTES[0].user_id,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    set((s) => ({
      notesById: { ...s.notesById, [id]: note },
      noteSummaries: [toSummary(note), ...s.noteSummaries],
      activeNoteId: id,
      activeNote: note,
    }));
    return id;
  },

  createFolder: (parentId, name = "New Folder") => {
    const id = mockId("f");
    const folder: Folder = {
      id,
      name,
      parent_id: parentId,
      user_id: MOCK_NOTES[0].user_id,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    set((s) => ({ folders: [...s.folders, folder] }));
    return id;
  },

  renameFolder: (id, name) =>
    set((s) => ({
      folders: s.folders.map((f) => (f.id === id ? { ...f, name, updated_at: nowIso() } : f)),
    })),

  renameNote: (id, title) =>
    set((s) => {
      const note = s.notesById[id];
      if (!note) return {};
      const updated = { ...note, title, updated_at: nowIso() };
      return {
        notesById: { ...s.notesById, [id]: updated },
        noteSummaries: s.noteSummaries.map((n) => (n.id === id ? toSummary(updated) : n)),
        activeNote: s.activeNoteId === id ? updated : s.activeNote,
      };
    }),

  moveNote: (id, folderId) =>
    set((s) => {
      const note = s.notesById[id];
      if (!note) return {};
      const updated = { ...note, folder_id: folderId, updated_at: nowIso() };
      return {
        notesById: { ...s.notesById, [id]: updated },
        noteSummaries: s.noteSummaries.map((n) => (n.id === id ? toSummary(updated) : n)),
        activeNote: s.activeNoteId === id ? updated : s.activeNote,
      };
    }),

  moveFolder: (id, parentId) =>
    set((s) => ({
      folders: s.folders.map((f) => (f.id === id ? { ...f, parent_id: parentId, updated_at: nowIso() } : f)),
    })),

  deleteNote: (id) =>
    set((s) => {
      const { [id]: _, ...rest } = s.notesById;
      return {
        notesById: rest,
        noteSummaries: s.noteSummaries.filter((n) => n.id !== id),
        activeNoteId: s.activeNoteId === id ? null : s.activeNoteId,
        activeNote: s.activeNoteId === id ? null : s.activeNote,
      };
    }),

  deletePreview: (id) => {
    const s = get();
    const folderIds = descendantFolderIds(s.folders, id);
    const note_count = s.noteSummaries.filter((n) => n.folder_id && folderIds.includes(n.folder_id)).length;
    const subfolder_count = folderIds.length - 1;
    return { note_count, subfolder_count };
  },

  deleteFolder: (id) =>
    set((s) => {
      const folderIds = new Set(descendantFolderIds(s.folders, id));
      const removedNoteIds = s.noteSummaries
        .filter((n) => n.folder_id && folderIds.has(n.folder_id))
        .map((n) => n.id);
      const notesById = { ...s.notesById };
      removedNoteIds.forEach((nid) => delete notesById[nid]);
      const activeRemoved = s.activeNoteId && removedNoteIds.includes(s.activeNoteId);
      return {
        folders: s.folders.filter((f) => !folderIds.has(f.id)),
        noteSummaries: s.noteSummaries.filter((n) => !(n.folder_id && folderIds.has(n.folder_id))),
        notesById,
        activeNoteId: activeRemoved ? null : s.activeNoteId,
        activeNote: activeRemoved ? null : s.activeNote,
      };
    }),

  applyNoteUpdate: (id, patch) =>
    set((s) => {
      const note = s.notesById[id];
      if (!note) return {};
      const updated = { ...note, ...patch, updated_at: nowIso() };
      return {
        notesById: { ...s.notesById, [id]: updated },
        noteSummaries: s.noteSummaries.map((n) => (n.id === id ? toSummary(updated) : n)),
        activeNote: s.activeNoteId === id ? updated : s.activeNote,
      };
    }),
}));
