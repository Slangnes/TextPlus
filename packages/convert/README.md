# @textplus/convert

Status: scaffolded for Milestone 4; implementation has not started.

## Purpose

`@textplus/convert` will parse parser-IF transcripts and generate downstream outputs such as DSL, HTML, and map data.

## Current Surface

| File | Status | Notes |
|---|---|---|
| `src/index.ts` | Placeholder | Exposes future transcript parsing and generation API stubs for Milestone 4 |
| `test/unit/*` | Scaffolded | Placeholder tests for parser/codegen work |
| `test/integration/*` | Scaffolded | Pending CLI and multi-format integration coverage |
| `test/e2e/*` | Scaffolded | Pending transcript-to-output workflows |

## Verification

Run these from the repository root:

```bash
npm run lint
npm run test:convert
npm run test:convert:e2e
```

## Drift Rules

- Keep this file aligned with actual parser/generator modules.
- Use it to document accepted transcript formats and package-level gaps once implementation begins.
- Treat future Zork-based validation as an acceptance fixture, not as the package plan itself.