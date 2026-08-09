# @textplus/core

The TextPlus runtime — a modern ES-module rebuild of [Undum](https://github.com/idmillington/undum): game state, qualities, situations, DOM rendering, HUD/themes, and storage. Milestone 1 complete (plus the first "Beyond Text" slices); this is the package's real documentation.

## Using it

Most authors never touch core directly — write TextPlus DSL and let `@textplus/author` compile it (the workbench does this live; `textplus-author compile` does it from the command line). Core is the layer you use when you want to drive a game programmatically or embed one in your own page.

```js
import { createGame } from '@textplus/core';

const engine = createGame(config);   // config: a GameConfig — compile one from DSL,
                                     // or see packages/demo/hello-world/game.ts for a
                                     // complete hand-written, documented example
```

The three demo games (`packages/demo/`) are the reference for direct-core usage: each `index.html` mounts a game with the DOM renderer, and each `game.ts` documents the config shape in commented detail.

## Module surface

| Module | What it gives you |
|---|---|
| `engine.ts` | `GameEngine` via the `createGame(config)` factory: `goToSituation`, quality get/set/mutate (clamped to declared bounds), `reset()`, situation history (`hasSituationBeenVisited`, `getSituationHistory`), event subscriptions (`onSituationChange`, `onQualityChange`), save-state assembly (`getSaveState`/`loadState`, version-checked), `validate()` |
| `qualities.ts` | Typed quality values (`number`/`boolean`/`string`), min/max clamping, mutation rules, serialization |
| `situation.ts` | Situation lookup and routing; conditional links and function content evaluated against live qualities — a throwing condition hides its link, never crashes; `onEnter`/`onExit` hooks with swallowed errors |
| `dom.ts` | jQuery-free renderer: `.tp-content`/`.tp-title`/`.tp-body`, one button per available link, escape-first content (raw HTML renders as text), situation tags as CSS classes, ARIA contract (`role=main`, `aria-live=polite`, `nav[aria-label="Choices"]`), `renderQualities` fallback panel |
| `hud.ts` | `renderHud` (meters with ARIA geometry, badges shown when truthy, readouts) and `applyHudThemes` (`data-theme` attribute driven by rule expressions; last matching rule wins) |
| `storage.ts` | `LocalStorageHandler`: multi-slot save/load under `textplus-save:<slot>`, version/corruption/quota validation with typed errors (`SaveNotFoundError`, `StorageQuotaExceededError`) |
| `types.ts` | The public contracts: `GameConfig`, `QualityDefinition`, `SituationDefinition`, save schema |

## Behavior guarantees

- **Escape-first rendering**: raw HTML in content is escaped, never executed (E2E-asserted with live injection payloads).
- **Clamping is the engine's**, not the display's: mutations respect declared `min`/`max` before any HUD rounding.
- **Failure-safe interactivity**: throwing link conditions hide the link; failing effects and lifecycle hooks are logged, never take down the UI.
- **State survives recompiles**: `getSaveState`/`loadState` round-trips a playthrough; loading into a config that dropped the current situation falls back to a fresh start instead of throwing.

## Verification

The traced Playwright E2E suite is the only test layer (`npm run test:all` from the repo root). Core is exercised through the workbench Play panel: boot/transitions/events, conditional links, clamping via `{quality}` interpolation, escaped rendering, ARIA and tags, HUD meters/badges and theme rules, the qualities fallback panel, entry effects, adaptive text, save-state preservation across recompiles, and Restart (`e2e/engine.spec.ts`, `e2e/workbench.spec.ts`).

**Not verified** (no app surface reaches them — tracked in the root ROADMAP): `storage.ts` (awaits the M5 save/load UI), `engine.validate()`, `onExit` hooks, theme CSS custom properties, and HUD `readout` entries.

## Drift Rules

- This file is the package's only doc — update it in the same change set as the code it describes.
- Open work lives in the root `ROADMAP.md` (M5 "Core follow-ups"), not here.
