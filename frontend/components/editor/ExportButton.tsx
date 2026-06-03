"use client";

// Export menu (REQ-EXP-01/02). Format selection → download. The actual file build + download is
// handled by lib/export/exporters in the editor pane.
import { useRef, useState } from "react";
import type { ExportFormat } from "@/lib/api/types";
import { EXPORT_FORMATS } from "@/lib/constants";
import { useClickOutside } from "@/lib/hooks/useClickOutside";

interface ExportButtonProps {
  onExport: (format: ExportFormat) => void;
}

export function ExportButton({ onExport }: ExportButtonProps) {
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
        data-testid="export-trigger"
      >
        Export ▾
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1 w-40 rounded border border-border bg-panel py-1 shadow-lg">
          {EXPORT_FORMATS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onExport(f.value);
              }}
              className="block w-full px-3 py-1.5 text-left text-sm text-text hover:bg-border/40"
            >
              {f.label} <span className="text-muted">{f.ext}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
