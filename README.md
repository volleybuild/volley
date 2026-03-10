# Volley

An open-source desktop app for running multiple AI coding sessions in parallel. Built-in git, grid view, and project management.

**[volley.build](https://volley.build)** &middot; **[Download](https://github.com/volleybuild/volley/releases/latest)**

## Features

- **Parallel sessions** — Run multiple AI coding sessions at the same time. Each one gets its own branch and workspace.
- **Built-in git** — Commit, push, and manage branches from inside the app. Diff stats update live per session.
- **Grid view** — See all sessions at once in a grid layout.
- **Project switching** — Switch between repos. Volley auto-detects projects and keeps state per-project.
- **Session lifecycle** — Sessions move through todo, in progress, and completed. Pick up where you left off.
- **Powered by Claude** — Uses the Claude agent SDK under the hood. Bring your own Anthropic API key.

## Install

Download the latest `.dmg` from the [releases page](https://github.com/volleybuild/volley/releases/latest) and drag it to Applications.

macOS only for now. Windows and Linux coming soon.

## Development

```bash
# Terminal app (Electron)
cd terminal
npm install
npm run dev

# CLI
npm install
npm run build
npm link
```

### Requirements

- Node.js >= 20
- Git >= 2.15

## License

MIT
