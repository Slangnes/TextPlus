# @textplus/core

Status: ✅ Milestone 1 COMPLETE

## Purpose

`@textplus/core` is the runtime package for TextPlus. It owns game state, qualities, situations, DOM rendering helpers, storage, and the public runtime API.

## Module Inventory

| Module | Status | Notes |
|---|---|---|
| `src/engine.ts` | ✅ Implemented | Runtime orchestration, transitions, events, save/load state assembly |
| `src/qualities.ts` | ✅ Implemented | Typed quality values, bounds, mutation, serialization |
| `src/situation.ts` | ✅ Implemented | Situation lookup, conditional links/content, lifecycle hooks |
| `src/dom.ts` | ✅ Implemented | DOM renderer, quality rendering, theme helpers |
| `src/storage.ts` | ✅ Implemented | localStorage-backed slot save/load with validation |
| `src/types.ts` | ✅ Implemented | Public contracts and save schema |
| `src/index.ts` | ✅ Implemented | Package exports |
| `src/themes/*` | Pending | Dedicated theme module and stylesheet assets (M2 scope) |

## Verification

Run these from the repository root:

```bash
npm run lint          # TypeScript linting
npm run build         # Build all packages
npm run test:core     # Run unit, integration, and E2E tests
```

## Test Coverage

- **Unit Tests**: 40+ scenarios (engine, qualities, situation system)
- **Integration Tests**: 30+ scenarios (DOM rendering, storage, state persistence)
- **E2E Tests**: 18 real gameplay scenarios (hello-world game)
- **Overall Coverage**: 94.47% statements (exceeds 80% target)

## Example Usage

See `packages/demo/hello-world/` for a complete example game demonstrating all Core APIs:
- Situation transitions and routing
- Quality tracking and mutations
- Conditional content and links
- Game state serialization/deserialization
- Multiple story endings

## Verified Deliverables (M1 Complete)

- ✅ Game engine with situation state management
- ✅ Quality system with type-safe mutations
- ✅ DOM rendering without jQuery
- ✅ localStorage persistence (multi-slot, corruption-safe)
- ✅ Hello World example game (7 situations, 4 endings)
- ✅ 18 E2E test scenarios proving end-to-end gameplay
- ✅ 94.47% test coverage

## Drift Rules

- Update this file when adding or removing exported modules.
- Keep milestone and cross-package planning in the repository `ROADMAP.md`, not here.
- If a module is marked implemented, it must have real tests (not placeholders) and verification notes.