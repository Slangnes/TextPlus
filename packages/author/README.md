# @textplus/author

Status: scaffolded for Milestone 2; implementation has not started.

## Purpose

`@textplus/author` will own the authoring DSL, compiler pipeline, linting, and project scaffold workflow on top of `@textplus/core`.

## Current Surface

| File | Status | Notes |
|---|---|---|
| `src/index.ts` | Placeholder | Exposes future compiler/scaffold API stubs for Milestone 2 |
| `test/unit/*` | Scaffolded | Placeholder tests exist and should become the implementation contract when M2 starts |
| `test/integration/*` | Scaffolded | Pending real CLI/HMR/graph integration coverage |
| `test/e2e/*` | Scaffolded | Pending full DSL-to-core scenarios |

## Verification

Run these from the repository root:

```bash
npm run lint
npm run test:author
npm run test:author:e2e
```

## Drift Rules

- Keep this file focused on actual exported surfaces and pending modules.
- Do not claim implementation beyond what exists in `src/` and real tests.
- When Milestone 2 starts, replace placeholder notes with parser/compiler/linter module inventory.