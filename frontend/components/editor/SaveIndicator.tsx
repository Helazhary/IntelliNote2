"use client";

// Save indicator (REQ-SAVE-03): idle → Saving… → Saved, or Error saving with a Retry action.
import type { SaveState } from "@/lib/store/editorStore";

interface SaveIndicatorProps {
  state: SaveState;
  onRetry: () => void;
}

export function SaveIndicator({ state, onRetry }: SaveIndicatorProps) {
  if (state === "idle") return <span className="text-xs text-muted" data-testid="save-indicator" />;
  if (state === "saving")
    return <span className="text-xs text-muted" data-testid="save-indicator">Saving…</span>;
  if (state === "saved")
    return <span className="text-xs text-success" data-testid="save-indicator">Saved</span>;
  return (
    <span className="flex items-center gap-1 text-xs text-danger" data-testid="save-indicator">
      Error saving
      <button type="button" onClick={onRetry} className="underline hover:no-underline">
        Retry
      </button>
    </span>
  );
}
