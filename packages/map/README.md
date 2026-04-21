# @textplus/map

Status: scaffolded for Milestone 3; implementation has not started.

## Purpose

`@textplus/map` will own layout, transcript/game import, and graph/code generation workflows for map-oriented tooling.

## Current Surface

| File | Status | Notes |
|---|---|---|
| `src/index.ts` | Placeholder | Exposes future layout/import API stubs for Milestone 3 |
| `test/unit/*` | Scaffolded | Placeholder tests should become the contract for layout/import/export work |
| `test/integration/*` | Scaffolded | Pending codegen/import-export integration coverage |
| `test/e2e/*` | Scaffolded | Pending round-trip scenarios |

## Verification

Run these from the repository root:

```bash
npm run lint
npm run test:map
npm run test:map:e2e
```

## Drift Rules

- Keep this file aligned with actual modules in `src/`.
- Track roadmap-level sequencing in `ROADMAP.md`, not here.
- Replace placeholder status entries as real layout and generator modules land.