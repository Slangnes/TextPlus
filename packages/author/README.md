# @textplus/author

Status: Milestone 2 in progress; parser, compiler, linter, and workflow slices implemented.

## Latest Features

- **Workflow Integration**: Complete DSL → GameConfig pipeline with unified error reporting
- **Integration Tests**: 15 end-to-end workflow scenarios covering parse, compile, lint
- **Report Formatting**: Human-readable diagnostic output with JSON serialization

## Purpose

`@textplus/author` owns the authoring DSL, compiler pipeline, linting, and project scaffold workflow on top of `@textplus/core`.

## Current Surface

| File | Status | Notes |
|---|---|---|
| `src/parser.ts` | ✅ Implemented slice | Parses line-based DSL into AuthorGameAst with line-aware errors |
| `src/compiler.ts` | ✅ Implemented slice | Compiles AST to @textplus/core GameConfig with validation |
| `src/linter.ts` | ✅ Implemented slice | Validates games for orphaned situations, broken links, unused qualities |
| `src/index.ts` | ✅ Implemented surface | Exports parser + compiler + linter + workflow APIs, plus compileGame/createScaffold wrappers |
| `test/unit/parser.test.ts` | Real tests (8) | Covers parsing title, qualities, situations, links, errors |
| `test/unit/compiler.test.ts` | Real tests (16) | Covers compilation, link resolution, error detection |
| `test/unit/linter.test.ts` | Real tests (15) | Covers reachability, link validation, quality usage, diagnostics |
| `test/unit/adaptive-text.test.ts` | Scaffolded (13) | Pending real adaptive text coverage |
| `test/integration/workflow.test.ts` | Real tests (15) | End-to-end workflow scenarios and diagnostics serialization |
| `test/unit/index.test.ts` | Real tests (3) | Public API wrappers: compileGame/createScaffold |
| `test/e2e/*` | Scaffolded | Pending full DSL-to-core scenarios |
| `src/workflow.ts` | ✅ Implemented integration | Coordinates parse → compile → lint with unified error reporting |

## Test Coverage

- **Workflow**: 15 integration tests, 100% statement coverage
- **Total Author Package**: 70 tests passing, including public API wrapper tests

## Verification

Run these from the repository root:

```bash
npm run lint                # TypeScript strict mode check
npm run test:author         # Parser + compiler + linter + workflow + public API tests
npm run test:author:e2e     # E2E scenarios (scaffolded)
npm run test:all            # Full workspace (currently 209 tests, all green)
npm run build               # Build all packages
```

## Linter Features

- **Orphaned Situations**: Detects unreachable situations (not reachable from start)
- **Broken Links**: Reports links to undefined situations (errors)
- **Unused Qualities**: Warns about defined but unused qualities
- **Diagnostic Output**: Structured error/warning/info messages with formatting

## Planning

Detailed Milestone 2 scope and remaining phases live in `README-M2-plan.md`.

## Drift Rules

- Keep this file focused on actual exported surfaces and current implementation status.
- Update this file when moving between phases (template → real).
- When a module surface expands, update both this file and M2-plan.md in the same change set.
