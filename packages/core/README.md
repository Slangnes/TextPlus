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

**Content is HTML, and the renderer trusts it.** `DomRenderer` injects situation content via `innerHTML` without sanitizing. The author pipeline escapes raw HTML before it ever reaches core (E2E-verified with live injection payloads), so DSL-compiled games are safe — but if you hand-write a `GameConfig`, sanitizing content is **your** responsibility.

## Module surface

| Module | What it gives you |
|---|---|
| `engine.ts` | `GameEngine` via the `createGame(config)` factory: `goToSituation`/`followLink`, `getAvailableLinks`, quality get/set/mutate (clamped to declared bounds), `reset()`, situation history (`hasSituationBeenVisited`, `getSituationHistory`), **worlds/modes** (`goToWorld` with per-world resume, `getCurrentWorld`, `onWorldChange`; a declared string quality named `world` is engine-maintained), **the turn clock** (`getTurn`, `wait(n)`, `GameConfig.schedule` every/at entries firing effects and `onMessage` events; a declared number quality named `turn` is engine-maintained), **the journal** (`capture(taskId?)` freezing the current content as it reads, `getJournal`/`getTasks`, `onJournalChange`; journal rides in save states), event subscriptions (`onSituationChange`, `onQualityChange`, plus legacy `…Changed` aliases), save-state assembly (`getSaveState`/`loadState`, version-checked; world resume points ride along and are re-validated on load — an entry survives only while its situation still lives in that world), `checkCondition`, `validate()`, and getters for situations/qualities/definitions |
| `qualities.ts` | Typed quality values (`number`/`boolean`/`string`), min/max clamping, mutation rules, serialization |
| `situation.ts` | Situation lookup and routing; conditional links and function content evaluated against live qualities — a throwing condition hides its link, never crashes; `onEnter`/`onExit` hooks with swallowed errors |
| `dom.ts` | jQuery-free renderer: `.tp-content`/`.tp-title`/`.tp-body`, one button per available link, situation tags as CSS classes, ARIA contract (`role=main`, `aria-live=polite`, `nav[aria-label="Choices"]`), `renderQualities` fallback panel, plus `applyTheme`/`getSavedTheme` (CSS custom properties, persisted under the `textplus-theme` key) |
| `hud.ts` | `renderHud` (meters with ARIA geometry, badges shown when truthy, readouts as label + live value) and `applyHudThemes` (`data-theme` attribute driven by rule expressions; last matching rule wins, cleared when none match) |
| `storage.ts` | `LocalStorageHandler` (+ `createLocalStorageHandler`): multi-slot save/load under `textplus-save:<slot>`, `listSaves`/`deleteSave`, validation on load — `SaveNotFoundError` and `StorageQuotaExceededError` are typed; corruption/version failures throw plain `Error` |
| `types.ts` | The public contracts: `GameConfig`, `QualityDefinition`, `SituationDefinition`, save schema |
| `index.ts` | Package exports incl. `VERSION`/`SAVE_VERSION` (note: the save version constant currently exists in three places — index, types, and engine literals — a known cleanup item) |

## Behavior guarantees

- **Clamping is the engine's**, not the display's: mutations respect declared `min`/`max` before any HUD rounding (E2E-asserted via `{quality}` interpolation).
- **Failure-safe interactivity by design**: throwing link conditions hide the link; failing effects and lifecycle hooks are logged, never take down the UI. *Caveat*: author-compiled conditions/effects never throw, so these paths are unreachable from the app and currently unverified — they matter only for hand-written configs.
- **State survives recompiles** in the workbench: the preview snapshots `getSaveState()` and replays it after a recompile. Note the split of responsibility: `loadState` itself **throws** when the save's current situation is missing from the config — the graceful fall-back-to-start lives in the workbench's `preview.ts`, not in core.

## Verification

The traced Playwright E2E suite is the only test layer (`npm run test:all` from the repo root). Core is exercised through the workbench Play panel: boot/transitions/events, conditional links, clamping via `{quality}` interpolation, escaped rendering of the author-compiled path, ARIA and tags, HUD meters/badges/readouts, theme rules including last-matching-rule precedence and clearing, the qualities fallback panel, entry effects, adaptive text, save-state preservation across recompiles, and Restart (`e2e/engine.spec.ts`, `e2e/workbench.spec.ts`). The load-time filtering of world resume points is driven directly with hand-written configs — the one path the DSL can't produce — in the Node-context `e2e/core-state.spec.ts`.

**Not verified** (no app surface reaches them — tracked in the root ROADMAP): `storage.ts` (awaits the M5 save/load UI), `engine.validate()`, `onExit` hooks, `applyTheme`'s CSS-variable/persistence path, the situation-history APIs (`hasSituationBeenVisited`/`getSituationHistory` — used only by the untested demo `game.ts` files), and the failure-safe paths noted above.

## Drift Rules

- This file is the package's only doc — update it in the same change set as the code it describes.
- Open work lives in the root `ROADMAP.md` (M5 "Core follow-ups"), not here.
