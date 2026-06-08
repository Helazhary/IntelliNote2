"use client";

// Custom prompt input (REQ-CPMT-01/02). Opened document-scoped from the editor header or command
// palette (whole note + instruction), or selection-scoped from the floating toolbar (selected text
// only — REQ-CPMT-03). The scope drives the copy so the user knows what the AI will act on.
import { useEffect, useRef, useState } from "react";
import type { AIScope } from "@/lib/api/types";

interface CustomPromptInputProps {
  open: boolean;
  scope?: AIScope;
  onSubmit: (instruction: string) => void;
  onCancel: () => void;
}

export function CustomPromptInput({ open, scope = "document", onSubmit, onCancel }: CustomPromptInputProps) {
  const isSelection = scope === "selection";
  const dialogLabel = isSelection ? "Custom prompt for the selected text" : "Custom prompt for the whole document";
  const heading = isSelection ? "Custom prompt — selected text" : "Custom prompt — entire note";
  const placeholder = isSelection
    ? 'e.g. "Rewrite this as a single clear sentence."'
    : 'e.g. "Turn this into a formal meeting summary."';
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setValue("");
      ref.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  function submit() {
    const v = value.trim();
    if (v.length > 0) onSubmit(v);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-24"
      style={{ background: "var(--color-overlay)" }}
      role="dialog"
      aria-modal="true"
      aria-label={dialogLabel}
      onClick={onCancel}
    >
      <div className="w-full max-w-lg rounded-lg border border-border bg-panel p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-2 text-sm font-semibold text-text">{heading}</h2>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            if (e.key === "Escape") onCancel();
          }}
          rows={3}
          placeholder={placeholder}
          className="w-full resize-none rounded border border-border bg-surface p-2 text-sm text-text outline-none focus:border-accent"
          data-testid="custom-prompt-input"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded border border-border px-3 py-1.5 text-sm hover:bg-border/40">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={value.trim().length === 0}
            className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-[var(--color-accent-fg)] disabled:opacity-40"
          >
            Run
          </button>
        </div>
      </div>
    </div>
  );
}
