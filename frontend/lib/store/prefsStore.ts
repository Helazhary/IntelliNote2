// prefsStore — REQ-PREF-*, REQ-THEME-*, REQ-PRESET-*, REQ-FOCUS-*. Single source of truth for
// preferences so the editor header, command palette, and preferences panel stay in sync
// (REQ-FOCUS-06, REQ-PRESET-03). Persisted to localStorage so theme/prefs survive reload
// (REQ-THEME-04, NFR-PERSIST-02 — DB-backed in Phase 4b). NotePilot delay is clamped to the
// allowed 500..5000 step-500 range (REQ-NP-10, DEC-015).
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Preferences } from "@/lib/api/types";
import { MOCK_PREFERENCES } from "@/lib/mock/data";

export const NOTEPILOT_DELAY_VALUES = [500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000] as const;

interface PrefsState {
  prefs: Preferences;
  update: (patch: Partial<Preferences>) => void;
  toggleFocusPro: () => void;
  toggleTheme: () => void;
}

function sanitize(patch: Partial<Preferences>): Partial<Preferences> {
  const next = { ...patch };
  if (next.notepilot_delay_ms != null && !NOTEPILOT_DELAY_VALUES.includes(next.notepilot_delay_ms as 500)) {
    // Snap to nearest valid step (REQ-NP-10) instead of rejecting in the mocked client.
    next.notepilot_delay_ms = NOTEPILOT_DELAY_VALUES.reduce((a, b) =>
      Math.abs(b - next.notepilot_delay_ms!) < Math.abs(a - next.notepilot_delay_ms!) ? b : a,
    );
  }
  return next;
}

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      prefs: { ...MOCK_PREFERENCES },
      update: (patch) =>
        set((s) => ({ prefs: { ...s.prefs, ...sanitize(patch), updated_at: new Date().toISOString() } })),
      toggleFocusPro: () =>
        set((s) => ({ prefs: { ...s.prefs, focuspro_enabled: !s.prefs.focuspro_enabled, updated_at: new Date().toISOString() } })),
      toggleTheme: () =>
        set((s) => ({
          prefs: {
            ...s.prefs,
            theme: s.prefs.theme === "deeptech" ? "lightdesk" : "deeptech",
            updated_at: new Date().toISOString(),
          },
        })),
    }),
    { name: "smartnotes-prefs" },
  ),
);
