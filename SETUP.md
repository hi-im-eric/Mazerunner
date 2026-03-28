# MazeRunner Setup Guide

The project contains the actively maintained standalone prototype.

## First-Time Setup

```bash
npm.cmd install
```

## Run It

Preferred on Windows:

`Launch-MazeRunner-Standalone.cmd`

Manual start:

```bash
cd "C:\Users\ericw\Documents\Python Projects\Maze Runner"
npm.cmd start
```

Then open: `http://127.0.0.1:4173`

Do not open `mazerunner.html` directly as a `file://` page.

## Build Only (no server)

```bash
npm.cmd run build:standalone
```

This rebuilds `mazerunner.html` from `src/standalone/template.html` and the JS modules in `src/standalone/modules/`.

## Run Tests

```bash
npm.cmd run test:e2e
```

## Project Structure

- `mazerunner.html` — the built standalone app (generated, do not edit directly)
- `src/standalone/template.html` — main source template
- `src/standalone/modules/` — JS modules inlined during build
- `scripts/build-standalone.js` — build script
- `scripts/serve-standalone.js` — local static server
- `Launch-MazeRunner-Standalone.cmd` — one-click Windows launcher
- `tests/e2e/standalone.spec.js` — Playwright smoke tests
- `Fantasy Visual Assets/` — source art (dungeon backgrounds, glowing eyes, etc.)
- `Design Input/` — UI/UX design reference documents
- `System Research/` — deep research reports on enterprise system domains

## Troubleshooting

If port `4173` is already in use:

```bash
set PORT=4174
npm.cmd start
```

If dependencies are missing:

```bash
npm.cmd install
```
