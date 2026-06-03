"use client";

// Full-document custom prompt input (REQ-CPMT-01/02). Opened from the editor header or the command
// palette. Submitting sends the whole note + instruction to the AI (action=custom, scope=document).
import { useEffect, useRef, useState } from "react";

interface CustomPromptInputProps {
  open: boolean;
  onSubmit: (instruction: string) => void;
  onCancel: () => void;
}

export function CustomPromptInput({ open, onSubmit, onCancel }: CustomPromptInputProps) {
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
      aria-label="Custom prompt for the whole document"
      onClick={onCancel}
    >
      <div className="w-full max-w-lg rounded-lg border border-border bg-panel p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-2 text-sm font-semibold text-text">Custom prompt — entire note</h2>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            if (e.key === "Escape") onCancel();
          }}
          rows={3}
          placeholder='e.g. "Turn this into a formal meeting summary."'
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
