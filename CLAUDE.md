# CLAUDE.md

**This directory is a git submodule** (`github.com/kennedydane/visual_tracking`). Commits here
go to that repository, not to oak-ed. The parent oak-ed CLAUDE.md's rules — no new hand-written
JS, the WebAwesome design system, the Django template conventions — **do not apply here**. This
is a standalone zero-dependency vanilla-JS app.

## Project Overview

A single-page web app for visual eye-tracking exercises. Users follow a moving target across an
HTML5 Canvas along mathematical paths (horizontal, vertical, figure-8, …) to train smooth
pursuit. Optional webcam eye tracking via WebGazer.js, loaded from CDN.

## Running Locally

No build step. Open `index.html` directly, or serve it:

```bash
python3 -m http.server 8000
```

A local server is **required** for the webcam feature — browsers block camera access on
`file://` URLs.

## Architecture

Three files do everything. `script.js` is one `DOMContentLoaded` handler; find its parts by
grep rather than line number (they move):

| Part | Find it with |
|---|---|
| Movement patterns | `grep -n 'const patterns'` |
| Runtime settings state | `grep -n 'const config'` |
| Render function | `grep -n 'const draw'` |
| `requestAnimationFrame` loop | `grep -n 'const loop'` |
| Pattern transition lerp | `grep -n 'transition'` |
| WebGazer calibration | `grep -n 'webgazer'` |

Note these are arrow-function **consts**, not `function` declarations, so `grep 'function draw'`
finds nothing.

- **`index.html`** — full UI markup: settings panel, calibration overlay, cycle controls,
  session timer. WebGazer.js is loaded from CDN at the bottom.
- **`style.css`** — CSS custom properties for theming (dark/light/contrast/neon/custom); theme
  switching via a `data-theme` attribute on `<body>`.

## Key design patterns

- **Normalized coordinates**: every pattern outputs `{x, y}` in `[-1, 1]` from a time parameter
  `t`. The render function maps these to pixels, accounting for ball radius as margin, which
  keeps pattern logic resolution-independent. Waypoint-based patterns interpolate via
  `getWaypoint()`.
- **Per-pattern speed memory**: `patternSpeeds` stores a preferred speed per pattern; switching
  patterns restores that pattern's saved speed.
- **Trail effect**: instead of `clearRect()`, each frame draws a semi-transparent background
  fill, leaving ghosted previous positions.
- **Persistent state**: settings are serialized to `localStorage`. Find the full set with
  `grep -o "localStorage.setItem('[^']*'" script.js` — there are currently six keys
  (`eye-tracking-settings`, `-theme`, `-timer`, `-stealth`, `-custom-bg`, `-custom-ball`), and
  hard-coded lists of them go stale.

## Vendored dependencies

`mediapipe/` contains vendored MediaPipe Face Mesh WASM binaries (~17MB). Binary assets — do
not modify.

## Known inconsistency with the parent project

`index.html` loads Google Fonts and `webgazer.cs.brown.edu` from CDNs. oak-ed deliberately
self-hosts fonts because children load its pages. Not yet reconciled; worth knowing before
embedding this page more deeply in the games portal.
