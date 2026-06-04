// prefsStore — REQ-PREF-*, REQ-THEME-*, REQ-PRESET-*, REQ-FOCUS-*. Single source of truth so the
// editor header, command palette, and preferences panel stay in sync (REQ-FOCUS-06, REQ-PRESET-03).
// Phase 4b: DB-backed. hydrate() loads from GET /preferences; every change applies instantly
// (optimistic, no reload — NFR-PERF-04) and persists via PATCH /preferences (NFR-PERSIST-02). The
// localStorage cache (persist) just avoids a theme flash before hydrate resolves. NotePilot delay is
// snapped to the allowed 500..5000 step-500 range (REQ-NP-10, DEC-015).
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Preferences } from "@/lib/api/types";
import { prefsApi } from "@/lib/api/endpoints";

export const NOTEPILOT_DELAY_VALUES = [500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000] as const;

// Local defaults until the first hydrate (theme matches the DB default — REQ-THEME-01).
const DEFAULT_PREFS: Preferences = {
  user_id: "",
  theme: "deeptech",
  active_preset: "format_only",
  focuspro_enabled: false,
  notepilot_enabled: true,
  notepilot_delay_ms: 2000,
  updated_at: "",
};

interface PrefsState {
  prefs: Preferences;
  hydrate: () => Promise<void>;
  update: (patch: Partial<Preferences>) => void;
  toggleFocusPro: () => void;
  toggleTheme: () => void;
}

function sanitize(patch: Partial<Preferences>): Partial<Preferences> {
  const next = { ...patch };
  if (next.notepilot_delay_ms != null && !NOTEPILOT_DELAY_VALUES.includes(next.notepilot_delay_ms as 500)) {
    next.notepilot_delay_ms = NOTEPILOT_DELAY_VALUES.reduce((a, b) =>
      Math.abs(b - next.notepilot_delay_ms!) < Math.abs(a - next.notepilot_delay_ms!) ? b : a,
    );
  }
  return next;
}

// Persist only the user-editable fields server-side (drop user_id/updated_at).
function persistPatch(patch: Partial<Preferences>): void {
  const { user_id: _u, updated_at: _t, ...editable } = patch;
  if (Object.keys(editable).length === 0) return;
  prefsApi.update(editable).catch(() => {
    /* optimistic UI already applied; a transient persist failure is non-fatal */
  });
}

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      prefs: { ...DEFAULT_PREFS },

      hydrate: async () => {
        try {
          const prefs = await prefsApi.get();
          set({ prefs });
        } catch {
          /* keep cached/default prefs if the fetch fails */
        }
      },

      update: (patch) => {
        const clean = sanitize(patch);
        set((s) => ({ prefs: { ...s.prefs, ...clean } }));
        persistPatch(clean);
      },

      toggleFocusPro: () =>
        set((s) => {
          const focuspro_enabled = !s.prefs.focuspro_enabled;
          persistPatch({ focuspro_enabled });
          return { prefs: { ...s.prefs, focuspro_enabled } };
        }),

      toggleTheme: () =>
        set((s) => {
          const theme = s.prefs.theme === "deeptech" ? "lightdesk" : "deeptech";
          persistPatch({ theme });
          return { prefs: { ...s.prefs, theme } };
        }),
    }),
    { name: "smartnotes-prefs" },
  ),
);
