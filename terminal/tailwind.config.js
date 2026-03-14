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
        // Backgrounds
        "vo-base": "rgb(var(--vo-base) / <alpha-value>)",
        "vo-surface": "rgb(var(--vo-surface) / <alpha-value>)",
        "vo-elevated": "rgb(var(--vo-elevated) / <alpha-value>)",
        "vo-input": "rgb(var(--vo-input) / <alpha-value>)",
        // Borders
        "vo-border-subtle": "rgb(var(--vo-border-subtle) / <alpha-value>)",
        "vo-border": "rgb(var(--vo-border) / <alpha-value>)",
        // Text
        "vo-text": "rgb(var(--vo-text) / <alpha-value>)",
        "vo-text-secondary": "rgb(var(--vo-text-secondary) / <alpha-value>)",
        "vo-text-muted": "rgb(var(--vo-text-muted) / <alpha-value>)",
        // Accent
        accent: {
          bright: "rgb(var(--accent-bright) / <alpha-value>)",
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          dim: "rgb(var(--accent-dim) / <alpha-value>)",
          deep: "rgb(var(--accent-deep) / <alpha-value>)",
          muted: "rgb(var(--accent-muted) / <alpha-value>)",
          cyan: "rgb(var(--accent-cyan) / <alpha-value>)",
          blue: "rgb(var(--accent-blue) / <alpha-value>)",
          purple: "rgb(var(--accent-purple) / <alpha-value>)",
        },
        // Status
        status: {
          running: "rgb(var(--status-running) / <alpha-value>)",
          idle: "rgb(var(--status-idle) / <alpha-value>)",
          error: "rgb(var(--status-error) / <alpha-value>)",
          done: "rgb(var(--status-done) / <alpha-value>)",
        },
        // Diff
        diff: {
          added: "rgb(var(--diff-added) / <alpha-value>)",
          removed: "rgb(var(--diff-removed) / <alpha-value>)",
          modified: "rgb(var(--diff-modified) / <alpha-value>)",
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
