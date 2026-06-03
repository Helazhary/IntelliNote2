"use client";

// Floating inline toolbar (REQ-TBAR-*, SPEC Feature 4). Appears above a text selection, centered
// on it. Shows the default 4 actions (Format, Summarize, Enhance, Custom Prompt — DEC-007) plus a
// "More" button that expands to all 8. Hidden when there's no selection (anchorRect=null).
import { useState } from "react";
import type { AIAction } from "@/lib/api/types";
import { AI_ACTIONS, DEFAULT_TOOLBAR_ACTIONS, actionLabel } from "@/lib/constants";

interface SelectionToolbarProps {
  anchorRect: DOMRect | null;
  selectedText: string;
  onAction: (action: AIAction) => void;
  isMobile: boolean;
}

export function SelectionToolbar({ anchorRect, selectedText, onAction, isMobile }: SelectionToolbarProps) {
  const [expanded, setExpanded] = useState(false);

  if (!anchorRect || selectedText.trim().length === 0) return null;

  // Center horizontally on the selection; sit above it. On mobile, lift further so the on-screen
  // keyboard doesn't obscure it (REQ-TBAR-05).
  const top = Math.max(8, anchorRect.top - (isMobile ? 64 : 48));
  const left = anchorRect.left + anchorRect.width / 2;

  return (
    <div
      role="toolbar"
      aria-label="AI actions for selection"
      data-testid="selection-toolbar"
      className="fixed z-40 -translate-x-1/2 rounded-full border border-border bg-panel px-1 py-1 shadow-lg"
      style={{ top, left }}
    >
      <div className="flex items-center gap-0.5">
        {DEFAULT_TOOLBAR_ACTIONS.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => onAction(a)}
            className="rounded-full px-2.5 py-1 text-xs text-text hover:bg-accent/15 hover:text-accent"
          >
            {actionLabel(a)}
          </button>
        ))}
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((e) => !e)}
          className="rounded-full px-2.5 py-1 text-xs text-muted hover:bg-border/40"
          data-testid="toolbar-more"
        >
          More ▾
        </button>
      </div>

      {expanded && (
        <div className="mt-1 grid grid-cols-2 gap-0.5 border-t border-border pt-1">
          {AI_ACTIONS.map((a) => (
            <button
              key={a.value}
              type="button"
              onClick={() => onAction(a.value)}
              className="rounded px-2 py-1 text-left text-xs text-text hover:bg-accent/15 hover:text-accent"
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
