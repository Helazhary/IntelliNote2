"use client";

// FocusPro quick-toggle in the editor toolbar (REQ-FOCUS-06). Synced with the Preferences panel
// via prefsStore. A short description is shown on hover/title per SPEC Feature 9.
interface FocusProToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export function FocusProToggle({ enabled, onToggle }: FocusProToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label="FocusPro mode"
      title="FocusPro makes notes easier to scan and read — helpful for ADHD and dyslexia."
      onClick={onToggle}
      className={`rounded border px-2 py-1 text-xs transition-colors ${
        enabled ? "border-accent bg-accent/15 text-accent" : "border-border text-muted hover:bg-border/40"
      }`}
      data-testid="focuspro-toggle"
    >
      FocusPro {enabled ? "On" : "Off"}
    </button>
  );
}
