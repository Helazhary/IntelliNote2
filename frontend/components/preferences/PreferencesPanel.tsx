"use client";

// Preferences panel (REQ-PREF-*, SPEC Feature 11). Theme, active preset, FocusPro toggle (with
// description), NotePilot toggle, and NotePilot trigger-delay control. All changes apply
// immediately via prefsStore (REQ-PREF-03) and persist (REQ-PREF-04). The delay control is shown
// only when NotePilot is enabled (REQ-PREF-02).
import type { Preferences } from "@/lib/api/types";
import { PRESETS, THEMES } from "@/lib/constants";
import { NOTEPILOT_DELAY_VALUES } from "@/lib/store/prefsStore";

interface PreferencesPanelProps {
  open: boolean;
  prefs: Preferences;
  onChange: (patch: Partial<Preferences>) => void;
  onClose: () => void;
}

export function PreferencesPanel({ open, prefs, onChange, onClose }: PreferencesPanelProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "var(--color-overlay)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Preferences"
      onClick={onClose}
      data-testid="preferences-panel"
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-panel p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text">Preferences</h2>
          <button type="button" aria-label="Close preferences" onClick={onClose} className="text-muted hover:text-text">
            ✕
          </button>
        </div>

        <div className="space-y-5">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text">Theme</span>
            <select
              aria-label="Theme"
              value={prefs.theme}
              onChange={(e) => onChange({ theme: e.target.value as Preferences["theme"] })}
              className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm text-text"
            >
              {THEMES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text">AI behavior preset</span>
            <select
              aria-label="Active preset"
              value={prefs.active_preset}
              onChange={(e) => onChange({ active_preset: e.target.value as Preferences["active_preset"] })}
              className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm text-text"
            >
              {PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          <div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.focuspro_enabled}
              aria-label="FocusPro mode"
              onClick={() => onChange({ focuspro_enabled: !prefs.focuspro_enabled })}
              className={`flex w-full items-center justify-between rounded border px-3 py-2 text-sm ${
                prefs.focuspro_enabled ? "border-accent text-accent" : "border-border text-text"
              }`}
            >
              <span>FocusPro mode</span>
              <span>{prefs.focuspro_enabled ? "On" : "Off"}</span>
            </button>
            <p className="mt-1 text-xs text-muted">
              Makes your notes easier to scan and read by adjusting text rhythm, spacing, and structure — helpful for ADHD and dyslexia.
            </p>
          </div>

          <div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.notepilot_enabled}
              aria-label="NotePilot suggestions"
              onClick={() => onChange({ notepilot_enabled: !prefs.notepilot_enabled })}
              className={`flex w-full items-center justify-between rounded border px-3 py-2 text-sm ${
                prefs.notepilot_enabled ? "border-accent text-accent" : "border-border text-text"
              }`}
            >
              <span>NotePilot suggestions</span>
              <span>{prefs.notepilot_enabled ? "On" : "Off"}</span>
            </button>

            {prefs.notepilot_enabled && (
              <label className="mt-3 block" data-testid="notepilot-delay-setting">
                <span className="mb-1 block text-sm text-text">
                  Trigger delay: <span className="text-accent">{prefs.notepilot_delay_ms}ms</span>
                </span>
                <input
                  type="range"
                  aria-label="NotePilot trigger delay"
                  min={NOTEPILOT_DELAY_VALUES[0]}
                  max={NOTEPILOT_DELAY_VALUES[NOTEPILOT_DELAY_VALUES.length - 1]}
                  step={500}
                  value={prefs.notepilot_delay_ms}
                  onChange={(e) => onChange({ notepilot_delay_ms: Number(e.target.value) })}
                  className="w-full accent-[var(--color-accent)]"
                />
              </label>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
