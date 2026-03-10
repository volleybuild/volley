/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["src/renderer/**/*.{html,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', '"SF Mono"', 'monospace'],
        sans: ['"Inter"', '"SF Pro"', '-apple-system', 'sans-serif'],
      },
      colors: {
        // Backgrounds — deeper, richer blacks
        "vo-base": "#09090b",
        "vo-surface": "#0c0c0e",
        "vo-elevated": "#161719",
        "vo-input": "#1c1d21",
        // Borders — subtle cool grays
        "vo-border-subtle": "#1f2125",
        "vo-border": "#2a2d33",
        // Text — neutral hierarchy
        "vo-text": "#e4e4e7",
        "vo-text-secondary": "#a1a1aa",
        "vo-text-muted": "#52525b",
        // Accent (mint) — reserved for signals
        accent: {
          bright: "#6ee7b7",
          DEFAULT: "#34d399",
          dim: "#10b981",
          deep: "#059669",
          muted: "#064e3b",
          // Secondary accents
          cyan: "#22d3ee",
          blue: "#60a5fa",
          purple: "#c084fc",
        },
        // Status
        status: {
          running: "#6ee7b7",
          idle: "#fbbf24",
          error: "#f87171",
          done: "#71717a",
        },
        // Diff
        diff: {
          added: "#6ee7b7",
          removed: "#f87171",
          modified: "#fbbf24",
        },
      },
    },
  },
  plugins: [],
};
