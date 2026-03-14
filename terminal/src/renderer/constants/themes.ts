import type { ITheme } from "@xterm/xterm";

export type ThemeName = "dark" | "light" | "monokai" | "mono";

export interface ThemeColors {
  // Backgrounds
  "vo-base": string;
  "vo-surface": string;
  "vo-elevated": string;
  "vo-input": string;
  // Borders
  "vo-border-subtle": string;
  "vo-border": string;
  // Text
  "vo-text": string;
  "vo-text-secondary": string;
  "vo-text-muted": string;
  // Accent
  "accent-bright": string;
  accent: string;
  "accent-dim": string;
  "accent-deep": string;
  "accent-muted": string;
  "accent-cyan": string;
  "accent-blue": string;
  "accent-purple": string;
  // Status
  "status-running": string;
  "status-idle": string;
  "status-error": string;
  "status-done": string;
  // Diff
  "diff-added": string;
  "diff-removed": string;
  "diff-modified": string;
  // Scrollbar
  "scrollbar-thumb": string;
  "scrollbar-hover": string;
  // Kbd
  "kbd-border": string;
  "kbd-text": string;
  // File viewer
  "line-number": string;
  "hljs-bg": string;
  // Note editor
  "note-h1": string;
  "note-h2": string;
  "note-h3": string;
  "note-body": string;
  "note-muted": string;
  "note-placeholder": string;
  "note-blockquote-border": string;
  // Diff viewer
  "diff-ins-bg": string;
  "diff-ins-text": string;
  "diff-ins-highlight": string;
  "diff-del-bg": string;
  "diff-del-text": string;
  "diff-del-highlight": string;
  "diff-info-bg": string;
  "diff-info-text": string;
  "diff-linenumber": string;
  "diff-code-text": string;
}

export interface ThemeDefinition {
  label: string;
  iconVariant: "dark" | "light";
  colors: ThemeColors;
  terminal: ITheme;
}

// ── Dark Theme (existing) ──────────────────────────────────────────────

const darkColors: ThemeColors = {
  "vo-base": "#09090b",
  "vo-surface": "#0c0c0e",
  "vo-elevated": "#161719",
  "vo-input": "#1c1d21",
  "vo-border-subtle": "#1f2125",
  "vo-border": "#2a2d33",
  "vo-text": "#e4e4e7",
  "vo-text-secondary": "#a1a1aa",
  "vo-text-muted": "#52525b",
  "accent-bright": "#6ee7b7",
  accent: "#34d399",
  "accent-dim": "#10b981",
  "accent-deep": "#059669",
  "accent-muted": "#064e3b",
  "accent-cyan": "#22d3ee",
  "accent-blue": "#60a5fa",
  "accent-purple": "#c084fc",
  "status-running": "#6ee7b7",
  "status-idle": "#fbbf24",
  "status-error": "#f87171",
  "status-done": "#71717a",
  "diff-added": "#6ee7b7",
  "diff-removed": "#f87171",
  "diff-modified": "#fbbf24",
  "scrollbar-thumb": "#2a3140",
  "scrollbar-hover": "#34d399",
  "kbd-border": "#2a3140",
  "kbd-text": "#8b919e",
  "line-number": "#505664",
  "hljs-bg": "#09090b",
  "note-h1": "#f3f4f6",
  "note-h2": "#e5e7eb",
  "note-h3": "#d1d5db",
  "note-body": "#d1d5db",
  "note-muted": "#9ca3af",
  "note-placeholder": "#4b5563",
  "note-blockquote-border": "rgba(110, 231, 183, 0.3)",
  "diff-ins-bg": "rgba(110, 231, 183, 0.08)",
  "diff-ins-text": "#6ee7b7",
  "diff-ins-highlight": "rgba(110, 231, 183, 0.18)",
  "diff-del-bg": "rgba(248, 113, 113, 0.08)",
  "diff-del-text": "#f87171",
  "diff-del-highlight": "rgba(248, 113, 113, 0.18)",
  "diff-info-bg": "rgba(96, 165, 250, 0.05)",
  "diff-info-text": "#60a5fa",
  "diff-linenumber": "#52525b",
  "diff-code-text": "#a1a1aa",
};

const darkTerminal: ITheme = {
  background: "#08080c",
  foreground: "#e8eaf0",
  cursor: "#6ee7b7",
  cursorAccent: "#08080c",
  selectionBackground: "#064e3b",
  selectionForeground: "#e8eaf0",
  black: "#08080c",
  red: "#f87171",
  green: "#6ee7b7",
  yellow: "#fbbf24",
  blue: "#60a5fa",
  magenta: "#c084fc",
  cyan: "#22d3ee",
  white: "#e8eaf0",
  brightBlack: "#505664",
  brightRed: "#fca5a5",
  brightGreen: "#a7f3d0",
  brightYellow: "#fde68a",
  brightBlue: "#93c5fd",
  brightMagenta: "#d8b4fe",
  brightCyan: "#67e8f9",
  brightWhite: "#ffffff",
};

// ── Light Theme ────────────────────────────────────────────────────────

const lightColors: ThemeColors = {
  "vo-base": "#ffffff",
  "vo-surface": "#f8fafc",
  "vo-elevated": "#f1f5f9",
  "vo-input": "#e2e8f0",
  "vo-border-subtle": "#e2e8f0",
  "vo-border": "#cbd5e1",
  "vo-text": "#1e293b",
  "vo-text-secondary": "#475569",
  "vo-text-muted": "#94a3b8",
  "accent-bright": "#059669",
  accent: "#10b981",
  "accent-dim": "#34d399",
  "accent-deep": "#6ee7b7",
  "accent-muted": "#d1fae5",
  "accent-cyan": "#0891b2",
  "accent-blue": "#2563eb",
  "accent-purple": "#7c3aed",
  "status-running": "#059669",
  "status-idle": "#d97706",
  "status-error": "#dc2626",
  "status-done": "#6b7280",
  "diff-added": "#059669",
  "diff-removed": "#dc2626",
  "diff-modified": "#d97706",
  "scrollbar-thumb": "#cbd5e1",
  "scrollbar-hover": "#10b981",
  "kbd-border": "#cbd5e1",
  "kbd-text": "#64748b",
  "line-number": "#94a3b8",
  "hljs-bg": "#ffffff",
  "note-h1": "#1e293b",
  "note-h2": "#334155",
  "note-h3": "#475569",
  "note-body": "#475569",
  "note-muted": "#64748b",
  "note-placeholder": "#94a3b8",
  "note-blockquote-border": "rgba(16, 185, 129, 0.4)",
  "diff-ins-bg": "rgba(5, 150, 105, 0.08)",
  "diff-ins-text": "#059669",
  "diff-ins-highlight": "rgba(5, 150, 105, 0.15)",
  "diff-del-bg": "rgba(220, 38, 38, 0.08)",
  "diff-del-text": "#dc2626",
  "diff-del-highlight": "rgba(220, 38, 38, 0.15)",
  "diff-info-bg": "rgba(37, 99, 235, 0.05)",
  "diff-info-text": "#2563eb",
  "diff-linenumber": "#94a3b8",
  "diff-code-text": "#475569",
};

const lightTerminal: ITheme = {
  background: "#ffffff",
  foreground: "#1e293b",
  cursor: "#059669",
  cursorAccent: "#ffffff",
  selectionBackground: "#d1fae5",
  selectionForeground: "#1e293b",
  black: "#1e293b",
  red: "#dc2626",
  green: "#059669",
  yellow: "#d97706",
  blue: "#2563eb",
  magenta: "#7c3aed",
  cyan: "#0891b2",
  white: "#f8fafc",
  brightBlack: "#64748b",
  brightRed: "#ef4444",
  brightGreen: "#10b981",
  brightYellow: "#f59e0b",
  brightBlue: "#3b82f6",
  brightMagenta: "#8b5cf6",
  brightCyan: "#06b6d4",
  brightWhite: "#ffffff",
};

// ── Monokai Theme ──────────────────────────────────────────────────────

const monokaiColors: ThemeColors = {
  "vo-base": "#272822",
  "vo-surface": "#2d2e27",
  "vo-elevated": "#3e3d32",
  "vo-input": "#49483e",
  "vo-border-subtle": "#3e3d32",
  "vo-border": "#555549",
  "vo-text": "#f8f8f2",
  "vo-text-secondary": "#a6a69b",
  "vo-text-muted": "#75715e",
  "accent-bright": "#a6e22e",
  accent: "#a6e22e",
  "accent-dim": "#86c10d",
  "accent-deep": "#6ca00b",
  "accent-muted": "#3a5409",
  "accent-cyan": "#66d9ef",
  "accent-blue": "#66d9ef",
  "accent-purple": "#ae81ff",
  "status-running": "#a6e22e",
  "status-idle": "#e6db74",
  "status-error": "#f92672",
  "status-done": "#75715e",
  "diff-added": "#a6e22e",
  "diff-removed": "#f92672",
  "diff-modified": "#e6db74",
  "scrollbar-thumb": "#49483e",
  "scrollbar-hover": "#a6e22e",
  "kbd-border": "#49483e",
  "kbd-text": "#a6a69b",
  "line-number": "#75715e",
  "hljs-bg": "#272822",
  "note-h1": "#f8f8f2",
  "note-h2": "#e8e8e2",
  "note-h3": "#cfcfc2",
  "note-body": "#cfcfc2",
  "note-muted": "#a6a69b",
  "note-placeholder": "#75715e",
  "note-blockquote-border": "rgba(166, 226, 46, 0.3)",
  "diff-ins-bg": "rgba(166, 226, 46, 0.08)",
  "diff-ins-text": "#a6e22e",
  "diff-ins-highlight": "rgba(166, 226, 46, 0.18)",
  "diff-del-bg": "rgba(249, 38, 114, 0.08)",
  "diff-del-text": "#f92672",
  "diff-del-highlight": "rgba(249, 38, 114, 0.18)",
  "diff-info-bg": "rgba(102, 217, 239, 0.05)",
  "diff-info-text": "#66d9ef",
  "diff-linenumber": "#75715e",
  "diff-code-text": "#a6a69b",
};

const monokaiTerminal: ITheme = {
  background: "#272822",
  foreground: "#f8f8f2",
  cursor: "#f8f8f0",
  cursorAccent: "#272822",
  selectionBackground: "#49483e",
  selectionForeground: "#f8f8f2",
  black: "#272822",
  red: "#f92672",
  green: "#a6e22e",
  yellow: "#f4bf75",
  blue: "#66d9ef",
  magenta: "#ae81ff",
  cyan: "#a1efe4",
  white: "#f8f8f2",
  brightBlack: "#75715e",
  brightRed: "#f92672",
  brightGreen: "#a6e22e",
  brightYellow: "#f4bf75",
  brightBlue: "#66d9ef",
  brightMagenta: "#ae81ff",
  brightCyan: "#a1efe4",
  brightWhite: "#f9f8f5",
};

// ── Mono Theme (Black & White) ─────────────────────────────────────────

const monoColors: ThemeColors = {
  "vo-base": "#000000",
  "vo-surface": "#0a0a0a",
  "vo-elevated": "#1a1a1a",
  "vo-input": "#222222",
  "vo-border-subtle": "#222222",
  "vo-border": "#333333",
  "vo-text": "#e0e0e0",
  "vo-text-secondary": "#999999",
  "vo-text-muted": "#666666",
  "accent-bright": "#ffffff",
  accent: "#cccccc",
  "accent-dim": "#999999",
  "accent-deep": "#777777",
  "accent-muted": "#333333",
  "accent-cyan": "#cccccc",
  "accent-blue": "#cccccc",
  "accent-purple": "#cccccc",
  "status-running": "#ffffff",
  "status-idle": "#999999",
  "status-error": "#bbbbbb",
  "status-done": "#555555",
  "diff-added": "#cccccc",
  "diff-removed": "#888888",
  "diff-modified": "#aaaaaa",
  "scrollbar-thumb": "#333333",
  "scrollbar-hover": "#666666",
  "kbd-border": "#333333",
  "kbd-text": "#888888",
  "line-number": "#555555",
  "hljs-bg": "#000000",
  "note-h1": "#e0e0e0",
  "note-h2": "#cccccc",
  "note-h3": "#b0b0b0",
  "note-body": "#b0b0b0",
  "note-muted": "#888888",
  "note-placeholder": "#555555",
  "note-blockquote-border": "rgba(255, 255, 255, 0.2)",
  "diff-ins-bg": "rgba(255, 255, 255, 0.06)",
  "diff-ins-text": "#cccccc",
  "diff-ins-highlight": "rgba(255, 255, 255, 0.12)",
  "diff-del-bg": "rgba(255, 255, 255, 0.03)",
  "diff-del-text": "#888888",
  "diff-del-highlight": "rgba(255, 255, 255, 0.08)",
  "diff-info-bg": "rgba(255, 255, 255, 0.03)",
  "diff-info-text": "#999999",
  "diff-linenumber": "#555555",
  "diff-code-text": "#999999",
};

const monoTerminal: ITheme = {
  background: "#000000",
  foreground: "#e0e0e0",
  cursor: "#ffffff",
  cursorAccent: "#000000",
  selectionBackground: "#333333",
  selectionForeground: "#ffffff",
  black: "#000000",
  red: "#aaaaaa",
  green: "#cccccc",
  yellow: "#bbbbbb",
  blue: "#999999",
  magenta: "#aaaaaa",
  cyan: "#bbbbbb",
  white: "#e0e0e0",
  brightBlack: "#555555",
  brightRed: "#cccccc",
  brightGreen: "#e0e0e0",
  brightYellow: "#d0d0d0",
  brightBlue: "#bbbbbb",
  brightMagenta: "#cccccc",
  brightCyan: "#d0d0d0",
  brightWhite: "#ffffff",
};

// ── Theme Registry ─────────────────────────────────────────────────────

export const themes: Record<ThemeName, ThemeDefinition> = {
  dark: { label: "Dark", iconVariant: "dark", colors: darkColors, terminal: darkTerminal },
  light: { label: "Light", iconVariant: "light", colors: lightColors, terminal: lightTerminal },
  monokai: { label: "Monokai", iconVariant: "dark", colors: monokaiColors, terminal: monokaiTerminal },
  mono: { label: "Mono", iconVariant: "dark", colors: monoColors, terminal: monoTerminal },
};

export const themeNames: ThemeName[] = ["dark", "light", "monokai", "mono"];

export function getTerminalTheme(name: ThemeName): ITheme {
  return themes[name].terminal;
}

// CSS variables used by Tailwind (need RGB channels for opacity modifier support)
const tailwindColorKeys = new Set([
  "vo-base", "vo-surface", "vo-elevated", "vo-input",
  "vo-border-subtle", "vo-border",
  "vo-text", "vo-text-secondary", "vo-text-muted",
  "accent-bright", "accent", "accent-dim", "accent-deep", "accent-muted",
  "accent-cyan", "accent-blue", "accent-purple",
  "status-running", "status-idle", "status-error", "status-done",
  "diff-added", "diff-removed", "diff-modified",
]);

function hexToRgbChannels(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r} ${g} ${b}`;
}

export function applyThemeToDOM(name: ThemeName): void {
  const { colors } = themes[name];
  const root = document.documentElement;
  root.dataset.theme = name;
  for (const [key, value] of Object.entries(colors)) {
    if (tailwindColorKeys.has(key) && value.startsWith("#")) {
      // Store as RGB channels for Tailwind opacity modifier support
      root.style.setProperty(`--${key}`, hexToRgbChannels(value));
    } else {
      root.style.setProperty(`--${key}`, value);
    }
  }
}
