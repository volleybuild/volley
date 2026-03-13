# Contributing to Volley

Thanks for your interest in contributing to Volley! We appreciate your help in making the project better.

## CLA

First-time contributors must sign the Contributor License Agreement. The CLA bot will prompt you on your first pull request.

## Getting Started

1. Fork and clone the repo
2. Set up development:
   - **CLI:** `npm install && npm run build`
   - **Terminal app:** `cd terminal && npm install && npm run dev`
3. Branch naming: `feature/<name>`, `fix/<name>`, `docs/<name>`

## Pull Requests

- One concern per PR
- Describe what and why
- Link related issues
- Ensure it builds (CLI + terminal)

## Reporting Bugs

Use the [bug report issue template](https://github.com/volleybuild/volley/issues/new?template=bug_report.yml).

## Code Style

- TypeScript everywhere
- CLI: ESM modules
- Electron main/preload: CommonJS
- Renderer: React + Tailwind (no custom CSS)
- Main process logging: use `log()`/`logError()` from `logger.ts`, never `console.log`

## License

Contributions are licensed under AGPL-3.0.
