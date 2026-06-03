"use client";

// Active AI behavior preset, always visible in the header (REQ-PRESET-02/03). Backed by prefsStore
// so it stays in sync with the preferences panel.
import type { Preset } from "@/lib/api/types";
import { PRESETS } from "@/lib/constants";

interface PresetSelectorProps {
  value: Preset;
  onChange: (p: Preset) => void;
}

export function PresetSelector({ value, onChange }: PresetSelectorProps) {
  return (
    <label className="flex items-center gap-1 text-xs text-muted">
      <span className="hidden sm:inline">Preset</span>
      <select
        aria-label="AI behavior preset"
        value={value}
        onChange={(e) => onChange(e.target.value as Preset)}
        className="rounded border border-border bg-surface px-2 py-1 text-xs text-text"
      >
        {PRESETS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
    </label>
  );
}
