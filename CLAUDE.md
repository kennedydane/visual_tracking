# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A zero-dependency, single-page web application for visual eye tracking exercises. Users follow a moving target across an HTML5 Canvas along various mathematical paths (horizontal, vertical, figure-8, etc.) to improve eye flexibility and smooth pursuit movements. Optional webcam-based eye tracking is provided via WebGazer.js (loaded from CDN).

## Running Locally

No build step. Open `index.html` directly in a browser, or serve via any static server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

A local server is **required** for the webcam eye tracking feature (browsers block camera access on `file://` URLs).

## Architecture

This is a vanilla JS single-page app — three files do everything:

- **`index.html`** — Full UI markup including the settings panel, calibration overlay, cycle controls, and session timer. WebGazer.js is loaded from CDN at the bottom.
- **`script.js`** — All application logic in a single `DOMContentLoaded` handler. Key sections:
  - **`patterns` object** (~line 111) — Dictionary of movement pattern functions. Each returns normalized `{x, y}` coordinates in the `[-1, 1]` range from a time parameter `t`. Waypoint-based patterns use the `getWaypoint()` helper for smooth interpolation.
  - **`config` object** (~line 57) — Runtime settings state (speed, size, pattern, trail, etc.).
  - **`draw()`** (~line 583) — Single render function: clears/trails canvas, draws the path preview, renders ball(s) with position from the active pattern function, and plots the eye tracking gaze overlay with live accuracy calculation.
  - **`loop()`** (~line 737) — `requestAnimationFrame` loop that handles elapsed time, session timer, auto-cycle rotation, and pattern transitions.
  - **Transition system** (~line 83) — Smooth interpolation between patterns using an 800ms ease-in-out lerp between the old and new pattern functions.
  - **WebGazer integration** (~line 279) — Calibration flow with 9-point click training, gaze listener, and rolling accuracy average.
- **`style.css`** — CSS custom properties for theming (dark/light/contrast/neon/custom). Theme switching works via `data-theme` attribute on `<body>`.

## Key Design Patterns

- **Normalized coordinates**: All patterns output `[-1, 1]` values. The `draw()` function maps these to screen pixels, accounting for ball radius as margin. This keeps pattern logic resolution-independent.
- **Per-pattern speed memory**: `patternSpeeds` object stores the user's preferred speed for each pattern individually. Switching patterns restores that pattern's saved speed.
- **Persistent state**: All settings are serialized to `localStorage` under `eye-tracking-settings`, `eye-tracking-theme`, and `eye-tracking-timer` keys.
- **Trail effect**: Instead of `clearRect()`, draws a semi-transparent background fill each frame, leaving ghosted previous positions.

## Vendored Dependencies

The `mediapipe/` directory contains vendored MediaPipe Face Mesh WASM binaries (~17MB). These are binary assets — do not modify them.
