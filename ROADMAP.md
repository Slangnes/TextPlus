# TextPlus Roadmap

This document tracks the features, deliverables, and milestones for the TextPlus project. Items are organized by component and priority.

**Last Updated**: April 21, 2026  
**Current Status**: Phase 0 (Bootstrap) ✅ Complete | Phase 1 (Core) ✅ Complete

---

## Current Status Summary

| Milestone | Status | Progress | Target |
|-----------|--------|----------|--------|
| **M0: Bootstrap** | ✅ COMPLETE | 100% | Project setup infrastructure |
| **M1: Core** | ✅ COMPLETE | 100% | 5-6 weeks (80%+ test coverage) |
| **M2: Author** | 🚧 IN PROGRESS | 85% | Conditions, effects, markdown, adaptive text, HUD/theme directives all live; scaffold CLI remains |
| **M3: Map** | 🚧 IN PROGRESS | 20% | Auto-layout + config adapter done (workbench map view) |
| **M4: Convert** | 🚧 IN PROGRESS | 15% | Plain-text transcript → DSL slice done; engine formats + merging remain |
| **M5: Integration** | ⏳ PENDING | 0% | Final release, demo |

---

## Documentation Governance

- **Single Source Of Truth**: Keep planning in this document only.
- **No Roadmap Clones**: Do not create new roadmap summary files for routine updates.
- **Update Pattern**: Use in-place deltas in the status table and milestone checkboxes.
- **Change Log Location**: Keep a short in-file changelog section instead of separate update documents.
- **Package Audit Docs**: Keep a short `README.md` in each workspace package with public surface, module inventory, verification commands, and known gaps.

### Roadmap Changelog

- **2026-08-08**: Phase 2B shipped: DSL conditions now evaluate at runtime (safe expression language, no eval), links and situations mutate qualities via `{ effects }` brace blocks, markdown (escape-first, built-in) and adaptive text (`[oneOf|randomly|frequently|rarely]`, `{quality}` interpolation) compile into content. Declarative HUD (`hud <quality> meter|badge|readout`) and state-driven theming (`theme <name> when <expr>`) land in core (`renderHud`/`applyHudThemes`) and the workbench preview. Fine-grained Monarch grammar extracted to `dsl-language.ts` (unit-tested as data). M4 first slice: `transcriptToDsl` converts plain-text transcripts to compiling DSL (round-trip acceptance test). All four workbench examples now exercise the full surface.
- **2026-08-07**: Workbench editor upgraded to Monaco (monaco-editor 0.56): TextPlus DSL syntax highlighting (Monarch grammar), palette-matched light/dark themes, line numbers that stay correct under word wrap, diagnostic squiggles from the lint pipeline. Verified Transmatte's license factually (public domain) in CREDITS.md; documented the Trizbort parity gap in `packages/map/README.md`. Added "Beyond Text" vision section (rich interfaces, HUDs).
- **2026-08-07**: Workbench: configurable 1-4 panel layout (each panel hosts any module or nothing; drag-resizable splitters, 4-panel center handle, 3-panel solo-position control; persisted), bottom status bar (compile state / current situation / cursor), editor word wrap. Added Playwright E2E suite (16 scenarios) with tracing always on — trace.zip artifacts are the release visual-QA vector (see CLAUDE.md).
- **2026-08-07**: Added `@textplus/workbench` browser authoring app (DSL editor | live playable preview | story map | diagnostics, in-app modals with suppressible confirmations per CLAUDE.md convention). Implemented first M3 slice in `@textplus/map`: layered-BFS auto-layout + `graphFromConfig` adapter with 15 real unit tests (replacing placeholders). Added DSL adaptations of all three demo games as workbench examples.
- **2026-04-21**: Resolved metadata and API blockers: aligned package entrypoints to dist outputs, removed stale CLI bin declarations, and replaced placeholder Author API throws with working implementations.
- **2026-04-21**: Implemented M2 workflow integration (parse→compile→lint), 15 integration tests (100% coverage), formatters for diagnostic reports and JSON output.
- **2026-04-21**: Implemented M2 linter slice (AST diagnostics), 15 real test cases.
- **2026-04-21**: Implemented M2 compiler slice (AST → GameConfig), 16 real test cases.
- **2026-04-21**: Implemented M2 parser slice with line-aware errors and initial test coverage.

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
  - `npm run test:e2e`

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
- [x] Create 6 workspace packages: `core`, `author`, `map`, `convert`, `demo`, `docs` (the `docs` stub was later removed; recreate as a real workspace when the M5 docs site starts)
- [x] Configure Vite for library builds (ES modules + CommonJS)
- [x] Configure Vitest for comprehensive testing (unit/integration/E2E)
- [x] Set up TypeScript strict mode with path aliases
- [x] Create shared test helpers (`.test-helpers/index.ts`; later removed as unused)
- [x] Create test templates for all 4 main packages (156 placeholder tests)
  - Core: 53 tests (unit, integration, E2E)
  - Author: 60 tests (parser, compiler, linting, adaptive text)
  - Convert: 30 tests (parser, codegen)
  - Map: 13 tests (layout)
- [x] Set up npm scripts: `test`, `build`, `lint`, `test:all`
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

## Milestone 1 — TextPlus Core (Modernizing Undum) ✅ COMPLETE

**Target Duration**: 5-6 weeks  
**Test Coverage Target**: ≥80% (unit: 85%, integration: 70%, E2E: 3+ scenarios)  
**Status**: ✅ COMPLETE (100% - All phases delivered with 94.47% coverage)

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
**Current Status**: ✅ COMPLETE

- [x] **Implement DOM utilities** (`packages/core/src/dom.ts`, no jQuery)
  - [x] Element creation and manipulation
  - [x] Event listener attachment (situation links, buttons)
  - [x] Content rendering (append, replace, clear)
  - [x] CSS class application (situation-specific styling)
  - [x] Accessibility attributes (ARIA, semantic HTML)
  - Tests: implemented and covered by real integration tests

- [x] **Theme helpers implemented in DOM layer (M1 complete; full themes module deferred to M2)** (`packages/core/src/themes/`)
  - [ ] CSS custom properties (CSS variables) for theming
  - [ ] Theme switching (light, dark, custom)
  - [ ] Theme persistence to localStorage
  - [ ] Root element theme application
  - Tests: dedicated themes module tests still pending; current DOM integration tests cover theme helpers in `dom.ts`

### Phase 1C: Persistence & Storage
**Current Status**: ✅ COMPLETE

- [x] **Implement Storage layer** (`packages/core/src/storage.ts`)
  - [x] Serialize game state to JSON
  - [x] Deserialize game state from JSON
  - [x] Save to localStorage (multiple slots)
  - [x] Load from localStorage
  - [x] Validate save file version and integrity
  - [x] Handle corrupted or incomplete saves gracefully
  - Tests: implemented and covered by real integration tests (94.47% coverage)

### Phase 1D: Example Game & E2E Tests
**Current Status**: ✅ COMPLETE

- [x] **Create Hello World example game** (`packages/demo/hello-world/`)
  - [x] Game definition demonstrating all Core features (7 situations, 4 endings)
  - [x] Demonstrates situation transitions
  - [x] Demonstrates quality changes and mutations
  - [x] Demonstrates conditional text and links
  - [x] Multiple different endings reachable via quality-gated choices
  - [x] HTML harness with styling for playable browser experience
  - Tests: 18 E2E test scenarios covering all story paths

- [x] **E2E playthrough tests**
  - [x] Start game and verify initial situation displays
  - [x] Verify choices are available
  - [x] Transition between situations
  - [x] Quality changes affect displayed text and available options
  - [x] Save mid-game and restore (state persistence)
  - [x] Reach different endings based on choices and qualities
  - Tests: 18 E2E test scenarios (96/96 tests passing, 94.47% coverage)

### Phase 1E: TypeScript Types & Public API
**No placeholder tests — part of code structure**

- [x] **Create types definitions** (`packages/core/src/types.ts`)
  - [x] `GameConfig` interface (configuration)
  - [x] `GameEngine` interface (public API)
  - [x] `Situation` interface
  - [x] `Quality` interface
  - [x] `GameState` interface (for serialization)
  - [x] Export `.d.ts` files in build

- [x] **Update package.json exports**
  - [x] Register `types` field pointing to `.d.ts`
  - [x] Support both ESM and CommonJS

### Must Have: Sub-Tasks (Reframed)

**Core Engine Logic**:
- [x] ~~Audit existing Undum codebase~~ → Already done (no Undum source needed, design from scratch)
- [ ] Port Undum situation/quality model (backward compat)
- [x] ~~Replace Undum build system with Vite~~ → Already done in Phase 0
- [x] ~~Maintain ESM with no jQuery~~ → Already designed for Phase 0

**Testing Requirements**:
- [x] Write 40+ unit tests (engine, quality, situation logic) — **48 implemented**
- [x] Write 30+ integration tests (DOM, storage, themes) — **30 real tests implemented across DOM and storage; dedicated themes module still pending**
- [x] Write 3+ E2E test scenarios (full playthrough) — **originally 18 vitest scenarios; the vitest suite was later removed and core is now exercised through the workbench Playwright suite (`e2e/engine.spec.ts` and others). Note: `storage.ts` and `engine.validate()` have no E2E surface yet — see M5.**
- [x] Achieve ≥80% code coverage — **current package-scoped `packages/core/src/**` coverage: 94.47% statements / 94.47% lines / 88.05% branches / 90.41% functions**

**Deliverables**:
- [x] Working Hello World example game (playable HTML)
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
- `e2e/hello-world.test.ts` — 18 real end-to-end scenarios implemented

**Demo** (`packages/demo/hello-world/`):
- `game.ts` — Core API example game implemented
- `index.html` — Playable HTML output implemented

**Build & Config**:
- `packages/core/package.json` — Update deps/scripts (if needed)
- `packages/core/vite.config.ts` — Already configured

### Implementation Checklist

- [x] **Week 1**: GameEngine + Situation + Quality classes (unit tested)
- [x] **Week 2**: DOM rendering + event handling (integration tested)
- [x] **Week 3**: Storage (save/load) + theme helpers in DOM layer (integration tested)
- [x] **Week 4**: Hello World example game + E2E tests
- [ ] **Week 5**: Polish, accessibility, mobile responsiveness (deferred follow-up)
- [x] **Week 6**: Coverage ≥80%, documentation, final verification

### Verification Steps

✅ **All M1 Verification Gates Passed**:

1. **Linting**: `npm run lint` → No TypeScript errors ✓
2. **Unit Tests**: `npm run test:core` → 40+ tests pass ✓
3. **Integration Tests**: `npm run test:core` → 30+ tests pass ✓
4. **E2E Tests**: `npm run test:core` → 18 E2E scenarios pass ✓
5. **Coverage**: `npm run test` → 94.47% in `packages/core/` ✓
6. **Build**: `npm run build` → `packages/core/dist/` built (20.93kb ESM, 11.83kb CJS) ✓
7. **Playable**: Demo game at `packages/demo/hello-world/index.html` playable ✓

---

## Milestone 2 — TextPlus Author (Modernizing Raconteur) 🚧 IN PROGRESS

**Target Duration**: 5-6 weeks (ready to start, M1 complete)  
**Dependency**: M1 Core (base library) ✓ SATISFIED  
**Test Coverage Target**: ≥80%

**Current Status**: Parser, compiler, linter, and workflow slices implemented with real test coverage.  
**Current Status Update**: Public API wrappers (`compileGame`, `createScaffold`) now implemented and tested.  
**Test Inventory**: historically 55 unit + 15 integration vitest tests (suite since removed). The DSL pipeline is now verified through the workbench Playwright suite (`e2e/diagnostics.spec.ts`, `e2e/engine.spec.ts`, `e2e/conventions.spec.ts`). Not E2E-reachable from a browser and currently unverified: `createScaffold`, `compileGame`, and the report formatters — these need the CLI (Phase 2D) to regain coverage.

### Planned Implementation
- [x] DSL parser (initial line-based parser implemented)
- [x] DSL compiler (to Core game objects — AST → GameConfig, validation)
- [x] Situation linter (detect orphaned situations, broken links, unused qualities)
- [ ] Markdown content processor
- [ ] Adaptive text helpers (oneOf, randomly, frequently, rarely)
- [ ] Project scaffold CLI (`create-textplus-game`)
- [ ] Hot module reloading via Vite
- [ ] Situation graph visualization

### Phase 2A: Parser, Compiler, & Linter (Implemented)
- [x] Workflow integration: Unified parse→compile→lint pipeline
- [x] Report formatters: Human-readable diagnostics + JSON output
- [x] 15 end-to-end integration tests
- [x] 70 total real tests covering all M2A functionality
- [x] 96.49% package coverage on implemented slices

### Phase 2B: Shipped 2026-08-08 (scaffold CLI remains)
- [x] Condition parsing in links — safe expression language (`packages/author/src/expression.ts`), compiled to pure closures, evaluated by the engine at runtime
- [x] Effects — `{ quality += n, flag = true }` brace blocks on links (onChoose) and situation entry lines (onEnter) (`packages/author/src/effects.ts`)
- [x] Markdown processor — escape-first built-in converter (`packages/author/src/content.ts`)
- [x] Adaptive text evaluation — `[oneOf | randomly | frequently | rarely]` spans + `{quality}` interpolation, seeded RNG for tests
- [x] HUD + theme directives — `hud`/`theme ... when ...` compile to `GameConfig.hud` (core `renderHud`/`applyHudThemes`)
- [ ] Project scaffold CLI tool
- [x] Hot module reloading for authoring workflows — workbench source aliasing

### Must Have (M2 Completion)
- [x] Parse Raconteur-style DSL ✓
- [x] Compile to valid TextPlus Core game objects ✓
- [x] Detect structural problems (orphaned situations, broken links) ✓
- [x] Support Markdown in situation content ✓ (escape-first built-in)
- [x] Preserve adaptive text helpers ✓ (oneOf/randomly/frequently/rarely + interpolation)
- [x] 50+ unit tests — 140+ real tests across the author package ✓
- [ ] Project scaffold CLI tool (Phase 2B)
- [ ] Backward compatibility with Raconteur games (research phase)

### Should Have
- [x] Hot module reloading for dev server — workbench aliases core/author/map sources through Vite HMR
- [x] Situation graph preview — workbench Map tab (`packages/workbench/src/mapview.ts`)
- [ ] Advanced linting (unreachable quality checks)

### Nice to Have
- [ ] VS Code extension
- [ ] Live preview pane
- [ ] EPUB/PDF export

---

## Milestone 3 — TextPlus Map (Extending Trizbort.io) ⏳ PENDING

**Target Duration**: 4-5 weeks (can start after M1+M2)  
**Dependencies**: M2 Author (optional), M4 Convert (optional)  
**Test Coverage Target**: ≥80%

**Testing**: layout geometry and classification (depth columns, unique cells, orphan parking, terminal flags, edge dedup) are verified through the workbench map panel in `e2e/map.spec.ts`.

### Planned Implementation
- [x] Auto-layout algorithm (positions rooms without overlaps — layered BFS grid, orphans in trailing column)
- [ ] Importer (parse transcripts → room definitions)
- [ ] Code generators (Inform 7, Ink, TextPlus Author DSL)
- [ ] Batch rename / find-replace
- [ ] Round-trip conversion (map ↔ DSL)

### Must Have
- [x] Auto-layout algorithm
- [x] Layout verification — originally 15 vitest tests (since removed); geometry now asserted via `e2e/map.spec.ts`
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

**Testing**: the transcript slice is verified end-to-end through the workbench Import feature (`e2e/import.spec.ts` — paste → convert → compile clean → play → map). The engine-specific parsers and generators below have no tests yet (their former `it.todo` markers were removed with the vitest suite; this list is their record).

### Planned Implementation
- [ ] Transcript parser (Z-machine, Glulx, Inform 7, TADS 3)
- [ ] Multi-transcript merging (detect branching)
- [ ] Raconteur DSL code generator
- [ ] Standalone HTML code generator
- [ ] Trizbort map generator
- [ ] CLI interface (`textplus-convert`)

### Must Have
- [x] Parse plain-text (Z-machine-style) transcripts — first slice, `packages/convert/src/transcript.ts`
- [x] Output TextPlus DSL — `transcriptToDsl`; round-trip acceptance now runs through the app (`e2e/import.spec.ts`)
- [x] Workbench Import UI — paste a transcript in the workbench (`Import` toolbar button) to get a compiling story draft
- [ ] Output standalone HTML (via Core)
- [ ] Output Trizbort map
- [ ] CLI tool
- [ ] Broad transcript-sample coverage (varied real transcripts through the Import E2E path)
- [ ] Engine-specific format support: Glulx, Inform 7, TADS 3

### Should Have
- [ ] Multi-transcript merging
- [ ] Map generation
- [ ] 70+ unit tests across real transcript samples

### Nice to Have
- [x] Web UI — paste-based import shipped in the workbench; drag-and-drop still open
- [ ] Interactive diff viewer

---

## Milestone 5 — Integration & Polish ⏳ PENDING

**Target Duration**: 2-3 weeks (after M1-M4 complete)  
**Status**: Final release phase

### Deliverables
- [ ] End-to-end demo (transcript → game → map)
- [ ] Save/load slot UI in the workbench Play panel — also the missing E2E surface for core `storage.ts`, which is currently unverified
- [ ] CLI surfaces (`create-textplus-game`, `textplus-convert`) — also the missing verification surface for `createScaffold`, `compileGame`, and the report formatters
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
# Verify current repo state (lint + builds + traced E2E)
npm run test:all

# E2E suite alone — a trace.zip per test
npm run test:e2e
```

Use the package README files and this roadmap for current command and status references.

---

## Beyond Text: Rich Interfaces (the *Plus*)

TextPlus exists because hypertext IF can be more than "text, then choices." *A Mind Forever Voyaging* shipped status displays and mode-switching interfaces on 1980s Z-machine hardware; Undum's quality model and Raconteur's tooling already point past the superficial page. Modern browsers should let authors go much further, and TextPlus should expose those tools rather than keep them engine-internal.

Anchor points that already exist in `@textplus/core`:
- `SituationRenderer` is a public interface — custom renderers (split layouts, illustrated scenes, terminal/HUD chrome) can replace `DomRenderer` today.
- Qualities + change events are the raw material for live HUDs (meters, clocks, inventories, PRISM-style status readouts).
- `applyTheme` supports state-driven re-theming (e.g. the world darkens as sanity drops — Memory Keeper already wants this).

Candidate work (promote into milestones as they firm up):
- [x] Quality-driven HUD panel — `hud <quality> meter|badge|readout ["label"]` → core `renderHud` (shipped 2026-08-08)
- [x] DSL surface for presentation — `theme <name> when <expr>` state-driven theming → `applyHudThemes` (shipped 2026-08-08)
- [ ] Situation "modes" (interface switching per situation tags — AMFV's communions/simulation jumps as a first-class idea)
- [ ] Timed/dynamic text and scheduled events (beyond click-driven transitions)
- [ ] Media situations: illustrations, ambient audio hooks, soundscapes
- [ ] Workbench "Game" panel variants so authors preview HUD + text + map simultaneously

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

