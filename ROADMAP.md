# TextPlus Roadmap

This document tracks the features, deliverables, and milestones for the TextPlus project. Items are organized by component and priority.

**Last Updated**: August 9, 2026  
**Current Status**: M0–M2 ✅ complete | M3 Map + M4 Convert 🚧 in progress | Test standard: traced Playwright E2E suite (95 scenarios)

---

## Current Status Summary

| Milestone | Status | Progress | Notes |
|-----------|--------|----------|--------|
| **M0: Bootstrap** | ✅ COMPLETE | 100% | Project setup infrastructure |
| **M1: Core** | ✅ COMPLETE | 100% | Runtime + Beyond Text HUD/theme slices; `storage.ts` awaits its M5 UI surface |
| **M2: Author** | ✅ COMPLETE | 100% | DSL, linter (15 diagnostic codes), workflow, CLI (`textplus-author` / `create-textplus-game`); Raconteur compat resolved as a migration guide |
| **M3: Map** | 🚧 IN PROGRESS | ~75% | Compass layout, zoom/pan, ZIL+transcript importers, gated-edge dev view, in-game dungeon map, Trizbort export; hand-editing, Trizbort import, Inform 7/Ink codegen remain |
| **M4: Convert** | 🚧 IN PROGRESS | ~70% | Deconstruction (prose, gates, globals, multi-file worlds) + conversion report, transcripts + branching merge + CLI; objects, blocked-link construct, engine formats, .z5 remain |
| **M5: Integration** | ⏳ PENDING | ~15% | CLI surfaces + showcase example landed early; save/load UI, docs site, release remain |

### Feature Milestones (restructured 2026-08-09 — work is organized by feature, not package)

| Feature | Status | What it means |
|---|---|---|
| **Scene Machinery** | ✅ shipped | Worlds/modes (per-world resume, `data-world` skins, map world tabs), the turn clock (`every`/`at` schedules, messages, `wait`), capture/journal/tasks + the Journal panel — the generic engine behind AMFV-class experiences |
| **The Living Map** | ✅ shipped (auto-map) | Compass-true layout, zoom/pan, gated edges in the dev view, Trizbort export, and the player-facing fog-of-war dungeon map (`map dungeon`); hand-editing and Trizbort *import* still ahead |
| **Deep Deconstruction** | 🚧 in progress | The program → the story: ZIL rooms/prose/exits/gates/globals/multi-file worlds with an honest conversion report; ahead: objects, a blocked-link DSL construct (185 AMFV SORRY exits wait on it), .z5 binaries |
| **Showcase & Docs** | 🚧 in progress | "Night Shift" bundled example exercises every pillar under the zero-warnings guard; docs site, save/load UI, and release remain |

### Known Verification Limits

Honest boundaries of the current test standard, stated so green runs are read correctly:

- **Browser vs Node traces**: browser scenarios' traces carry both vectors (visual film-strip/DOM snapshots + action/console/network log); Node-context scenarios (CLI and map-tool specs) carry the step log with command output and generated artifacts attached — no visual record.
- **Chromium only** — no Firefox/WebKit projects are configured.
- **No CI, no retries** — the gate is local and manual; `webServer.reuseExistingServer: true` will silently reuse a stale dev server on :5175, so restart it before a release run.
- **Demo `game.ts` files** are neither type-checked (outside tsconfig `include`) nor behaviorally tested — only their DSL adaptations in the workbench are.
- **Core failure-safe paths** (throwing conditions/effects/hooks) are unreachable through the app — author-compiled closures never throw; only hand-written configs hit them.
- **Map↔DSL round-trip fidelity** is topology + tags; titles map to situation titles, prose is a placeholder by design.
- **No coverage instrumentation exists** — all percentage figures in milestone history are vitest-era measurements.

---

## Documentation Governance

- **Single Source Of Truth**: Keep planning in this document only.
- **No Roadmap Clones**: Do not create new roadmap summary files for routine updates.
- **Update Pattern**: Use in-place deltas in the status table and milestone checkboxes.
- **Change Log Location**: Keep a short in-file changelog section instead of separate update documents.
- **Package Audit Docs**: Each workspace package keeps a single doc — in-progress packages a package-level `ROADMAP.md` (surface, verification, milestone status, open items); completed packages a real `README.md` with usage/reference docs (`author`'s is the pattern). One doc per package; no parallel plan files.

### Roadmap Changelog

- **2026-08-09 (review fixes)**: Adversarial-review findings closed: `at 0` schedule directives are now parse errors (the clock starts at 0; moments are checked from turn 1), preamble directives placed after the first `:: ` header surface as `misplaced-directive` lint warnings instead of silently reading as prose/titles, `loadState` drops per-world resume points whose situation no longer lives in that world (reachable only via hand-written configs), and a parse-failing effects block no longer fabricates `unused-task` for tasks it plainly captures. Suite: 95 traced scenarios (incl. the new Node-context `core-state.spec.ts`, the first spec driving core with a hand-written config).
- **2026-08-08 (later)**: Testing standard changed by project decision: the vitest layer was removed; the traced Playwright E2E suite (58 scenarios, trace.zip per test) is the only test layer, including Node-context specs for the CLIs. Toolchain slimmed (root owns devDeps; scripts 25→7; terser/@vitest extras dropped). M2 completed: `textplus-author`/`create-textplus-game` CLI, quality-type-consistency lint rules, Raconteur compat resolved as a migration guide (runtime compat descoped by design). M4 advanced: workbench Import feature, `mergeTranscriptsToDsl` branching merge, `textplus-convert` CLI. M3 advanced: `importTranscript` (transcript → StoryGraph) and `graphToDsl` (round-trip with `graphFromConfig`). Doc convention: one doc per package — completed packages a real `README.md`, in-progress a package `ROADMAP.md`.
- **2026-08-08**: Phase 2B shipped: DSL conditions now evaluate at runtime (safe expression language, no eval), links and situations mutate qualities via `{ effects }` brace blocks, markdown (escape-first, built-in) and adaptive text (`[oneOf|randomly|frequently|rarely]`, `{quality}` interpolation) compile into content. Declarative HUD (`hud <quality> meter|badge|readout`) and state-driven theming (`theme <name> when <expr>`) land in core (`renderHud`/`applyHudThemes`) and the workbench preview. Fine-grained Monarch grammar extracted to `dsl-language.ts` (unit-tested as data). M4 first slice: `transcriptToDsl` converts plain-text transcripts to compiling DSL (round-trip acceptance test). All four workbench examples now exercise the full surface.
- **2026-08-07**: Workbench editor upgraded to Monaco (monaco-editor 0.56): TextPlus DSL syntax highlighting (Monarch grammar), palette-matched light/dark themes, line numbers that stay correct under word wrap, diagnostic squiggles from the lint pipeline. Verified Transmatte's license factually (public domain) in CREDITS.md; documented the Trizbort parity gap in the map package doc (now `packages/map/ROADMAP.md`). Added "Beyond Text" vision section (rich interfaces, HUDs).
- **2026-08-07**: Workbench: configurable 1-4 panel layout (each panel hosts any module or nothing; drag-resizable splitters, 4-panel center handle, 3-panel solo-position control; persisted), bottom status bar (compile state / current situation / cursor), editor word wrap. Added Playwright E2E suite (16 scenarios) with tracing always on — trace.zip artifacts are the release visual-QA vector (see CLAUDE.md).
- **2026-08-07**: Added `@textplus/workbench` browser authoring app (DSL editor | live playable preview | story map | diagnostics, in-app modals with suppressible confirmations per CLAUDE.md convention). Implemented first M3 slice in `@textplus/map`: layered-BFS auto-layout + `graphFromConfig` adapter with 15 real unit tests (replacing placeholders). Added DSL adaptations of all three demo games as workbench examples.
- **2026-04-21**: Resolved metadata and API blockers: aligned package entrypoints to dist outputs, removed stale CLI bin declarations, and replaced placeholder Author API throws with working implementations.
- **2026-04-21**: Implemented M2 workflow integration (parse→compile→lint), 15 integration tests (100% coverage), formatters for diagnostic reports and JSON output.
- **2026-04-21**: Implemented M2 linter slice (AST diagnostics), 15 real test cases.
- **2026-04-21**: Implemented M2 compiler slice (AST → GameConfig), 16 real test cases.
- **2026-04-21**: Implemented M2 parser slice with line-aware errors and initial test coverage.

---

## Package Architecture

Ownership boundaries and where each package documents itself. Module-level surface tables live in the package docs (single source of truth) — this section only maps the boundaries.

| Package | Owns | Package doc |
|---------|------|-------------|
| `@textplus/core` | Runtime: engine, qualities, situations, DOM renderer, HUD/themes, storage, public contracts | `packages/core/README.md` |
| `@textplus/author` | DSL: parser → compiler → linter → workflow; `textplus-author` / `create-textplus-game` CLI; scaffolding | `packages/author/README.md` |
| `@textplus/map` | Story-graph layout, GameConfig adapter, transcript importer, graph→DSL codegen | `packages/map/ROADMAP.md` |
| `@textplus/convert` | Transcript parsing, linear + branching DSL generation, `textplus-convert` CLI | `packages/convert/ROADMAP.md` |
| `@textplus/demo` | Playable reference games built directly on core | `packages/demo/README.md` |
| `@textplus/workbench` | Browser authoring app (editor/play/map/diagnostics, import/export) and the repo's Playwright E2E suite (`e2e/`, incl. Node-context CLI specs) | `packages/workbench/README.md` |

### Cross-Package Dependency Direction

`@textplus/core` <- `@textplus/author` <- (`@textplus/map`, `@textplus/convert`) <- `demo`/`workbench`

Rules:
- Do not create reverse dependencies into higher-level packages; siblings (`map`, `convert`) do not import each other.
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
- [x] Configure Vitest for comprehensive testing (since removed — the traced Playwright suite replaced it, see the 2026-08-08 changelog)
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

### Infrastructure Status (M0-era snapshot; current scripts differ)
✅ All npm scripts working at bootstrap time (`npm run test` then ran 156 vitest placeholders). Today: `lint` = tsc strict, `test` = the traced Playwright suite, `build` = all packages, `test:all` = all three.

**Historical Note**: Bootstrap snapshots still exist in `BOOTSTRAP.md` and `BOOTSTRAP_COMPLETE.md`, but they are archival only and should not be used for live tracking.

---

## Milestone 1 — TextPlus Core (Modernizing Undum) ✅ COMPLETE

**Target Duration**: 5-6 weeks  
**Verification Target**: every claimed behavior has a traced E2E scenario (was: ≥80% vitest coverage — instrumentation since removed)  
**Status**: ✅ COMPLETE (all phases delivered; 94.47% coverage measured under the vitest-era suite)

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
  - Tests: 18 E2E test scenarios covering all story paths (vitest-era; since removed)

- [x] **E2E playthrough tests**
  - [x] Start game and verify initial situation displays
  - [x] Verify choices are available
  - [x] Transition between situations
  - [x] Quality changes affect displayed text and available options
  - [x] Save mid-game and restore (state persistence)
  - [x] Reach different endings based on choices and qualities
  - Tests: 18 E2E test scenarios (96/96 passing, 94.47% coverage — vitest-era measurements; since removed)

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
- [x] Write 40+ unit tests (engine, quality, situation logic) — **48 implemented (vitest-era; since removed)**
- [x] Write 30+ integration tests (DOM, storage, themes) — **30 implemented across DOM and storage (vitest-era; since removed); dedicated themes module still pending**
- [x] Write 3+ E2E test scenarios (full playthrough) — **originally 18 vitest scenarios; the vitest suite was later removed and core is now exercised through the workbench Playwright suite (`e2e/engine.spec.ts` and others). Note: `storage.ts` and `engine.validate()` have no E2E surface yet — see M5.**
- [x] Achieve ≥80% code coverage — **measured 94.47% statements / 88.05% branches / 90.41% functions under the removed vitest suite; no coverage instrumentation exists today**

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
- `themes/*` — planned CSS-variable theme module; **never built** (theme behavior shipped instead as `hud.ts` rule-driven `data-theme` + `dom.ts` `applyTheme` helpers; the dedicated module is an M5 "Core follow-ups" item)

**Tests**: originally `packages/core/test/e2e/hello-world.test.ts` (18 vitest scenarios; directory since removed with the vitest suite)

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

✅ **All M1 gates passed at completion time** (vitest-era commands like `npm run test:core` no longer exist — today's equivalent gate is `npm run test:all`):

1. Linting: no TypeScript errors ✓
2. Unit/Integration/E2E: 40+/30+/18 vitest tests passed ✓ (suite since replaced by the traced Playwright suite)
3. Coverage: 94.47% in `packages/core/` ✓ (vitest-era measurement)
4. Build: `packages/core/dist/` built ✓
5. Playable: demo game at `packages/demo/hello-world/index.html` ✓

---

## Milestone 2 — TextPlus Author (Modernizing Raconteur) ✅ COMPLETE

**Completed**: 2026-08-08

**Target Duration**: 5-6 weeks  
**Dependency**: M1 Core (base library) ✓ SATISFIED  
**Verification Target**: every claimed behavior has a traced E2E scenario

**Test Inventory**: historically 55 unit + 15 integration vitest tests (suite since removed). The DSL pipeline is verified through the workbench Playwright suite (`e2e/diagnostics.spec.ts`, `e2e/engine.spec.ts`, `e2e/workbench.spec.ts`, `e2e/conventions.spec.ts`), and the Node-only surfaces (`createScaffold`, the workflow report formatters, JSON serialization) through the CLI scenarios in `e2e/cli.spec.ts`.

### Planned Implementation
- [x] DSL parser (initial line-based parser implemented)
- [x] DSL compiler (to Core game objects — AST → GameConfig, validation)
- [x] Situation linter (detect orphaned situations, broken links, unused qualities)
- [x] Markdown content processor (Phase 2B, escape-first)
- [x] Adaptive text helpers (oneOf, randomly, frequently, rarely) (Phase 2B)
- [x] Project scaffold CLI (`create-textplus-game` + `textplus-author` compile/lint/scaffold, `packages/author/src/cli.ts`)
- [x] Hot module reloading via Vite (workbench source aliasing)
- [x] Situation graph visualization (workbench Map tab)

### Phase 2A: Parser, Compiler, & Linter (Implemented)
- [x] Workflow integration: Unified parse→compile→lint pipeline
- [x] Report formatters: Human-readable diagnostics + JSON output
- [x] 15 end-to-end integration tests (vitest-era; since removed)
- [x] 70 total real tests covering all M2A functionality (vitest-era; since removed)
- [x] 96.49% package coverage on implemented slices (vitest-era measurement)

### Phase 2B: Shipped 2026-08-08
- [x] Condition parsing in links — safe expression language (`packages/author/src/expression.ts`), compiled to pure closures, evaluated by the engine at runtime
- [x] Effects — `{ quality += n, flag = true }` brace blocks on links (onChoose) and situation entry lines (onEnter) (`packages/author/src/effects.ts`)
- [x] Markdown processor — escape-first built-in converter (`packages/author/src/content.ts`)
- [x] Adaptive text evaluation — `[oneOf | randomly | frequently | rarely]` spans + `{quality}` interpolation, seeded RNG for tests
- [x] HUD + theme directives — `hud`/`theme ... when ...` compile to `GameConfig.hud` (core `renderHud`/`applyHudThemes`)
- [x] Project scaffold CLI tool — `textplus-author` / `create-textplus-game` bins, verified by `e2e/cli.spec.ts`
- [x] Hot module reloading for authoring workflows — workbench source aliasing

### Must Have (M2 Completion)
- [x] Parse Raconteur-style DSL ✓
- [x] Compile to valid TextPlus Core game objects ✓
- [x] Detect structural problems (orphaned situations, broken links) ✓
- [x] Support Markdown in situation content ✓ (escape-first built-in)
- [x] Preserve adaptive text helpers ✓ (oneOf/randomly/frequently/rarely + interpolation)
- [x] Test coverage — historically 140+ vitest tests; now the DSL pipeline, linter rules, and CLI are exercised by the traced Playwright suite ✓
- [x] Project scaffold CLI tool ✓
- [x] Backward compatibility with Raconteur games — research resolved 2026-08-08: runtime compatibility is **descoped by design** (Raconteur stories are CoffeeScript/JS programs; executing them would mean a JS sandbox, not a declarative format). Shipped instead as the migration guide in `packages/author/README.md` mapping every Raconteur concept to the DSL

### Should Have
- [x] Hot module reloading for dev server — workbench aliases core/author/map sources through Vite HMR
- [x] Situation graph preview — workbench Map tab (`packages/workbench/src/mapview.ts`)
- [x] Advanced linting — quality type consistency shipped (`effect-type-mismatch` on typed assignments, `condition-type-mismatch` on ordered comparisons of non-numbers); dead-quality reachability analysis still open

### Nice to Have
- [ ] VS Code extension
- [x] Live preview pane — the workbench Play panel
- [ ] EPUB/PDF export
- [ ] Deterministic surface for adaptive-text randomness rates (seeded RNG exists; nothing verifiable drives it)

---

## Milestone 3 — TextPlus Map (Extending Trizbort.io) 🚧 IN PROGRESS

**Target Duration**: 4-5 weeks (can start after M1+M2)  
**Dependencies**: M2 Author (optional), M4 Convert (optional)  
**Verification Target**: every claimed behavior has a traced E2E scenario

**Testing**: layout geometry and classification (depth columns, unique cells, orphan parking, terminal flags, edge dedup) are verified through the workbench map panel in `e2e/map.spec.ts`.

### Planned Implementation
- [x] Auto-layout algorithm (positions rooms without overlaps — layered BFS grid, orphans in trailing column)
- [x] Importer (parse transcripts → room graph) — `importTranscript` in `packages/map/src/importer.ts`
- [x] ZIL source importer — `importZilRooms` in `packages/map/src/zil.ts` recovers the exact room graph with compass directions from original Infocom source (beyond Trizbort's transcript-only import); proven on AMFV's `rockvil.zil` (150 rooms / 331 directional connections → compass map + compiling DSL)
- [x] Compass-true auto-layout (2026-08-09) — direction-carrying edges (ZIL exits, transcript commands, movement-phrased link labels) place rooms Trizbort-style: north up, east right; zoom/pan navigation in the workbench map panel
- [x] Trizbort XML export (2026-08-09) — workbench "Export Trizbort" button + `graphToTrizbort`; compass ports, one-way/two-way flow; not yet validated inside trizbort.io
- [x] Code generator: TextPlus Author DSL — `graphToDsl` in `packages/map/src/codegen.ts` (Inform 7 and Ink still open below)
- [ ] Batch rename / find-replace
- [x] Round-trip conversion (map ↔ DSL) — transcript → graph → DSL → config → graph verified in `e2e/map-tools.spec.ts` (topology + tags survive; prose is a placeholder)

### Must Have
- [x] Auto-layout algorithm
- [x] Layout verification — originally 15 vitest tests (since removed); geometry now asserted via `e2e/map.spec.ts`
- [x] Import transcript output — transcript → `StoryGraph` → compiling DSL skeleton
- [x] Export to Trizbort format — `graphToTrizbort` + the map panel's Export button (validation inside trizbort.io still open)

### Should Have
- [ ] Inform 7 code generation
- [ ] Ink (inkle) code generation
- [x] Export to TextPlus Author DSL — `graphToDsl`
- [ ] Batch operations (rename, find-replace)

### Nice to Have
- [ ] LLM-powered auto-descriptions
- [ ] Collaborative editing (CRDTs)
- [ ] Versioned undo history

---

## Milestone 4 — TextPlus Convert (Automating Transmatte) 🚧 IN PROGRESS

**Target Duration**: 4-5 weeks (can start after M1)  
**Dependencies**: M1 Core (for output format)  
**Verification Target**: every claimed behavior has a traced E2E scenario

**Testing**: the transcript slice is verified end-to-end through the workbench Import feature (`e2e/import.spec.ts` — paste → convert → compile clean → play → map). The engine-specific parsers and generators below have no tests yet (their former `it.todo` markers were removed with the vitest suite; this list is their record).

### Planned Implementation
- [ ] Transcript parser: engine-specific formats (Glulx, Inform 7, TADS 3; the plain Z-machine-style path is shipped)
- [x] ZIL deconstruction (2026-08-09) — `zilToDsl`: the actual program → DSL with real room prose and compass exits, no transcript needed (CLI auto-detects; the workbench Import dialog accepts pasted or file-picked ZIL). Compiled .z5 binaries remain the horizon note
- [x] Deep deconstruction (2026-08-09 later) — gated exits (`IF FLAG` / `IF DOOR IS OPEN` → `? quality` links), `--globals` extraction, multi-file → worlds with cross-file world-switch links, and a **conversion report** (recovered / derived / not recovered) in the CLI and the Import dialog. Proven on the full AMFV set: 178 rooms / 3 worlds / 446 exits, 185 SORRY + 197 PER exits reported honestly
- [x] Multi-transcript merging (detect branching) — `mergeTranscriptsToDsl` in `packages/convert/src/merge.ts`
- [x] TextPlus DSL code generator — `transcriptToDsl` (linear) + branching merge output
- [ ] Standalone HTML code generator
- [ ] Trizbort map generator
- [x] CLI interface (`textplus-convert`) — convert/merge/`--check`, verified by `e2e/convert-cli.spec.ts`

### Must Have
- [x] Parse plain-text (Z-machine-style) transcripts — first slice, `packages/convert/src/transcript.ts`
- [x] Output TextPlus DSL — `transcriptToDsl`; round-trip acceptance now runs through the app (`e2e/import.spec.ts`)
- [x] Workbench Import UI — paste a transcript in the workbench (`Import` toolbar button) to get a compiling story draft
- [ ] Output standalone HTML (via Core)
- [ ] Output Trizbort map
- [x] CLI tool — `textplus-convert`
- [ ] Broad transcript-sample coverage (varied real transcripts through the Import/CLI E2E paths)
- [ ] Engine-specific format support: Glulx, Inform 7, TADS 3

### Should Have
- [x] Multi-transcript merging — branching stories from divergent walks
- [ ] Map generation
- [ ] Broad real-transcript sample coverage

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
- [ ] Core follow-ups deferred since M1: dedicated themes module/stylesheets; a surface for `onExit` hooks and theme CSS variables (or retire them); wire `engine.validate()` into an app surface or fold it into the author linter
- [x] CLI surfaces — `textplus-author` / `create-textplus-game` (M2) and `textplus-convert` (M4) both shipped with E2E coverage
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

## Verifying the Repo

The standing verification commands:

```bash
# Verify current repo state (lint + builds + traced E2E)
npm run test:all

# E2E suite alone — a trace.zip per test
npm run test:e2e
```

Use the per-package docs (`packages/*/ROADMAP.md` or `README.md`) and this roadmap for current command and status references.

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

