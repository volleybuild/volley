import type { Config } from "tailwindcss";

const config: Config = {
  content: ["src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Outfit Variable"', '"Outfit"', "sans-serif"],
        sans: ['"Inter"', '"SF Pro"', "-apple-system", "sans-serif"],
        mono: [
          '"JetBrains Mono"',
          '"Fira Code"',
          '"SF Mono"',
          "monospace",
        ],
      },
      colors: {
        "vo-base": "#09090b",
        "vo-surface": "#0c0c0e",
        "vo-elevated": "#161719",
        "vo-input": "#1c1d21",
        "vo-border-subtle": "#1f2125",
        "vo-border": "#2a2d33",
        "vo-text": "#e4e4e7",
        "vo-text-secondary": "#a1a1aa",
        "vo-text-muted": "#52525b",
        accent: {
          bright: "#6ee7b7",
          DEFAULT: "#34d399",
          dim: "#10b981",
          deep: "#059669",
          muted: "#064e3b",
          cyan: "#22d3ee",
          blue: "#60a5fa",
          purple: "#c084fc",
        },
        status: {
          running: "#6ee7b7",
          idle: "#fbbf24",
          error: "#f87171",
          done: "#71717a",
        },
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

export default config;
