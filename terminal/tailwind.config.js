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
      keyframes: {
        "vl-dot0": {
          "0%":          { transform: "scale(0)", opacity: "0" },
          "16.7%":       { transform: "scale(1.15)", opacity: "1" },
          "22%":         { transform: "scale(1)" },
          "79.6%":       { transform: "scale(1)", opacity: "1" },
          "93.5%, 100%": { transform: "scale(0)", opacity: "0" },
        },
        "vl-dot1": {
          "0%, 13.9%":   { transform: "scale(0)", opacity: "0" },
          "30.6%":       { transform: "scale(1.15)", opacity: "1" },
          "36%":         { transform: "scale(1)" },
          "79.6%":       { transform: "scale(1)", opacity: "1" },
          "93.5%, 100%": { transform: "scale(0)", opacity: "0" },
        },
        "vl-dot2": {
          "0%, 27.8%":   { transform: "scale(0)", opacity: "0" },
          "44.4%":       { transform: "scale(1.15)", opacity: "1" },
          "50%":         { transform: "scale(1)" },
          "79.6%":       { transform: "scale(1)", opacity: "1" },
          "93.5%, 100%": { transform: "scale(0)", opacity: "0" },
        },
      },
      animation: {
        "vl-dot0": "vl-dot0 1.08s ease-in-out infinite",
        "vl-dot1": "vl-dot1 1.08s ease-in-out infinite",
        "vl-dot2": "vl-dot2 1.08s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
