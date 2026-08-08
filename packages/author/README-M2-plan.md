# @textplus/author — Milestone 2 Planning

## Current Status

🚧 Milestone 2 is feature-complete: parser, compiler, linter, workflow, Phase 2B DSL features, and the CLI are implemented and E2E-verified. The one open M2 item is Raconteur backward-compatibility research (tracked in ROADMAP).

## Purpose

`@textplus/author` owns the authoring DSL, compiler pipeline, linting, and project scaffold workflow on top of `@textplus/core`.

## Module Inventory (as built)

The plan's `src/<module>/` directories became flat files — same responsibilities, less ceremony:

| Module | Scope | Verified by |
|--------|-------|-------------|
| `src/parser.ts` | Parse TextPlus DSL into AST (line-aware errors, positions table) | workbench E2E (diagnostics, conventions) |
| `src/compiler.ts` | Compile AST → Core GameConfig | every Play-panel scenario |
| `src/expression.ts` + `src/effects.ts` + `src/content.ts` | Phase 2B: conditions, effects, markdown, adaptive text | `e2e/engine.spec.ts`, `e2e/diagnostics.spec.ts` |
| `src/linter.ts` | Diagnostics: reachability, links, quality usage + type consistency | `e2e/diagnostics.spec.ts`, `e2e/cli.spec.ts` |
| `src/cli.ts` + `bin/` | CLI for compile/lint/scaffold | `e2e/cli.spec.ts` |
| `src/index.ts` | Package exports + `compileGame`/`createScaffold` wrappers | `e2e/cli.spec.ts` (scaffold) |

Not built: `src/codegen/` (Ink/Inform 7 generators) — moved to M3's code-generation scope in ROADMAP.

## Module Dependencies (M2 Architecture)

```
CLI → Workflow → Parser → Compiler → Core GameConfig
                    ↓
                  Linter (runs before compile; warnings never block)
```

- All modules depend on `@textplus/core` for type definitions
- The CLI coordinates workflow (parse → lint → compile → report/JSON output)
- Parser produces an intermediate AST (internal contract, exported for tooling)
- No circular dependencies

## Test Standard (revised 2026-08-08)

The vitest layer was removed by project decision: **the traced Playwright E2E suite is the only test layer** — each trace.zip carries visual and code verification together. DSL behavior is verified through the workbench app; Node-only surfaces (CLI, scaffold, formatters) through Node-context specs in `packages/workbench/e2e/cli.spec.ts`. The old "≥80% statement coverage" target is retired with vitest; the standard is: every claimed behavior has an E2E scenario, and docs state what is and is not covered.

## Verification Commands

```bash
npm run lint           # TypeScript linting
npm run test:e2e       # Traced Playwright E2E suite (DSL pipeline + CLI)
npm run build          # Build to dist/ (includes dist/cli.mjs)
```

## M2 Implementation Phases

### Phase 2A: Parser ✅
- [x] Initial line-based parser slice with line-aware errors
- [x] AST → GameConfig compiler integration
- [x] Linter diagnostics for orphaned situations and broken links
- [x] Unified workflow (parse → compile → lint)

### Phase 2B: Compiler & DSL features ✅
- [x] AST → GameConfig transformer with type validation
- [x] Conditions (safe expression language), effects, markdown, adaptive text
- [x] HUD + theme directives

### Phase 2C: Linter ✅
- [x] Unused quality detection
- [x] Broken link detection
- [x] Quality type consistency checks — `effect-type-mismatch` (mutating or assigning against the declared type), `condition-type-mismatch` (ordered comparisons on non-numbers)

### Phase 2D: CLI & Integration ✅
- [x] Command-line argument parsing and executable (`src/cli.ts`, `bin/textplus-author.mjs`)
- [x] File I/O (read DSL; write the serialized workflow report as JSON via `--out`)
- [x] Project scaffolding (`createScaffold` API + `create-textplus-game` bin; scaffold compiles with zero issues)
- [x] CLI scenarios in the E2E suite (`e2e/cli.spec.ts`)

### Phase 2E: E2E & Polish ✅
- [x] 10+ E2E scenarios — the DSL pipeline is driven by 20+ scenarios across engine/diagnostics/conventions/import specs
- [x] Documentation updates (this file, README.md, ROADMAP in the same change set)
- [x] Verification standard enforced via `npm run test:all` (lint + builds + traced E2E)

## Key Decisions Locked For M2

1. **DSL Format**: Text-based, line-oriented (`title:` / `quality` / `hud` / `theme` / `:: situation` / `-> link`)
2. **Parser Strategy**: Hand-written line-based parser (no parser generator)
3. **Output Format**: GameConfig for Core; CLI serializes the workflow report (config + diagnostics) to JSON
4. **CLI Names**: `textplus-author` (compile/lint/scaffold) + `create-textplus-game` (scaffold shortcut)
5. **No GUI in this package**: the workbench (separate package) is the GUI surface

## Dependencies

- `@textplus/core` ✅ (provides types, GameConfig interface)
- TypeScript, Vite (inherited from root); no new external dependencies (CLI arg parsing is hand-rolled)

## Success Criteria (M2 Complete)

- ✅ Parser converts valid DSL → AST
- ✅ Compiler converts AST → Core GameConfig
- ✅ Linter validates AST (9 rules, typed severities, line numbers)
- ✅ CLI executes the full workflow with meaningful exit codes
- ✅ DSL gameplay verified end-to-end through the workbench (traced)
- ✅ No backward incompatibilities with Core
- ✅ Public API documented (README.md surface table)
- ⏳ Raconteur backward compatibility — research phase, still open (ROADMAP Must Have)
