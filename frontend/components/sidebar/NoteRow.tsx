"use client";

import type { NoteSummary } from "@/lib/api/types";

interface NoteRowProps {
  note: NoteSummary;
  active: boolean;
  depth?: number;
  onSelect: (id: string) => void;
}

// A single note entry in the sidebar tree (COMPONENT_TREE §2/§3).
export function NoteRow({ note, active, depth = 0, onSelect }: NoteRowProps) {
  const title = note.title.trim() || "Untitled";
  return (
    <button
      type="button"
      onClick={() => onSelect(note.id)}
      aria-current={active ? "true" : undefined}
      className={`flex w-full items-center gap-2 truncate rounded px-2 py-1 text-left text-sm transition-colors ${
        active ? "bg-accent/15 text-accent" : "text-text hover:bg-border/40"
      }`}
      style={{ paddingLeft: `${8 + depth * 14}px` }}
      data-testid="note-row"
    >
      <span aria-hidden className="text-muted">▤</span>
      <span className="truncate">{title}</span>
    </button>
  );
}
