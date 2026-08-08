# @textplus/author — Roadmap

The authoring DSL, compiler pipeline, linting, CLI, and project scaffolding on top of `@textplus/core`. This file is the package's single doc: current surface, verification, milestone status, and what's still ahead. (Repo-wide sequencing lives in the root `ROADMAP.md`.)

## Status

🚧 Milestone 2 feature-complete (2026-08-08). One open M2 item: Raconteur backward-compatibility research.

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

### Architecture

```
CLI → Workflow → Parser → Compiler → Core GameConfig
                    ↓
                  Linter (runs before compile; warnings never block)
```

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

Test standard (2026-08-08): the traced Playwright E2E suite is the only test layer — each trace.zip carries visual and code verification together. Run from the repository root:

```bash
npm run lint                # TypeScript strict mode check
npm run test:all            # lint + all builds + traced Playwright E2E suite
```

Where each surface is verified:

- Examples compile clean: `packages/workbench/e2e/conventions.spec.ts`
- Conditions, effects, adaptive text, HUD, theme directives, escape-first rendering: `e2e/engine.spec.ts`, `e2e/workbench.spec.ts`
- Linter severities, line-jumps, expression safety, type-consistency rules: `e2e/diagnostics.spec.ts`
- CLI (scaffold → compile round-trip, `--out` JSON, lint exit codes): `e2e/cli.spec.ts`

**Not verified**: `compileGame`'s option flags beyond defaults, and adaptive-text randomness rates (`randomly`/`frequently`/`rarely` distributions — the seeded RNG exists but no surface drives it deterministically).

## Milestone 2 — phase history

- **2A Parser ✅** — line-based parser with line-aware errors; compiler integration; reachability/link linting; unified workflow.
- **2B DSL features ✅** (2026-08-08) — safe condition expressions, effects blocks, escape-first markdown, adaptive text + interpolation, `hud`/`theme when` directives.
- **2C Linter ✅** — unused qualities, broken links, and quality type consistency (`effect-type-mismatch` on typed assignments, `condition-type-mismatch` on ordered comparisons of non-numbers).
- **2D CLI ✅** — `textplus-author` / `create-textplus-game` bins over `src/cli.ts`; file I/O via `--out` serialized reports; scaffold compiles with zero issues. (Build gotcha, fixed here: vite lib builds substitute browser stubs for `node:` imports unless they're rollup externals.)
- **2E E2E & polish ✅** — DSL pipeline driven by 20+ traced scenarios; docs consolidated into this file.

### Decisions locked

1. **DSL format**: text-based, line-oriented (`title:` / `quality` / `hud` / `theme` / `:: situation` / `-> link`)
2. **Parser**: hand-written line-based (no parser generator)
3. **Output**: GameConfig for Core; CLI serializes the workflow report (config + diagnostics) to JSON
4. **CLI names**: `textplus-author` + `create-textplus-game`
5. **No GUI in this package** — the workbench is the GUI surface
6. **No new external dependencies** — CLI arg parsing is hand-rolled

## Ahead

- [ ] Raconteur backward compatibility (research phase) — the remaining M2 Must Have
- [ ] Dead-quality reachability analysis (advanced linting beyond type consistency)
- [ ] Code generators (Ink, Inform 7) — tracked under M3 scope in the root roadmap
- [ ] Deterministic surface for adaptive-text randomness rates (seeded RNG exposed to a verifiable path)

## Drift Rules

- This file is the package's only doc: surface, verification, and status all live here — update it in the same change set as the code it describes.
- Repo-wide milestone sequencing stays in the root `ROADMAP.md`; keep the two consistent.
