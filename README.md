<p align="center">
  <img src=".github/assets/banner.jpg" alt="Volley" width="100%">
</p>

<p align="center">
  An open-source desktop app for running parallel AI coding sessions — each in its own isolated environment.
</p>

<p align="center">
  <a href="https://volley.build">Website</a> · <a href="https://github.com/volleybuild/volley/releases/latest">Download</a>
</p>

<!-- screenshot placeholder -->

## Features

- Parallel sessions in isolated git worktrees
- Built-in git — commit, push, PR, merge from the app
- Notes & todos for planning work
- Grid view — monitor all sessions at once
- Project switching across repos
- Sound effects & session pause/resume

## Install

Download the latest `.dmg` from the [Releases page](https://github.com/volleybuild/volley/releases/latest) and drag it to Applications.

> [!WARNING]
> You need a Claude API key or an active Claude subscription (Pro, Max) to use Volley. Add your key or sign in via Settings after launching.

macOS only for now. Windows & Linux coming soon.

> [!NOTE]
> The app is not code-signed yet. If macOS says it's "damaged", run:
> ```bash
> xattr -cr /Applications/Volley.app
> ```

## Quick Start

1. Download the `.dmg`, drag to Applications
2. Open a repo — auto-detects the project
3. Start sessions — describe the work, let agents run in parallel

## Development

```bash
# Terminal app (Electron)
cd terminal && npm install && npm run dev

# CLI
npm install && npm run build && npm link
```

## Contributing

We're building Volley in the open — contributions, ideas, and bug reports are welcome.

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

AGPL-3.0
