// notesStore — REQ-FLDR-*, REQ-EDIT-*. Phase 4b: real API. Holds the user's folders (flat — the
// client builds the tree, API_CONTRACTS §4), note summaries, and the open full note. hydrate()
// loads from the backend; mutations persist via the api and update local state. renameNote and
// applyNoteUpdate stay local (the editor's autosave PATCH is the persistence path); deletePreview
// is computed locally from the already-hydrated tree for an instant confirm dialog (REQ-FLDR-04).
import { create } from "zustand";
import type { Folder, Note, NoteSummary } from "@/lib/api/types";
import { foldersApi, notesApi } from "@/lib/api/endpoints";

function toSummary(note: Note): NoteSummary {
  return { id: note.id, title: note.title, folder_id: note.folder_id, updated_at: note.updated_at };
}

// All folder ids in the subtree rooted at rootId, inclusive.
function subtreeFolderIds(folders: Folder[], rootId: string): string[] {
  const result: string[] = [];
  const stack = [rootId];
  while (stack.length) {
    const cur = stack.pop()!;
    result.push(cur);
    folders.filter((f) => f.parent_id === cur).forEach((f) => stack.push(f.id));
  }
  return result;
}

interface NotesState {
  folders: Folder[];
  noteSummaries: NoteSummary[];
  notesById: Record<string, Note>;
  activeNoteId: string | null;
  activeNote: Note | null;
  loaded: boolean;

  hydrate: () => Promise<void>;
  selectNote: (id: string) => Promise<void>;
  createNote: (folderId: string | null) => Promise<string | null>;
  createFolder: (parentId: string | null, name?: string) => Promise<string | null>;
  renameFolder: (id: string, name: string) => Promise<void>;
  renameNote: (id: string, title: string) => void; // local; persisted by editor autosave
  moveNote: (id: string, folderId: string | null) => Promise<void>;
  moveFolder: (id: string, parentId: string | null) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  deletePreview: (id: string) => { note_count: number; subfolder_count: number };
  applyNoteUpdate: (id: string, patch: Partial<Pick<Note, "title" | "content">>) => void;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  folders: [],
  noteSummaries: [],
  notesById: {},
  activeNoteId: null,
  activeNote: null,
  loaded: false,

  hydrate: async () => {
    const [folders, noteSummaries] = await Promise.all([foldersApi.list(), notesApi.list()]);
    set({ folders, noteSummaries, loaded: true });
  },

  selectNote: async (id) => {
    try {
      const note = await notesApi.get(id); // summaries carry no content — fetch the full note
      set((s) => ({
        activeNoteId: id,
        activeNote: note,
        notesById: { ...s.notesById, [id]: note },
      }));
    } catch {
      /* note vanished (e.g. deleted elsewhere) — ignore */
    }
  },

  createNote: async (folderId) => {
    try {
      const note = await notesApi.create({ folder_id: folderId });
      set((s) => ({
        notesById: { ...s.notesById, [note.id]: note },
        noteSummaries: [toSummary(note), ...s.noteSummaries],
        activeNoteId: note.id,
        activeNote: note,
      }));
      return note.id;
    } catch {
      return null;
    }
  },

  createFolder: async (parentId, name = "New Folder") => {
    try {
      const folder = await foldersApi.create(name, parentId);
      set((s) => ({ folders: [...s.folders, folder] }));
      return folder.id;
    } catch {
      return null;
    }
  },

  renameFolder: async (id, name) => {
    await foldersApi.update(id, { name });
    set((s) => ({
      folders: s.folders.map((f) => (f.id === id ? { ...f, name } : f)),
    }));
  },

  renameNote: (id, title) =>
    set((s) => {
      const note = s.notesById[id];
      const updated = note ? { ...note, title } : undefined;
      return {
        notesById: updated ? { ...s.notesById, [id]: updated } : s.notesById,
        noteSummaries: s.noteSummaries.map((n) => (n.id === id ? { ...n, title } : n)),
        activeNote: s.activeNoteId === id && updated ? updated : s.activeNote,
      };
    }),

  moveNote: async (id, folderId) => {
    await notesApi.update(id, { folder_id: folderId });
    set((s) => {
      const note = s.notesById[id];
      const updated = note ? { ...note, folder_id: folderId } : undefined;
      return {
        notesById: updated ? { ...s.notesById, [id]: updated } : s.notesById,
        noteSummaries: s.noteSummaries.map((n) => (n.id === id ? { ...n, folder_id: folderId } : n)),
        activeNote: s.activeNoteId === id && updated ? updated : s.activeNote,
      };
    });
  },

  moveFolder: async (id, parentId) => {
    await foldersApi.update(id, { parent_id: parentId });
    set((s) => ({
      folders: s.folders.map((f) => (f.id === id ? { ...f, parent_id: parentId } : f)),
    }));
  },

  deleteNote: async (id) => {
    await notesApi.remove(id);
    set((s) => {
      const { [id]: _removed, ...rest } = s.notesById;
      const active = s.activeNoteId === id;
      return {
        notesById: rest,
        noteSummaries: s.noteSummaries.filter((n) => n.id !== id),
        activeNoteId: active ? null : s.activeNoteId,
        activeNote: active ? null : s.activeNote,
      };
    });
  },

  deleteFolder: async (id) => {
    await foldersApi.remove(id); // server cascades; mirror the subtree removal locally (REQ-FLDR-05)
    set((s) => {
      const folderIds = new Set(subtreeFolderIds(s.folders, id));
      const removedNoteIds = s.noteSummaries
        .filter((n) => n.folder_id && folderIds.has(n.folder_id))
        .map((n) => n.id);
      const notesById = { ...s.notesById };
      removedNoteIds.forEach((nid) => delete notesById[nid]);
      const activeRemoved = !!s.activeNoteId && removedNoteIds.includes(s.activeNoteId);
      return {
        folders: s.folders.filter((f) => !folderIds.has(f.id)),
        noteSummaries: s.noteSummaries.filter((n) => !(n.folder_id && folderIds.has(n.folder_id))),
        notesById,
        activeNoteId: activeRemoved ? null : s.activeNoteId,
        activeNote: activeRemoved ? null : s.activeNote,
      };
    });
  },

  deletePreview: (id) => {
    const s = get();
    const folderIds = subtreeFolderIds(s.folders, id);
    const note_count = s.noteSummaries.filter((n) => n.folder_id && folderIds.includes(n.folder_id)).length;
    return { note_count, subfolder_count: folderIds.length - 1 };
  },

  applyNoteUpdate: (id, patch) =>
    set((s) => {
      const note = s.notesById[id];
      if (!note) return {};
      const updated = { ...note, ...patch };
      return {
        notesById: { ...s.notesById, [id]: updated },
        noteSummaries: s.noteSummaries.map((n) =>
          n.id === id ? { ...n, title: updated.title } : n,
        ),
        activeNote: s.activeNoteId === id ? updated : s.activeNote,
      };
    }),
}));
