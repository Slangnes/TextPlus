# TextPlus Roadmap

This document tracks the features, deliverables, and milestones for the TextPlus project. Items are organized by component and priority.

---

## Milestone 0 — Project Setup ✅

- [x] Create repository
- [x] Add LICENSE (MIT)
- [x] Write initial README
- [x] Write CREDITS bibliography
- [x] Write this ROADMAP

---

## Milestone 1 — TextPlus Core (Modernizing Undum)

Goals: Re-implement the core Undum runtime as a modern ES module, removing jQuery dependency, updating the build system, and improving the API.

### Must Have
- [ ] Audit the existing Undum codebase and document all public APIs
- [ ] Port Undum to ES modules (ESM) with no jQuery dependency
- [ ] Replace the Undum build system with Vite (matching the Trizbort.io stack)
- [ ] Maintain backwards compatibility with the existing Undum situation/quality model
- [ ] Write unit tests for core situation logic
- [ ] Write unit tests for quality tracking
- [ ] Preserve local-storage save/load functionality
- [ ] Provide a working "hello world" example game

### Should Have
- [ ] Replace manual CSS with a CSS custom-property–based theming system
- [ ] Add TypeScript type definitions for the public API
- [ ] Add accessibility improvements (ARIA roles, keyboard navigation)
- [ ] Mobile-responsive default stylesheet

### Nice to Have
- [ ] Optional dark-mode theme
- [ ] Audio support hooks (background music, sound effects)
- [ ] Internationalization (i18n) support for UI strings

---

## Milestone 2 — TextPlus Author (Modernizing Raconteur)

Goals: Revive the Raconteur authoring DSL on top of the modernized TextPlus Core, replacing the CoffeeScript/Gulp toolchain with a current Node.js/Vite workflow.

### Must Have
- [ ] Audit the existing Raconteur codebase and document all public APIs
- [ ] Port Raconteur modules to ESM (remove CoffeeScript requirement)
- [ ] Replace Gulp build pipeline with Vite
- [ ] Support Markdown in situation content (via a pluggable processor)
- [ ] Preserve adaptive-text helpers (oneOf, etc.)
- [ ] Write unit tests for the authoring API
- [ ] Provide a scaffold/template project (`create-textplus-game` CLI or similar)

### Should Have
- [ ] Hot-module-reload development server (via Vite)
- [ ] Situation validation/linting tool — warn about unreachable situations, broken links
- [ ] Visual situation graph preview (integrates with TextPlus Map)

### Nice to Have
- [ ] VS Code extension with syntax highlighting and snippets for the authoring DSL
- [ ] Live preview pane in VS Code
- [ ] Export to EPUB/PDF

---

## Milestone 3 — TextPlus Map (Extending Trizbort.io)

Goals: Add automated room/connection inference, reduce the amount of manual entry required, and improve code-generation coverage.

### Must Have
- [ ] Identify and document existing gaps in Trizbort.io code generation (Inform 7, TADS 3, etc.)
- [ ] Add "auto-layout" algorithm that positions rooms from a supplied room/connection list
- [ ] Add import from TextPlus Convert output (see Milestone 4) — auto-populate the map from a transcript

### Should Have
- [ ] Improve Inform 7 code generation to cover more room/object properties
- [ ] Add Ink (inkle) as a code-generation target
- [ ] Add export to the TextPlus Author DSL (round-trip with Milestone 2)
- [ ] Batch-rename / find-and-replace for room names across the whole map

### Nice to Have
- [ ] Auto-description suggestions based on room names (LLM-powered, opt-in)
- [ ] Multiplayer/collaborative editing (CRDTs or similar)
- [ ] Versioned undo history

---

## Milestone 4 — TextPlus Convert (Automating Transmatte)

Goals: Build a CLI tool and library that parses parser-IF transcripts and converts them to Undum/TextPlus hypertext HTML, replicating and extending the Transmatte workflow.

### Must Have
- [ ] Research and document the Transmatte transcript format and conversion rules
- [ ] Parser for standard Z-machine / Glulx transcript format
- [ ] Output a valid TextPlus Author (Raconteur-style) source file from a transcript
- [ ] Output a standalone HTML file using TextPlus Core from a transcript
- [ ] CLI interface: `textplus-convert <transcript.txt> [--output <dir>]`

### Should Have
- [ ] Support transcripts from Inform 7, TADS 3, and Glulx games
- [ ] Detect and merge branching paths from multiple transcripts of the same game
- [ ] Map integration: generate a Trizbort-compatible map file from the transcript

### Nice to Have
- [ ] Web UI drag-and-drop interface for uploading transcripts
- [ ] Interactive diff viewer showing what changed between two transcripts of the same game

---

## Milestone 5 — Integration & Polish

Goals: Tie all four components together with shared tooling, documentation, and a demo.

- [ ] End-to-end demo: take a public-domain IF transcript → convert → render → map
- [ ] Unified documentation site (VitePress or similar)
- [ ] Contribution guide (CONTRIBUTING.md)
- [ ] Code of Conduct (CODE_OF_CONDUCT.md)
- [ ] Automated CI/CD pipeline (GitHub Actions: lint, test, build, deploy docs)
- [ ] First public release (v0.1.0) with changelog

---

## Extras / Future Ideas

These items are not committed to any milestone but are worth tracking.

- Parser IF interpreter embedded in the browser (run Z-machine/Glulx games natively)
- Side-by-side view: parser game on left, hypertext version on right
- Community gallery of TextPlus games
- Plugin/extension system for TextPlus Author
- Accessibility audit and WCAG 2.1 AA compliance pass
