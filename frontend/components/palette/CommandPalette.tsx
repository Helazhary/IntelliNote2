"use client";

// Command palette (REQ-CMDK-*, SPEC Command Palette). Cmd/Ctrl+K opens it from anywhere; fuzzy
// search over note titles (cmdk's built-in filter), navigate to a note, or run an action: create
// note/folder, switch theme, toggle FocusPro, full-document AI action, export. Esc/outside closes
// without acting (REQ-CMDK-05).
import { Command } from "cmdk";
import type { NoteSummary } from "@/lib/api/types";

export type PaletteAction =
  | "create_note"
  | "create_folder"
  | "switch_theme"
  | "toggle_focuspro"
  | "doc_ai_action"
  | "export_note";

interface CommandPaletteProps {
  open: boolean;
  notes: NoteSummary[];
  onClose: () => void;
  onNavigateNote: (id: string) => void;
  onAction: (a: PaletteAction) => void;
}

const ACTIONS: { id: PaletteAction; label: string }[] = [
  { id: "create_note", label: "Create note" },
  { id: "create_folder", label: "Create folder" },
  { id: "switch_theme", label: "Switch theme" },
  { id: "toggle_focuspro", label: "Toggle FocusPro" },
  { id: "doc_ai_action", label: "Run full-document AI action" },
  { id: "export_note", label: "Export current note" },
];

export function CommandPalette({ open, notes, onClose, onNavigateNote, onAction }: CommandPaletteProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]"
      style={{ background: "var(--color-overlay)" }}
      onClick={onClose}
      data-testid="command-palette"
    >
      <Command
        label="Command palette"
        className="w-full max-w-lg overflow-hidden rounded-lg border border-border bg-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Command.Input
          autoFocus
          placeholder="Search notes or run a command…"
          className="w-full border-b border-border bg-transparent px-4 py-3 text-sm text-text outline-none placeholder:text-muted"
          data-testid="palette-input"
        />
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="px-3 py-4 text-center text-sm text-muted">No results.</Command.Empty>

          <Command.Group heading="Actions" className="text-xs text-muted">
            {ACTIONS.map((a) => (
              <Command.Item
                key={a.id}
                value={`action ${a.label}`}
                onSelect={() => {
                  onAction(a.id);
                  onClose();
                }}
                className="cursor-pointer rounded px-3 py-2 text-sm text-text data-[selected=true]:bg-accent/15 data-[selected=true]:text-accent"
              >
                {a.label}
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Group heading="Notes" className="text-xs text-muted">
            {notes.map((n) => (
              <Command.Item
                key={n.id}
                value={`note ${n.title || "Untitled"} ${n.id}`}
                onSelect={() => {
                  onNavigateNote(n.id);
                  onClose();
                }}
                className="cursor-pointer rounded px-3 py-2 text-sm text-text data-[selected=true]:bg-accent/15 data-[selected=true]:text-accent"
              >
                {n.title.trim() || "Untitled"}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
