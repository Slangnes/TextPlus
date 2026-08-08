# @textplus/core — Roadmap

The runtime package: game state, qualities, situations, DOM rendering, HUD/themes, storage, and the public runtime API. Modern ES-module rebuild of Undum. This file is the package's single doc. (Repo-wide sequencing lives in the root `ROADMAP.md`.)

## Status

✅ Milestone 1 complete (April 2026), plus the first "Beyond Text" slices (quality-driven HUD rendering and state-driven theme rules) shipped 2026-08-08.

## Current Surface

| Module | Notes |
|---|---|
| `src/engine.ts` | Runtime orchestration: transitions, events, quality mutation with bounds, save/load state assembly, `reset()`, `validate()` |
| `src/qualities.ts` | Typed quality values, min/max clamping, mutation, serialization |
| `src/situation.ts` | Situation lookup, conditional links/content (throwing conditions hide the link, never crash), lifecycle hooks |
| `src/dom.ts` | jQuery-free DOM renderer: escape-first content, links nav, tags→CSS classes, ARIA contract, qualities fallback panel, theme helpers |
| `src/hud.ts` | `renderHud` (meters/badges/readouts) + `applyHudThemes` (`data-theme` from rule expressions) |
| `src/storage.ts` | localStorage-backed multi-slot save/load with version/corruption/quota validation |
| `src/types.ts` | Public contracts and save schema |
| `src/index.ts` | Package exports (`createGame` factory et al.) |

## Verification

Test standard: the traced Playwright E2E suite is the only test layer. Run from the repository root: `npm run test:all` (lint + builds + E2E).

E2E-verified through the workbench Play panel: engine boot/transitions/events, conditional links, engine-side quality clamping (asserted via `{quality}` interpolation so the HUD's display clamp can't mask it), HTML-escaped rendering, ARIA contract, situation tags as CSS classes, HUD meters/badges and theme rules, the qualities fallback panel, entry effects, adaptive text, save-state preservation across recompiles, and reset via Restart (`e2e/engine.spec.ts`, `e2e/workbench.spec.ts`).

**Not verified** (no app surface reaches them): `storage.ts` (save slots, corruption/version/quota handling), `engine.validate()`, `onExit` hooks, theme CSS custom properties, HUD `readout` entries, and error paths the author linter rejects before compile.

## Milestone history

- **M1 ✅** — engine, qualities, situations, DOM renderer, storage, types; Hello World demo playable. (Historical M1 gate details live in the root `ROADMAP.md`; its vitest-era test counts describe a suite that has since been replaced by the E2E standard.)
- **Beyond Text slices ✅ 2026-08-08** — `renderHud` + `applyHudThemes`, driven by the author DSL's `hud`/`theme when` directives.

## Ahead

- [ ] Save/load slot UI in the workbench Play panel (root ROADMAP M5) — the missing E2E surface for `storage.ts`
- [ ] Dedicated themes module and stylesheet assets (deferred since M1)
- [ ] A DSL/app surface for `onExit` hooks and theme CSS variables — or retire them from the public contract
- [ ] `engine.validate()`: wire into an app surface or fold into the author linter (currently unreachable)
- [ ] Beyond Text vision (root ROADMAP): custom situation renderers, situation modes, timed text, media hooks

## Drift Rules

- This file is the package's only doc — update it in the same change set as the code it describes.
- Every "Current Surface" row must be verified through the E2E suite, or listed under **Not verified** with the reason.
