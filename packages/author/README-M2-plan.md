# @textplus/author — Milestone 2 Planning

## Current Status

🚧 Milestone 2 has started. The initial parser slice is implemented with real unit coverage, and compiler/linter/CLI work remains pending.

## Purpose

`@textplus/author` will own the authoring DSL, compiler pipeline, linting, and project scaffold workflow on top of `@textplus/core`.

## M2 Planned Module Inventory

| Module | Scope | Expected Tests |
|--------|-------|-----------------|
| `src/parser/` | Parse TextPlus DSL (.txt files) into AST | 20+ unit tests |
| `src/compiler/` | Compile AST → Core GameConfig objects | 25+ unit tests |
| `src/linter/` | Validate DSL for common errors (unused situations, broken links) | 15+ unit tests |
| `src/cli/` | Command-line interface for parse/compile/lint/scaffold | 10+ integration tests |
| `src/codegen/` | Code generators for other formats (future: Ink, Inform 7 stub) | 5+ unit tests |
| `src/index.ts` | Package exports (Parser, Compiler, Linter, CLI) | Covered by modules |

## Module Dependencies (M2 Architecture)

```
CLI → Parser → Compiler → Core GameConfig
                ↓
              Linter (optional validation)
```

- All modules depend on `@textplus/core` for type definitions
- CLI coordinates workflow (parse → compile → optional lint → output)
- Linter can run standalone (validates parsed AST before compilation)
- No circular dependencies expected
- Parser produces intermediate AST (not exposed publicly, internal contract)

## Test Structure (M2)

- **Unit tests** (`test/unit/*.test.ts`): Parser, Compiler, Linter logic in isolation
- **Integration tests** (`test/integration/*.test.ts`): CLI workflows, file I/O, end-to-end parse→compile→validate
- **E2E tests** (`test/e2e/*.test.ts`): Full DSL game examples → Core API equivalence proofs
- **Coverage target**: ≥80% statements (matching M1 Core baseline)

## Verification Commands

```bash
npm run lint           # TypeScript linting
npm run test:author    # Unit + integration tests
npm run test:author:e2e # E2E scenarios
npm run build          # Build to dist/
```

## M2 Implementation Phases (Planned)

### Phase 2A: Parser
- [x] Initial line-based parser slice with line-aware errors
- [ ] Tokenizer (lexer for richer DSL syntax)
- [ ] Grammar parser expansion (recursive descent or parser generator)
- [ ] 20+ unit tests

### Phase 2B: Compiler
- [ ] AST → GameConfig transformer
- [ ] Type validation during compilation
- [ ] Quality/situation mapping
- [ ] 25+ unit tests

### Phase 2C: Linter
- [ ] Unused situation detection
- [ ] Broken link detection
- [ ] Quality type consistency checks
- [ ] 15+ unit tests

### Phase 2D: CLI & Integration
- [ ] Command-line argument parsing
- [ ] File I/O (read DSL, write GameConfig JSON)
- [ ] Project scaffolding (create new game template)
- [ ] 10+ integration tests

### Phase 2E: E2E & Polish
- [ ] 10+ E2E test scenarios (DSL → gameplay verification)
- [ ] Documentation updates
- [ ] Coverage enforcement (≥80%)

## Key Decisions Locked For M2

1. **DSL Format**: Text-based, human-readable (final format TBD, likely similar to Raconteur syntax)
2. **Parser Strategy**: TBD (hand-written vs. parser generator like ANTLR)
3. **Output Format**: Compiled to JSON GameConfig, deployable to Core
4. **CLI Name**: TBD (likely `textplus-author` or `tp-author`)
5. **No GUI**: CLI-first approach (GUI possibly M5)

## Dependencies

- `@textplus/core` ✅ (provides types, GameConfig interface)
- TypeScript, Vitest (inherited from root)
- No new external dependencies planned for M2

## Success Criteria (M2 Complete)

- ✅ Parser converts valid DSL → AST (20+ unit tests)
- ✅ Compiler converts AST → Core GameConfig (25+ unit tests)
- ✅ Linter validates AST (15+ unit tests)
- ✅ CLI executes full workflow (10+ integration tests)
- ✅ 10+ E2E scenarios pass (DSL gameplay works end-to-end)
- ✅ ≥80% test coverage
- ✅ No backward incompatibilities with Core
- ✅ Public API documented

## Next Steps (When M2 Starts)

1. Move this file content into main README.md
2. Create src/parser/, src/compiler/, src/linter/, src/cli/ directories
3. Begin Phase 2A with Parser implementation
4. Convert placeholder tests into real test contracts
5. Update ROADMAP.md to reflect M2 progress
