"use client";

// AI Output Review panel (REQ-REV-*, SPEC Feature 5). Previews AI output before any content is
// changed (REQ-REV-01). Supports Accept / Reject / Edit-in-panel (DEC-008) / Revise (unlimited,
// DEC-009) / Copy. Document scope shows a side-by-side diff on desktop and tabs on mobile
// (REQ-REV-08, NFR-RESP-04); selection scope shows a simple preview.
import { useEffect, useState } from "react";
import type { AIScope } from "@/lib/api/types";

interface AIReviewPanelProps {
  open: boolean;
  scope: AIScope;
  original: string;
  output: string;
  loading: boolean;
  isMobile: boolean;
  onAccept: (finalText: string) => void;
  onReject: () => void;
  onEditOutput: (edited: string) => void;
  onRevise: (instruction: string) => void;
  onCopy: (text: string) => void;
}

export function AIReviewPanel({
  open,
  scope,
  original,
  output,
  loading,
  isMobile,
  onAccept,
  onReject,
  onEditOutput,
  onRevise,
  onCopy,
}: AIReviewPanelProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(output);
  const [revising, setRevising] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [tab, setTab] = useState<"original" | "output">("output");

  // Keep the editable draft in sync when a fresh/ revised output arrives.
  useEffect(() => {
    setDraft(output);
    setEditing(false);
  }, [output]);

  useEffect(() => {
    if (!open) {
      setRevising(false);
      setInstruction("");
      setTab("output");
    }
  }, [open]);

  if (!open) return null;

  const finalText = editing ? draft : output;

  function submitRevision() {
    const v = instruction.trim();
    if (v.length === 0) return;
    onRevise(v);
    setInstruction("");
    setRevising(false);
  }

  const outputPane = editing ? (
    <textarea
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        onEditOutput(e.target.value);
      }}
      className="h-full min-h-[200px] w-full resize-none rounded border border-accent bg-surface p-3 font-mono text-sm text-text outline-none"
      data-testid="review-editable-output"
      aria-label="Editable AI output"
    />
  ) : (
    <pre className="h-full min-h-[200px] w-full overflow-auto whitespace-pre-wrap rounded border border-border bg-surface p-3 font-mono text-sm text-text" data-testid="review-output">
      {output}
    </pre>
  );

  const originalPane = (
    <pre className="h-full min-h-[200px] w-full overflow-auto whitespace-pre-wrap rounded border border-border bg-surface p-3 font-mono text-sm text-muted" data-testid="review-original">
      {original}
    </pre>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: "var(--color-overlay)" }}
      role="dialog"
      aria-modal="true"
      aria-label="AI output review"
      onClick={onReject}
    >
      <div
        className="flex h-full w-full max-w-3xl flex-col border-l border-border bg-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        data-testid="ai-review-panel"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text">
            AI Output Review <span className="text-muted">({scope})</span>
          </h2>
          <button type="button" aria-label="Close review" onClick={onReject} className="text-muted hover:text-text">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-hidden p-4">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted" data-testid="review-loading">
              <span className="cm-notepilot-loading mr-2" /> Generating…
            </div>
          ) : scope === "document" && !isMobile ? (
            <div className="grid h-full grid-cols-2 gap-3" data-testid="review-diff">
              <div className="flex flex-col">
                <span className="mb-1 text-xs font-semibold uppercase text-muted">Original</span>
                {originalPane}
              </div>
              <div className="flex flex-col">
                <span className="mb-1 text-xs font-semibold uppercase text-muted">AI Output</span>
                {outputPane}
              </div>
            </div>
          ) : scope === "document" && isMobile ? (
            <div className="flex h-full flex-col" data-testid="review-tabs">
              <div className="mb-2 flex gap-1">
                <button
                  type="button"
                  onClick={() => setTab("original")}
                  className={`rounded px-2 py-1 text-xs ${tab === "original" ? "bg-accent/15 text-accent" : "text-muted"}`}
                >
                  Original
                </button>
                <button
                  type="button"
                  onClick={() => setTab("output")}
                  className={`rounded px-2 py-1 text-xs ${tab === "output" ? "bg-accent/15 text-accent" : "text-muted"}`}
                >
                  AI Output
                </button>
              </div>
              {tab === "original" ? originalPane : outputPane}
            </div>
          ) : (
            <div className="flex h-full flex-col">{outputPane}</div>
          )}
        </div>

        {revising && !loading && (
          <div className="border-t border-border px-4 py-3">
            <input
              autoFocus
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitRevision();
                if (e.key === "Escape") setRevising(false);
              }}
              placeholder="Tell the AI how to revise…"
              className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
              data-testid="revise-input"
            />
          </div>
        )}

        {!loading && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-4 py-3" data-testid="review-actions">
            <button type="button" onClick={() => onCopy(finalText)} className="rounded border border-border px-3 py-1.5 text-sm hover:bg-border/40">
              Copy
            </button>
            <button type="button" onClick={() => setEditing((e) => !e)} className="rounded border border-border px-3 py-1.5 text-sm hover:bg-border/40">
              {editing ? "Done editing" : "Edit suggestion"}
            </button>
            <button
              type="button"
              onClick={() => (revising ? submitRevision() : setRevising(true))}
              className="rounded border border-border px-3 py-1.5 text-sm hover:bg-border/40"
            >
              {revising ? "Submit revision" : "Ask AI to revise"}
            </button>
            <button type="button" onClick={onReject} className="rounded border border-border px-3 py-1.5 text-sm hover:bg-border/40">
              Reject
            </button>
            <button
              type="button"
              onClick={() => onAccept(finalText)}
              className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-[var(--color-accent-fg)] hover:opacity-90"
            >
              Accept
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
