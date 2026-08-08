# @textplus/author

Status: Milestone 2 feature-complete — parser, compiler, linter, workflow, and CLI implemented. Remaining M2 item: Raconteur backward-compatibility research (see ROADMAP).

## Purpose

`@textplus/author` owns the authoring DSL, compiler pipeline, linting, and project scaffold workflow on top of `@textplus/core`.

## Current Surface

| File | Notes |
|---|---|
| `src/parser.ts` | Line-based DSL → `AuthorGameAst` with line-aware errors and a `positions` side table |
| `src/compiler.ts` | AST → `@textplus/core` GameConfig with validation |
| `src/expression.ts` | Safe condition language (no eval): tokenizer + recursive-descent parser, compiled to throw-free closures |
| `src/effects.ts` | `{ quality += n, flag = true }` brace blocks on links (onChoose) and entry lines (onEnter) |
| `src/content.ts` | Escape-first markdown, `[oneOf\|randomly\|frequently\|rarely]` adaptive spans, `{quality}` interpolation, seeded RNG |
| `src/linter.ts` | Diagnostics with codes/severities/line numbers (rules below) |
| `src/workflow.ts` | parse → lint → compile pipeline + report formatter + JSON serializer |
| `src/cli.ts` | `compile` / `lint` / `scaffold` commands wired to the workflow surface |
| `src/index.ts` | Public exports plus `compileGame` / `createScaffold` wrappers |
| `bin/` | `textplus-author` and `create-textplus-game` launchers (run against `dist/`, build first) |

## CLI

```bash
npm run build                                    # builds dist/cli.mjs
node packages/author/bin/create-textplus-game.mjs MyGame .   # scaffold a starter
node packages/author/bin/textplus-author.mjs compile MyGame/game.tp.txt [--out report.json]
node packages/author/bin/textplus-author.mjs lint MyGame/game.tp.txt     # exit 1 on errors
```

Exit codes: 0 success (warnings allowed), 1 errors/failure, 2 usage.

## Linter Rules

| Code | Severity | Fires when |
|---|---|---|
| `broken-link` | error | A link targets an undefined situation |
| `effect-parse-error` | error | A brace block fails to parse |
| `effect-type-mismatch` | error | `+=`/`-=` on a non-number quality, or `=` assigning a value whose type differs from the declaration |
| `condition-parse-error` | error | A link/theme condition fails to parse |
| `orphaned-situation` | warning | A situation is unreachable from the start |
| `unknown-quality-in-effect` / `-condition` / `-hud` | warning | A reference to an undeclared quality |
| `condition-type-mismatch` | warning | An ordered comparison (`< > <= >=`) on a declared non-number quality |
| `unused-quality` | warning | A quality is declared but never referenced |

Line-numbered messages carry a `Line N:` prefix — the workbench uses it for Monaco squiggles and click-to-line.

## Verification

Run these from the repository root:

```bash
npm run lint                # TypeScript strict mode check
npm run test:all            # lint + all builds + traced Playwright E2E suite
npm run build               # Build all packages
```

The DSL pipeline is exercised end-to-end through the workbench E2E suite: examples compile clean (`e2e/conventions.spec.ts`); conditions, effects, adaptive text, HUD, and theme directives are verified live in the Play panel (`e2e/engine.spec.ts`, `e2e/workbench.spec.ts`); linter severities, line-jumps, and expression safety in `e2e/diagnostics.spec.ts`; and the CLI (scaffold → compile round-trip, JSON reports, lint exit codes) in `e2e/cli.spec.ts`.

**Not verified**: `compileGame`'s option flags beyond defaults, and adaptive-text randomness rates (`randomly`/`frequently`/`rarely` distributions — the seeded RNG exists but no surface drives it deterministically).

## Planning

Detailed Milestone 2 scope and phase history live in `README-M2-plan.md`.

## Drift Rules

- Keep this file focused on actual exported surfaces and current implementation status.
- Update this file when moving between phases (template → real).
- When a module surface expands, update both this file and M2-plan.md in the same change set.
