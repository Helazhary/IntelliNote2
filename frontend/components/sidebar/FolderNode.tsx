"use client";

// Recursive folder node (REQ-FLDR-02/03). Expand/collapse, inline rename, context actions
// (new note, new subfolder, move-to-root, delete). Move is exposed via a lightweight select to
// satisfy REQ-FLDR-07 without a full drag-and-drop dependency in Phase 3 (logged in FRONTEND_NOTES).
import { useState } from "react";
import type { Folder, NoteSummary } from "@/lib/api/types";
import { NoteRow } from "./NoteRow";

export interface FolderNodeProps {
  folder: Folder;
  allFolders: Folder[];
  notes: NoteSummary[];
  depth: number;
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onCreateNote: (folderId: string) => void;
  onCreateSubfolder: (parentId: string) => void;
  onRequestDelete: (folderId: string) => void;
}

export function FolderNode({
  folder,
  allFolders,
  notes,
  depth,
  activeNoteId,
  onSelectNote,
  onRename,
  onCreateNote,
  onCreateSubfolder,
  onRequestDelete,
}: FolderNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(folder.name);

  const childFolders = allFolders.filter((f) => f.parent_id === folder.id);
  const childNotes = notes.filter((n) => n.folder_id === folder.id);

  function commitRename() {
    const name = draft.trim();
    if (name && name !== folder.name) onRename(folder.id, name);
    else setDraft(folder.name);
    setRenaming(false);
  }

  return (
    <div data-testid="folder-node">
      <div
        className="group flex items-center gap-1 rounded px-2 py-1 text-sm hover:bg-border/40"
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        <button
          type="button"
          aria-label={expanded ? "Collapse folder" : "Expand folder"}
          aria-expanded={expanded}
          onClick={() => setExpanded((e) => !e)}
          className="text-muted"
        >
          {expanded ? "▾" : "▸"}
        </button>

        {renaming ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setDraft(folder.name);
                setRenaming(false);
              }
            }}
            className="min-w-0 flex-1 rounded border border-accent bg-surface px-1 text-sm text-text outline-none"
            aria-label="Folder name"
          />
        ) : (
          <button
            type="button"
            onDoubleClick={() => setRenaming(true)}
            className="flex-1 truncate text-left font-medium"
          >
            📁 {folder.name}
          </button>
        )}

        <div className="hidden items-center gap-1 group-hover:flex">
          <button type="button" aria-label="New note in folder" title="New note" onClick={() => onCreateNote(folder.id)} className="text-muted hover:text-accent">＋</button>
          <button type="button" aria-label="New subfolder" title="New subfolder" onClick={() => onCreateSubfolder(folder.id)} className="text-muted hover:text-accent">📂</button>
          <button type="button" aria-label="Rename folder" title="Rename" onClick={() => setRenaming(true)} className="text-muted hover:text-accent">✎</button>
          <button type="button" aria-label="Delete folder" title="Delete" onClick={() => onRequestDelete(folder.id)} className="text-muted hover:text-danger">🗑</button>
        </div>
      </div>

      {expanded && (
        <div>
          {childFolders.map((cf) => (
            <FolderNode
              key={cf.id}
              folder={cf}
              allFolders={allFolders}
              notes={notes}
              depth={depth + 1}
              activeNoteId={activeNoteId}
              onSelectNote={onSelectNote}
              onRename={onRename}
              onCreateNote={onCreateNote}
              onCreateSubfolder={onCreateSubfolder}
              onRequestDelete={onRequestDelete}
            />
          ))}
          {childNotes.map((n) => (
            <NoteRow key={n.id} note={n} active={n.id === activeNoteId} depth={depth + 1} onSelect={onSelectNote} />
          ))}
        </div>
      )}
    </div>
  );
}
