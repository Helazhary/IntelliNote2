// editorStore — REQ-SAVE-*, REQ-TBAR-*. Tracks live editor content, last-saved snapshot (to skip
// redundant saves, REQ-SAVE-04), the save indicator state (REQ-SAVE-03), and the current text
// selection used to anchor the floating toolbar (REQ-TBAR-*).
import { create } from "zustand";

export type SaveState = "idle" | "saving" | "saved" | "error";

export interface EditorSelection {
  text: string;
  rect: DOMRect | null;
  from: number;
  to: number;
}

interface EditorState {
  content: string;
  lastSavedContent: string;
  saveState: SaveState;
  selection: EditorSelection | null;

  setContent: (content: string) => void;
  loadContent: (content: string) => void; // when opening a note — resets dirty tracking
  markSaving: () => void;
  // Pass the snapshot that was actually persisted. Defaulting to the live content would clear the
  // dirty flag for edits typed *during* the in-flight save, silently dropping them (REQ-SAVE-04).
  markSaved: (savedContent?: string) => void;
  markError: () => void;
  setSelection: (sel: EditorSelection | null) => void;
  isDirty: () => boolean;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  content: "",
  lastSavedContent: "",
  saveState: "idle",
  selection: null,

  setContent: (content) => set({ content }),
  loadContent: (content) => set({ content, lastSavedContent: content, saveState: "idle", selection: null }),
  markSaving: () => set({ saveState: "saving" }),
  markSaved: (savedContent) =>
    set((s) => ({ saveState: "saved", lastSavedContent: savedContent ?? s.content })),
  markError: () => set({ saveState: "error" }),
  setSelection: (selection) => set({ selection }),
  isDirty: () => get().content !== get().lastSavedContent,
}));
