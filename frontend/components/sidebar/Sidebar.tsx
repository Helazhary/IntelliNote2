"use client";

// Sidebar (COMPONENT_TREE §2): header (new note / new folder), Unfiled section (folder_id=null,
// REQ-FLDR-06), recursive folder tree, and the cascade delete dialog. Reads/writes notesStore.
import { useState } from "react";
import { useNotesStore } from "@/lib/store/notesStore";
import { FolderNode } from "./FolderNode";
import { NoteRow } from "./NoteRow";
import { DeleteFolderDialog } from "./DeleteFolderDialog";

interface SidebarProps {
  onAfterSelect?: () => void; // close drawer on mobile
}

export function Sidebar({ onAfterSelect }: SidebarProps) {
  const folders = useNotesStore((s) => s.folders);
  const noteSummaries = useNotesStore((s) => s.noteSummaries);
  const activeNoteId = useNotesStore((s) => s.activeNoteId);
  const selectNote = useNotesStore((s) => s.selectNote);
  const createNote = useNotesStore((s) => s.createNote);
  const createFolder = useNotesStore((s) => s.createFolder);
  const renameFolder = useNotesStore((s) => s.renameFolder);
  const deletePreview = useNotesStore((s) => s.deletePreview);
  const deleteFolder = useNotesStore((s) => s.deleteFolder);

  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const topFolders = folders.filter((f) => f.parent_id === null);
  const unfiled = noteSummaries.filter((n) => n.folder_id === null);

  const deleteTarget = folders.find((f) => f.id === pendingDelete);
  const preview = pendingDelete ? deletePreview(pendingDelete) : { note_count: 0, subfolder_count: 0 };

  function handleSelect(id: string) {
    selectNote(id);
    onAfterSelect?.();
  }

  return (
    <nav aria-label="Notes and folders" className="flex h-full w-full flex-col bg-panel">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-3">
        <span className="font-mono text-sm font-bold text-accent">SmartNotes</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="New note"
            title="New note"
            onClick={() => {
              createNote(null);
              onAfterSelect?.();
            }}
            className="rounded border border-border px-2 py-1 text-sm hover:bg-border/40"
          >
            ＋ Note
          </button>
          <button
            type="button"
            aria-label="New folder"
            title="New folder"
            onClick={() => createFolder(null)}
            className="rounded border border-border px-2 py-1 text-sm hover:bg-border/40"
          >
            ＋ Folder
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted">Unfiled</div>
        {unfiled.length === 0 ? (
          <p className="px-3 py-1 text-xs text-muted">No unfiled notes</p>
        ) : (
          unfiled.map((n) => (
            <NoteRow key={n.id} note={n} active={n.id === activeNoteId} onSelect={handleSelect} />
          ))
        )}

        <div className="mt-3 px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted">Folders</div>
        {topFolders.length === 0 ? (
          <p className="px-3 py-1 text-xs text-muted">No folders yet</p>
        ) : (
          topFolders.map((f) => (
            <FolderNode
              key={f.id}
              folder={f}
              allFolders={folders}
              notes={noteSummaries}
              depth={0}
              activeNoteId={activeNoteId}
              onSelectNote={handleSelect}
              onRename={renameFolder}
              onCreateNote={(fid) => {
                createNote(fid);
                onAfterSelect?.();
              }}
              onCreateSubfolder={(pid) => createFolder(pid)}
              onRequestDelete={setPendingDelete}
            />
          ))
        )}
      </div>

      <DeleteFolderDialog
        open={pendingDelete !== null}
        folderName={deleteTarget?.name ?? ""}
        noteCount={preview.note_count}
        subfolderCount={preview.subfolder_count}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteFolder(pendingDelete);
          setPendingDelete(null);
        }}
      />
    </nav>
  );
}
