"use client";

// Full-document AI action menu (REQ-AIA-02/04). Exposes all 8 actions; each runs on the entire
// note (scope=document). "Custom prompt" opens the dedicated full-doc prompt input instead.
import { useRef, useState } from "react";
import type { AIAction } from "@/lib/api/types";
import { AI_ACTIONS } from "@/lib/constants";
import { useClickOutside } from "@/lib/hooks/useClickOutside";

interface DocActionMenuProps {
  onDocAction: (action: AIAction) => void;
  onOpenCustomPrompt: () => void;
}

export function DocActionMenu({ onDocAction, onOpenCustomPrompt }: DocActionMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="rounded border border-border px-2 py-1 text-xs text-text hover:bg-border/40"
        data-testid="doc-action-trigger"
      >
        AI ▾
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1 w-48 rounded border border-border bg-panel py-1 shadow-lg">
          {AI_ACTIONS.map((a) => (
            <button
              key={a.value}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                if (a.value === "custom") onOpenCustomPrompt();
                else onDocAction(a.value);
              }}
              className="block w-full px-3 py-1.5 text-left text-sm text-text hover:bg-border/40"
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
