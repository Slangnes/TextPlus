# @textplus/core

Status: active implementation workspace for Milestone 1.

## Purpose

`@textplus/core` is the runtime package for TextPlus. It owns game state, qualities, situations, DOM rendering helpers, storage, and the public runtime API.

## Module Inventory

| Module | Status | Notes |
|---|---|---|
| `src/engine.ts` | Implemented | Runtime orchestration, transitions, events, save/load state assembly |
| `src/qualities.ts` | Implemented | Typed quality values, bounds, mutation, serialization |
| `src/situation.ts` | Implemented | Situation lookup, conditional links/content, lifecycle hooks |
| `src/dom.ts` | Implemented | DOM renderer, quality rendering, theme helpers |
| `src/storage.ts` | Implemented | localStorage-backed slot save/load with validation |
| `src/types.ts` | Implemented | Public contracts and save schema |
| `src/index.ts` | Implemented | Package exports |
| `src/themes/*` | Pending | Dedicated theme module and stylesheet assets still not created |

## Verification

Run these from the repository root:

```bash
npm run lint
npm run test:core
npm run test:core:e2e
```

## Current Gaps

- `test/e2e/hello-world.test.ts` is still scaffolded.
- `packages/demo/hello-world/` has not been created yet.
- Dedicated `src/themes/` module is still pending even though theme helpers exist in `src/dom.ts`.
- Quality undo/branching history is not implemented.

## Drift Rules

- Update this file when adding or removing exported modules.
- Keep milestone and cross-package planning in the repository `ROADMAP.md`, not here.
- If a module is marked implemented here, it should have non-placeholder tests or explicit verification notes.