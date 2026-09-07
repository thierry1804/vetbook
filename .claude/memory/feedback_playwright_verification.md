---
name: feedback-playwright-verification
description: "Validated workflow for verifying VetBook UI/behavior changes in a real browser when the Claude in Chrome extension isn't connected — temp-install Playwright, test, uninstall."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 8961cc69-88ef-4caa-bbd5-d20774894ccf
  modified: 2026-08-31T20:03:20.630Z
---

This project has no test suite and no persistent browser automation (the Claude in Chrome extension has been unavailable/not connected in every session so far). The workflow that worked repeatedly and was never corrected or objected to across a long session (2026-08-31, Phase A cleanup through the home screen redesign):

1. `npm install --no-save --no-audit --no-fund playwright` (temporary, not saved to package.json).
2. Write a throwaway Node script in the project root (not the scratchpad — see below) that spins up a tiny local static server, loads `index.html`, seeds `localStorage` with representative `vetbook_data` fixtures via `page.evaluate`, drives the real UI (clicks, not internal function calls — internal functions live inside `app.js`'s IIFE closure and aren't reachable from `page.evaluate`), and asserts via `page.evaluate` reading the DOM/localStorage back out.
3. Take screenshots (`page.screenshot`), actually view them with the Read tool before claiming something renders correctly — this caught a real logic bug (health ring semantics inverted) that would have shipped if only checked via lint/build.
4. Delete the throwaway script and screenshots, `rm -rf node_modules/playwright*`, `npm install` to restore the clean dependency set. Always done every time, never left installed.

**Why the throwaway script must live in the project root, not the scratchpad directory:** a repro script under `node_modules` resolution in the scratchpad failed with `ERR_MODULE_NOT_FOUND` for `playwright` (module resolution didn't reach the project's `node_modules`). Copying/writing the script into the project root fixed it immediately.

**Why this matters for future sessions:** this is the de facto test methodology for this project until a real test suite or persistent browser tooling exists. Reach for it before claiming any interactive/visual change works — static checks (`node --check`, `eslint`, `npm run build`) passing is not evidence the feature actually works, only that it doesn't crash on load.
