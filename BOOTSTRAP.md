# TextPlus Project Bootstrap - Phase 0 Complete ✅

## Overview

Phase 0 Bootstrap is now complete. The TextPlus monorepo is fully set up with:
- **Modern build system** (Vite for both libraries and development)
- **Comprehensive test infrastructure** (Vitest with unit/integration/E2E structure)
- **TypeScript support** with strict type checking
- **4 main packages** ready for implementation (Core, Author, Map, Convert)
- **Test templates** for all major features

## Project Structure

```
/workspaces/TextPlus/
├── packages/
│   ├── core/              # TextPlus Core (Milestone 1)
│   │   ├── src/           # Source code
│   │   ├── test/
│   │   │   ├── unit/      # Unit tests (engine logic, state mgmt)
│   │   │   ├── integration/  # Integration tests (DOM, storage, themes)
│   │   │   └── e2e/       # E2E tests (full game playthroughs)
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   ├── author/            # TextPlus Author (Milestone 2)
│   │   ├── src/           # DSL parser, compiler, linter
│   │   ├── test/
│   │   │   ├── unit/      # Parser, compiler, adaptive text, linting
│   │   │   ├── integration/  # Scaffold, HMR, graph generation
│   │   │   └── e2e/       # Full compilation pipeline
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   ├── map/               # TextPlus Map (Milestone 3)
│   │   ├── src/           # Layout algorithm, code gen, importer
│   │   ├── test/
│   │   │   ├── unit/      # Layout, refactoring
│   │   │   ├── integration/  # Code gen, import/export
│   │   │   └── e2e/       # Round-trip tests
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   ├── convert/           # TextPlus Convert (Milestone 4)
│   │   ├── src/           # Transcript parser, code generators
│   │   ├── test/
│   │   │   ├── unit/      # Parser, code generation
│   │   │   ├── integration/  # CLI, multi-format support
│   │   │   ├── e2e/       # Full pipeline (transcript → playable game)
│   │   │   └── fixtures/  # Sample transcript files
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── demo/              # Example games & teaching materials
│
├── docs/                  # VitePress documentation site (Milestone 5)
├── .test-helpers/         # Shared test utilities
│   └── index.ts          # Common fixtures, mocks, helpers
│
├── package.json           # Root workspace config
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Root Vite configuration
├── vitest.config.ts       # Vitest configuration
└── .gitignore
```

## Available Commands

### Testing
```bash
# Run all unit + integration tests with coverage
npm test

# Watch mode (re-run on file changes)
npm run test:watch

# Vitest UI dashboard
npm run test:ui

# Generate HTML coverage report
npm run coverage

# Full test suite (combined)
npm run test:all

# Package-specific tests
npm run test:core           # Core package only
npm run test:author         # Author package only
npm run test:map            # Map package only
npm run test:convert        # Convert package only

# E2E tests
npm run test:core:e2e       # Core games
npm run test:author:e2e     # Author compilation
npm run test:map:e2e        # Map round-trips
npm run test:convert:e2e    # Convert pipeline
```

### Building
```bash
# Build all packages
npm run build

# TypeScript type checking (no emit)
npm run lint

# Full verification (lint + test + build)
npm run test:all

# Clean build artifacts and coverage
npm run clean
```

## Test Structure

Each package follows a consistent test organization:

### Unit Tests (`test/unit/`)
- **Core**: `engine.test.ts`
- **Author**: `parser.test.ts`, `compiler.test.ts`, `adaptive-text.test.ts`, `linter.test.ts`
- **Map**: `layout.test.ts`
- **Convert**: `parser.test.ts`, `codegen.test.ts`

**Purpose**: Test isolated functions and logic with no external dependencies
**Coverage Target**: 85%

### Integration Tests (`test/integration/`)
- **Core**: `dom.test.ts`, `storage.test.ts`
- **Author**: Scaffold generation, HMR, graph visualization
- **Map**: Code generation (snapshots), import/export
- **Convert**: CLI, multi-engine support, merging

**Purpose**: Test how components work together
**Coverage Target**: 70-75%

### E2E Tests (`test/e2e/`)
- **Core**: `hello-world.test.ts` - Play through example game
- **Author**: Full DSL → Core compilation
- **Map**: Full round-trip (import → layout → export)
- **Convert**: Transcript → playable game

**Purpose**: Test real user workflows end-to-end
**Target**: 3-5 scenarios per package

## Test Helpers

Shared test utilities are available in `.test-helpers/index.ts`:

```typescript
import {
  createFixture,           // Create mock data with overrides
  sleep,                   // Async helper
  createMockStorage,       // Mock localStorage
  createMockElement,       // Create DOM elements
  waitFor,                 // Wait for async conditions
  assertDeepEqual,         // Deep object comparison
  createTestScenario       // Game scenario fixtures
} from '../../.test-helpers';
```

## Current Status

✅ **All Systems Running**
- `npm run lint` - ✅ Passes (TypeScript strict mode)
- `npm run test` - ✅ 156 placeholder tests passing
- `npm run build` - ✅ All packages build successfully
- `npm run test:all` - ✅ Full verification passes

## Next Steps: Milestone 1 (TextPlus Core)

1. **Implement Core Engine** (`packages/core/src/engine.ts`)
   - Game state management
   - Situation handling
   - Quality system

2. **Implement DOM Utils** (`packages/core/src/dom.ts`)
   - Rendering, event handling
   - No jQuery dependency

3. **Implement Storage** (`packages/core/src/storage.ts`)
   - localStorage save/load
   - Serialization/deserialization

4. **Implement Types & Exports** (`packages/core/src/types.ts`)
   - Full TypeScript definitions
   - Public API surface

5. **Implement Theming** (`packages/core/src/themes/`)
   - CSS custom properties system
   - Theme switching
   - Dark mode support

6. **Create Hello World Example** (`packages/demo/hello-world/`)
   - Simple game demonstrating all features

7. **Write Tests** (40+ unit + 30+ integration + 3+ E2E)
   - Update placeholder tests with real assertions
   - Aim for 80%+ coverage

## Coverage Tracking

Run this to see coverage report:
```bash
npm run test:coverage
```

Current target per milestone:
- **Unit**: 85%
- **Integration**: 70-75%
- **E2E**: 3-5 complete scenarios

## CI/CD (Optional Future)

Test infrastructure is ready for GitHub Actions or other CI/CD. Currently:
- All tests run as Node.js scripts
- No external dependencies
- Portable across environments

To add CI/CD later: Create `.github/workflows/test.yml` or similar.

## Contributing

1. Follow test structure above
2. Run `npm run test:all` before commits
3. Coverage must remain ≥80% for core/author packages
4. TypeScript strict mode enforced

## Timeline

From here, sequential implementation:
- **M1 Core**: 5-6 weeks
- **M2 Author**: 5-6 weeks (depends on M1)
- **M3/M4 Map + Convert**: 4-5 weeks each (mostly parallel after M1+M2)
- **M5 Integration**: 2-3 weeks

**Total: ~18-22 weeks** (4.5-5.5 months)

---

**Bootstrap completed**: April 2026
**Status**: Ready for M1 implementation
