# TextPlus Roadmap

This document tracks the features, deliverables, and milestones for the TextPlus project. Items are organized by component and priority.

**Last Updated**: April 21, 2026  
**Current Status**: Phase 0 (Bootstrap) ✅ Complete | Phase 1 (Core) 🚧 In Progress

---

## Current Status Summary

| Milestone | Status | Progress | Target |
|-----------|--------|----------|--------|
| **M0: Bootstrap** | ✅ COMPLETE | 100% | Project setup infrastructure |
| **M1: Core** | 🚧 IN PROGRESS | 40% | 5-6 weeks (80%+ test coverage) |
| **M2: Author** | ⏳ BLOCKED | 0% | Depends on M1 completion |
| **M3: Map** | ⏳ PENDING | 0% | Can start after M1+M2 |
| **M4: Convert** | ⏳ PENDING | 0% | Can start after M1 |
| **M5: Integration** | ⏳ PENDING | 0% | Final release, demo |

---

## Documentation Governance

- **Single Source Of Truth**: Keep planning in this document only.
- **No Roadmap Clones**: Do not create new roadmap summary files for routine updates.
- **Update Pattern**: Use in-place deltas in the status table and milestone checkboxes.
- **Change Log Location**: Keep a short in-file changelog section instead of separate update documents.
- **Package Audit Docs**: Keep a short `README.md` in each workspace package with public surface, module inventory, verification commands, and known gaps.

### Roadmap Changelog

- **2026-04-21**: Consolidated duplicated milestone sections, added module/component architecture, and formalized contract-first workflow.
- **2026-04-21**: Updated M1 status to reflect implemented core/dom/storage work, corrected coverage tracking to package-scoped values, and added package-level audit docs.

---

## Package Architecture

This section defines required modules, ownership boundaries, and verification targets for each package.

### `@textplus/core`

| Module | Responsibility | Key Interfaces | Depends On | Test Owner/Area |
|--------|----------------|----------------|------------|-----------------|
| `engine.ts` | Runtime orchestration, transitions, events, lifecycle | `GameEngine`, `GameState` | `qualities.ts`, `situation.ts` | Unit: engine flow, callbacks, save/load |
| `qualities.ts` | Typed quality values, mutation rules, bounds, serialization | `QualityDefinition`, `QualityValue` | `types.ts` | Unit: mutation rules, type/bounds checks |
| `situation.ts` | Situation lookup, routing, conditional links/content | `SituationDefinition`, `SituationLink` | `types.ts` | Unit: link filtering, condition safety |
| `dom.ts` | DOM rendering/event wiring without jQuery | `SituationRenderer` | `engine.ts` | Integration: render + interaction |
| `storage.ts` | Save/load persistence and slot handling | `StorageHandler` | `types.ts` | Integration: valid/corrupt save scenarios |
| `themes/*` | Theme tokens and theme switching/persistence | Theme config surface | `dom.ts`, `storage.ts` | Integration: theme apply/switch/persist |
| `types.ts` | Public API contracts and serialization schema | All exported interfaces | None | Compile-time contract checks |
| `index.ts` | Public exports and package boundary | Package API | All core modules | Build/export smoke tests |

### `@textplus/author`

| Module Group | Responsibility | Depends On | Test Owner/Area |
|--------------|----------------|------------|-----------------|
| Parser/Lexer | Parse author DSL into AST | None | Unit: syntax/edge cases |
| Compiler | Compile AST to `@textplus/core` config | `@textplus/core` types | Unit: compile output validity |
| Linter | Detect unreachable/broken situations | Parser + compiler outputs | Unit: diagnostics accuracy |
| CLI scaffold | Project bootstrap for authoring workflows | Parser/compiler templates | Unit/integration: CLI behavior |

### `@textplus/map`

| Module Group | Responsibility | Depends On | Test Owner/Area |
|--------------|----------------|------------|-----------------|
| Layout | Auto-position rooms/links | Internal geometry utils | Unit: overlap and spacing |
| Importers | Transcript/graph ingestion | `@textplus/convert` outputs (optional) | Unit: parse mapping fidelity |
| Generators | Export to target formats (Inform, Ink, DSL) | Internal graph model | Unit: codegen snapshots |

### `@textplus/convert`

| Module Group | Responsibility | Depends On | Test Owner/Area |
|--------------|----------------|------------|-----------------|
| Transcript parser | Parse parser-IF transcripts | None | Unit: format compatibility |
| Merger | Merge multi-transcript branching paths | Parser output model | Unit: branch merge logic |
| Code generators | Generate DSL/HTML/map outputs | `@textplus/core`, `@textplus/map` (optional) | Unit/integration: output validity |
| CLI | Conversion workflow entry point | Parser + generators | Integration: end-to-end CLI runs |

### `demo` and `docs`

| Package | Responsibility | Depends On | Verification |
|---------|----------------|------------|--------------|
| `demo` | Playable reference games and examples | `@textplus/core`, later `@textplus/author` | E2E playthrough + manual smoke |
| `docs` | Project docs and developer/user guides | All package public APIs | Build + link checks |

### Cross-Package Dependency Direction

`@textplus/core` <- `@textplus/author` <- (`@textplus/map`, `@textplus/convert`) <- `demo/docs`

Rules:
- Do not create reverse dependencies into higher-level packages.
- Keep `@textplus/core` free of author/map/convert concerns.
- Add adapters at package boundaries instead of sharing internals.

---

## Contract-First Workflow

Use tests and interfaces as the contract source before implementation.

1. Define or update tests to express required API behavior.
2. Align `types.ts` contracts to match test intent.
3. Implement runtime modules to satisfy contracts.
4. Run verification gates before moving phases:
  - `npm run lint`
  - `npm run test:core`
  - `npm run test:coverage`

Required phase gates:
- No milestone checkbox closes with failing tests.
- API-affecting changes require both type and test updates in same change set.
- Do not add status markdown files for progress reporting.

---

## Milestone 0 — Project Setup ✅ COMPLETE

**Completed**: April 20, 2026

### Phase 0: Bootstrap Infrastructure
- [x] Create repository with git
- [x] Add LICENSE (MIT)
- [x] Write initial README
- [x] Write CREDITS bibliography
- [x] Write project ROADMAP

### Phase 0: Development Infrastructure (NEW)
- [x] Set up npm monorepo with workspaces
- [x] Create 6 workspace packages: `core`, `author`, `map`, `convert`, `demo`, `docs`
- [x] Configure Vite for library builds (ES modules + CommonJS)
- [x] Configure Vitest for comprehensive testing (unit/integration/E2E)
- [x] Set up TypeScript strict mode with path aliases
- [x] Create shared test helpers (`.test-helpers/index.ts`)
- [x] Create test templates for all 4 main packages (156 placeholder tests)
  - Core: 53 tests (unit, integration, E2E)
  - Author: 60 tests (parser, compiler, linting, adaptive text)
  - Convert: 30 tests (parser, codegen)
  - Map: 13 tests (layout)
- [x] Set up npm scripts: `test`, `build`, `lint`, `test:all`, `test:coverage`
- [x] Create individual Vite configs per package
- [x] Create `.gitignore` for monorepo

### Infrastructure Status
✅ **All npm scripts working**:
- `npm run lint` — TypeScript strict check PASS
- `npm run test` — 156 placeholder tests PASS
- `npm run build` — All packages build successfully
- `npm run test:all` — Full verification workflow PASS

**Historical Note**: Bootstrap snapshots still exist in `BOOTSTRAP.md` and `BOOTSTRAP_COMPLETE.md`, but they are archival only and should not be used for live tracking.

---

## Milestone 1 — TextPlus Core (Modernizing Undum) 🚧 IN PROGRESS

**Target Duration**: 5-6 weeks  
**Test Coverage Target**: ≥80% (unit: 85%, integration: 70%, E2E: 3+ scenarios)  
**Status**: In progress

### Phase 1A: Core Engine Implementation
**Current Status**: Implemented with real unit coverage across engine, qualities, and situation subsystems.

- [x] **Implement GameEngine class** (`packages/core/src/engine.ts`)
  - [x] Situation state management (current situation, history)
  - [x] Quality system (track and mutate game qualities)
  - [x] Situation transitions with validation
  - [x] Event system for situation changes and quality mutations
  - [x] Game initialization from configuration
  - Tests: implemented and covered by real unit tests

- [x] **Implement Quality system** (`packages/core/src/qualities.ts`)
  - [x] Quality definition (name, type, min/max, default)
  - [x] Quality tracking and mutation
  - [ ] Quality history for undo/branching
  - [x] Constraint validation (min/max bounds)
  - Tests: implemented and covered by real unit tests

- [x] **Implement Situation system** (`packages/core/src/situation.ts`)
  - [x] Situation definition (id, title, content, tags)
  - [x] Situation lookup and routing
  - [x] Conditional text evaluation
  - [x] Link generation (situation-aware navigation)
  - Tests: implemented and covered by real unit tests

### Phase 1B: DOM & Rendering
**Current Status**: DOM renderer implemented with real integration tests; dedicated `themes/*` module still pending.

- [x] **Implement DOM utilities** (`packages/core/src/dom.ts`, no jQuery)
  - [x] Element creation and manipulation
  - [x] Event listener attachment (situation links, buttons)
  - [x] Content rendering (append, replace, clear)
  - [x] CSS class application (situation-specific styling)
  - [x] Accessibility attributes (ARIA, semantic HTML)
  - Tests: implemented and covered by real integration tests

- [ ] **Implement Theming System** (`packages/core/src/themes/`)
  - [ ] CSS custom properties (CSS variables) for theming
  - [ ] Theme switching (light, dark, custom)
  - [ ] Theme persistence to localStorage
  - [ ] Root element theme application
  - Tests: dedicated themes module tests still pending; current DOM integration tests cover theme helpers in `dom.ts`

### Phase 1C: Persistence & Storage
**Current Status**: Storage layer implemented with real multi-slot and corruption-handling coverage.

- [x] **Implement Storage layer** (`packages/core/src/storage.ts`)
  - [x] Serialize game state to JSON
  - [x] Deserialize game state from JSON
  - [x] Save to localStorage (multiple slots)
  - [x] Load from localStorage
  - [x] Validate save file version and integrity
  - [x] Handle corrupted or incomplete saves gracefully
  - Tests: implemented and covered by real integration tests

### Phase 1D: Example Game & E2E Tests
**Current Status**: E2E coverage is still scaffolded; demo game has not been created yet.

- [ ] **Create Hello World example game** (`packages/demo/hello-world/`)
  - [ ] DSL game definition (minimal valid game)
  - [ ] Demonstrates situation transitions
  - [ ] Demonstrates quality changes
  - [ ] Demonstrates conditional text
  - [ ] At least 2 different endings

- [ ] **E2E playthrough tests**
  - [ ] Start game and verify initial situation displays
  - [ ] Verify choices are available
  - [ ] Transition between situations
  - [ ] Quality changes affect displayed text
  - [ ] Save mid-game and restore
  - [ ] Reach different endings based on choices
  - Tests: 7-10 E2E test scenarios

### Phase 1E: TypeScript Types & Public API
**No placeholder tests — part of code structure**

- [x] **Create types definitions** (`packages/core/src/types.ts`)
  - [x] `GameConfig` interface (configuration)
  - [x] `GameEngine` interface (public API)
  - [x] `Situation` interface
  - [x] `Quality` interface
  - [x] `GameState` interface (for serialization)
  - [x] Export `.d.ts` files in build

- [ ] **Update package.json exports**
  - [ ] Register `types` field pointing to `.d.ts`
  - [ ] Support both ESM and CommonJS

### Must Have: Sub-Tasks (Reframed)

**Core Engine Logic**:
- [x] ~~Audit existing Undum codebase~~ → Already done (no Undum source needed, design from scratch)
- [ ] Port Undum situation/quality model (backward compat)
- [x] ~~Replace Undum build system with Vite~~ → Already done in Phase 0
- [x] ~~Maintain ESM with no jQuery~~ → Already designed for Phase 0

**Testing Requirements**:
- [x] Write 40+ unit tests (engine, quality, situation logic) — **48 implemented**
- [x] Write 30+ integration tests (DOM, storage, themes) — **30 real tests implemented across DOM and storage; dedicated themes module still pending**
- [ ] Write 3+ E2E test scenarios (full playthrough) — **`packages/core/test/e2e/hello-world.test.ts` is still scaffolded**
- [x] Achieve ≥80% code coverage — **current package-scoped `packages/core/src/**` coverage: 93.94% statements / 93.94% lines / 88.38% branches / 89.04% functions**

**Deliverables**:
- [ ] Working Hello World example game (playable HTML)
- [x] Save/load functionality (localStorage)
- [x] Full TypeScript types

### Should Have (Polish)
- [ ] CSS custom properties theming system
- [ ] ARIA roles and keyboard navigation
- [ ] Mobile-responsive default stylesheet
- [x] Type definitions exported

### Nice to Have (Future)
- [ ] Dark-mode theme variant
- [ ] Audio hooks (placeholder for music/SFX)
- [ ] i18n support for UI strings

### Remaining Files To Create/Modify

**Source Code** (`packages/core/src/`):
- `themes/index.ts` — CSS variable theming (**NEW**)
- `themes/light.css` — Default light theme (**NEW**)
- `themes/dark.css` — Default dark theme (**NEW**)

**Tests** (`packages/core/test/`):
- `e2e/hello-world.test.ts` — Replace 13 placeholder tests

**Demo** (`packages/demo/hello-world/`):
- `game.txt` — Raconteur DSL game definition (**NEW**)
- `index.html` — Playable HTML output (**NEW**)

**Build & Config**:
- `packages/core/package.json` — Update deps/scripts (if needed)
- `packages/core/vite.config.ts` — Already configured

### Implementation Checklist

- [x] **Week 1**: GameEngine + Situation + Quality classes (unit tested)
- [x] **Week 2**: DOM rendering + event handling (integration tested)
- [ ] **Week 3**: Storage (save/load) + theming (integration tested)
- [ ] **Week 4**: Hello World example game + E2E tests
- [ ] **Week 5**: Polish, accessibility, mobile responsiveness
- [ ] **Week 6**: Coverage ≥80%, documentation, final verification

### Verification Steps

Before marking M1 complete:

1. **Linting**: `npm run lint` → No TypeScript errors ✓
2. **Unit Tests**: `npm run test:core` → 40+ tests pass ✓
3. **Integration Tests**: `npm run test:core` → 30+ tests pass ✓
4. **E2E Tests**: `npm run test:core:e2e` → 3+ scenarios pass ✓
5. **Coverage**: `npm run test:coverage` → ≥80% in `packages/core/` ✓
6. **Build**: `npm run build` → `packages/core/dist/` exists ✓
7. **Playable**: Manually play through `packages/demo/hello-world/index.html` ✓

---

## Milestone 2 — TextPlus Author (Modernizing Raconteur) ⏳ PENDING

**Target Duration**: 5-6 weeks (starts after M1 complete)  
**Dependency**: M1 Core (needed as base library)  
**Test Coverage Target**: ≥80%

**Placeholder Tests Ready**: 60 tests in `packages/author/test/unit/`

### Planned Implementation
- [ ] DSL parser (lexer + recursive descent parser)
- [ ] DSL compiler (to Core game objects)
- [ ] Markdown content processor
- [ ] Adaptive text helpers (oneOf, randomly, frequently, rarely)
- [ ] Situation linter (detect orphaned situations, broken links)
- [ ] Project scaffold CLI (`create-textplus-game`)
- [ ] Hot module reloading via Vite
- [ ] Situation graph visualization

### Must Have
- [ ] Parse Raconteur-style DSL
- [ ] Compile to valid TextPlus Core game objects
- [ ] Support Markdown in situation content
- [ ] Preserve adaptive text helpers
- [ ] 60+ unit tests for parser/compiler/linting
- [ ] Project scaffold CLI tool
- [ ] Backward compatibility with Raconteur games

### Should Have
- [ ] Hot module reloading for dev server
- [ ] Situation linting (detects issues)
- [ ] Situation graph preview

### Nice to Have
- [ ] VS Code extension
- [ ] Live preview pane
- [ ] EPUB/PDF export

---

## Milestone 3 — TextPlus Map (Extending Trizbort.io) ⏳ PENDING

**Target Duration**: 4-5 weeks (can start after M1+M2)  
**Dependencies**: M2 Author (optional), M4 Convert (optional)  
**Test Coverage Target**: ≥80%

**Placeholder Tests Ready**: 13 tests in `packages/map/test/unit/`

### Planned Implementation
- [ ] Auto-layout algorithm (positions rooms without overlaps)
- [ ] Importer (parse transcripts → room definitions)
- [ ] Code generators (Inform 7, Ink, TextPlus Author DSL)
- [ ] Batch rename / find-replace
- [ ] Round-trip conversion (map ↔ DSL)

### Must Have
- [ ] Auto-layout algorithm
- [ ] 15+ unit tests for layout
- [ ] Import transcript output
- [ ] Export to Trizbort format

### Should Have
- [ ] Inform 7 code generation
- [ ] Ink (inkle) code generation
- [ ] Export to TextPlus Author DSL
- [ ] Batch operations (rename, find-replace)

### Nice to Have
- [ ] LLM-powered auto-descriptions
- [ ] Collaborative editing (CRDTs)
- [ ] Versioned undo history

---

## Milestone 4 — TextPlus Convert (Automating Transmatte) ⏳ PENDING

**Target Duration**: 4-5 weeks (can start after M1)  
**Dependencies**: M1 Core (for output format)  
**Test Coverage Target**: ≥80%

**Placeholder Tests Ready**: 30 tests in `packages/convert/test/unit/`

### Planned Implementation
- [ ] Transcript parser (Z-machine, Glulx, Inform 7, TADS 3)
- [ ] Multi-transcript merging (detect branching)
- [ ] Raconteur DSL code generator
- [ ] Standalone HTML code generator
- [ ] Trizbort map generator
- [ ] CLI interface (`textplus-convert`)

### Must Have
- [ ] Parse Z-machine/Glulx transcripts
- [ ] Output Raconteur DSL
- [ ] Output standalone HTML (via Core)
- [ ] Output Trizbort map
- [ ] CLI tool
- [ ] 70+ unit tests for parsing
- [ ] Support Z-machine, Glulx, Inform 7, TADS 3

### Should Have
- [ ] Multi-transcript merging
- [ ] Map generation
- [ ] 70+ unit tests across real transcript samples

### Nice to Have
- [ ] Web UI (drag-and-drop)
- [ ] Interactive diff viewer

---

## Milestone 5 — Integration & Polish ⏳ PENDING

**Target Duration**: 2-3 weeks (after M1-M4 complete)  
**Status**: Final release phase

### Deliverables
- [ ] End-to-end demo (transcript → game → map)
- [ ] VitePress documentation site
- [ ] CONTRIBUTING.md guide
- [ ] CODE_OF_CONDUCT.md
- [ ] CHANGELOG.md
- [ ] v0.1.0 release (CI/CD optional)

### Must Have
- [ ] Working demo with real transcript
- [ ] Complete documentation
- [ ] Release notes & changelog
- [ ] All tests passing (M1-M4)

### Should Have
- [ ] GitHub Actions CI/CD
- [ ] Community guidelines
- [ ] Contributing workflow

### Nice to Have
- [ ] Community gallery
- [ ] Plugin/extension system
- [ ] Accessibility audit (WCAG 2.1 AA)

---

## Getting Started: Milestone 1

To begin M1 implementation:

```bash
# Verify current repo state
cd /workspaces/TextPlus
npm run test:all

# Watch mode for active development
npm run test:core:watch

# Current next slice
# Implement: packages/core/test/e2e/hello-world.test.ts
# Add: packages/demo/hello-world/
# Then: packages/core/src/themes/
```

Use the package README files and this roadmap for current command and status references.

---

## Extras / Future Ideas

These items are not committed to any milestone but are worth tracking.

- Parser IF interpreter embedded in the browser (run Z-machine/Glulx games natively)
- Side-by-side view: parser game on left, hypertext version on right
- Community gallery of TextPlus games
- Plugin/extension system for TextPlus Author
- Accessibility audit and WCAG 2.1 AA compliance pass
- Multiplayer/networked games support
- Mobile app wrappers (iOS/Android)

---

