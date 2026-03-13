# Volley — Design Direction for Agent

You are redesigning the Volley Electron app UI. Here is the brand identity and design language to follow.

## Brand

**Name:** Volley
**What it does:** Dispatch parallel AI coding agents, each in isolated git worktrees. CLI command is `vo`.
**Website:** volley.build

## Logo

The logo is three dots arranged in a V shape:

```
●       ●
    ●
```

- Top-left dot: Mint (#34d399)
- Top-right dot: Amber (#fbbf24)  
- Bottom-center dot: Coral (#f87171)

The three dots represent three parallel agents. The colors map to the app's status system — running (mint), idle/working (amber), needs attention (coral). The logo IS the product's visual language.

The logo SVG is at `volley-logo.svg` in the repo. Do not modify the logo itself. Use it as-is in the title bar, about screen, and loading states.

## Color System

The UI theme is called "Electric Mint." The palette is built around the three logo colors on deep dark backgrounds.

### Backgrounds (dark, layered)
- `--bg-base`: #08080c — App background, deepest layer
- `--bg-surface`: #0e1014 — Panels, sidebar
- `--bg-elevated`: #14171d — Cards, popups, hovers
- `--bg-input`: #1a1e26 — Input fields, search bars

### Borders
- `--border-subtle`: #1e2430 — Panel dividers
- `--border-default`: #2a3140 — Input borders, focus states

### Text
- `--text-primary`: #e8eaf0 — Headings, primary content
- `--text-secondary`: #8b919e — Labels, timestamps
- `--text-muted`: #505664 — Disabled, placeholders

### Accent (Mint — primary action color)
- `--accent-bright`: #6ee7b7 — Active states, selected items
- `--accent-default`: #34d399 — Links, icons, highlights
- `--accent-dim`: #10b981 — Secondary indicators
- `--accent-deep`: #059669 — Background tints
- `--accent-muted`: #064e3b — Subtle fills, badge backgrounds
- `--accent-glow`: rgba(110, 231, 183, 0.12) — Focus rings, glow effects

### Status Colors (these ARE the logo colors)
- `--status-running`: #34d399 (mint) — Agent actively running
- `--status-idle`: #fbbf24 (amber) — Agent paused/idle
- `--status-error`: #f87171 (coral) — Error or needs attention
- `--status-done`: #8b919e (gray) — Completed

### Diff Colors
- `--diff-added`: #34d399 (mint)
- `--diff-removed`: #f87171 (coral)
- `--diff-modified`: #fbbf24 (amber)

Notice: the three logo colors (mint, amber, coral) recur as status indicators, diff markers, and throughout the UI. This is intentional — the brand colors have functional meaning everywhere.

## Typography

Use monospace as the primary font throughout. This is a developer tool.

- **Primary:** `"JetBrains Mono", "Fira Code", "SF Mono", monospace`
- **UI labels (where variable-width helps):** `"Inter", "SF Pro", -apple-system, sans-serif`

### Sizes
- Session name: 14px, weight 600
- Branch name: 12px, weight 400
- Body/terminal: 13px, weight 400
- Section headers: 11px, weight 600, uppercase, letter-spacing 0.08em
- Timestamps: 11px, weight 400
- Status badges: 10px, weight 700, uppercase

## Layout

Three-panel layout:
- **Left sidebar** (240px): Session list with status dots, branch names, diff stats
- **Center**: Terminal view or diff view for the selected session
- **Right sidebar** (260px): File tree for the selected session's worktree

Panel dividers: 1px solid `--border-subtle`. Panels should feel connected, not boxed.

## Key Component Rules

### Session cards (sidebar)
- Status dot: 8px circle using `--status-*` colors
- Running status dots should pulse (opacity 0.4→1.0, 2s ease-in-out, infinite)
- Selected card: background `--accent-muted`, left border 2px solid `--accent-bright`
- Hover: background `--bg-elevated`
- Show diff stats as small colored badges: mint for added, coral for removed, amber for modified

### Terminal area
- Background: `--bg-base` (darkest)
- No chrome — terminal goes edge-to-edge with 12px padding
- Thin scrollbar (6px), `--border-default` thumb

### Status bar (bottom)
- Height: 28px, background `--bg-surface`
- Left: session count. Right: connection status
- Running count in `--accent-default`

## Glow & Effects

Use the mint glow sparingly:
- Selected session card: `box-shadow: 0 0 20px var(--accent-glow)`
- Running status dots: `box-shadow: 0 0 6px var(--status-running)`
- Primary buttons on hover: `box-shadow: 0 4px 16px rgba(110, 231, 183, 0.2)`
- App background: use `radial-gradient(ellipse at 30% 20%, #0f1a1a, #08080c)` for subtle depth

**Rule: green glows from content, not painted on chrome.** Use accent color for status, actions, and active states. Never for large surfaces.

## Animation

Keep motion fast and purposeful:
- Hover transitions: 80ms
- Panel switches: 120ms cross-fade
- New session: slide down + fade in, 200ms
- Session removal: fade out + collapse, 150ms
- No bounce, no spring physics. Crisp.

## Do's and Don'ts

**Do:**
- Use the three logo colors (mint/amber/coral) consistently for status throughout the UI
- Keep the terminal area clean and chrome-free
- Use monospace everywhere
- Make the sidebar scannable — status dots are the fastest signal

**Don't:**
- Don't use green/amber/coral for large background fills
- Don't use border radius larger than 8px
- Don't add decorative elements
- Don't use gradients on text (except the logo wordmark)
- Don't use macOS vibrancy/transparency — keep surfaces opaque
