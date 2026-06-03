"use client";

// Cascade-delete confirmation (REQ-FLDR-04, DEC-010, NFR-USAB-03). Lists how many notes and
// subfolders will be permanently deleted — counts come from notesStore.deletePreview (mirrors
// GET /folders/{id}/delete-preview).
interface DeleteFolderDialogProps {
  open: boolean;
  folderName: string;
  noteCount: number;
  subfolderCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteFolderDialog({
  open,
  folderName,
  noteCount,
  subfolderCount,
  onConfirm,
  onCancel,
}: DeleteFolderDialogProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "var(--color-overlay)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-folder-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-border bg-panel p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="delete-folder-title" className="text-base font-semibold text-text">
          Delete “{folderName}”?
        </h2>
        <p className="mt-2 text-sm text-muted">
          This permanently deletes this folder
          {subfolderCount > 0 && `, ${subfolderCount} subfolder${subfolderCount === 1 ? "" : "s"}`}
          {" "}and{" "}
          <span className="font-semibold text-danger">
            {noteCount} note{noteCount === 1 ? "" : "s"}
          </span>
          . This cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-border px-3 py-1.5 text-sm text-text hover:bg-border/40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded bg-danger px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
