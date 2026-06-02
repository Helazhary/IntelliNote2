import type { Config } from "tailwindcss";

// Theme tokens (DeepTech/LightDesk) are driven by CSS variables set per-theme in globals.css,
// enabling instant theme switching with no reload (REQ-THEME-03). Exact hex values are locked in
// Phase 3 (per SPEC Feature 8).
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        panel: "var(--color-panel)",
        accent: "var(--color-accent)",
        text: "var(--color-text)",
        muted: "var(--color-muted)",
        border: "var(--color-border)",
      },
      fontFamily: {
        // DEC-011: editor = monospace stack; UI chrome = system sans-serif.
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
        sans: ["ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
