# @textplus/map — Roadmap

Story-graph layout and (eventually) Trizbort-style automation. This file is the package's single doc. (Repo-wide sequencing lives in the root `ROADMAP.md`.)

## Status

🚧 Milestone 3 in progress — auto-layout powers the workbench Map panel; the transcript importer and DSL code generation (round-trip with the adapter) shipped 2026-08-08. Trizbort-format export and the Inform 7/Ink generators are still ahead (see the parity gap below).

## Current Surface

| Module | Notes |
|---|---|
| `src/layout.ts` | `layoutGraph(graph, {columnWidth?, rowHeight?})` (defaults 200×72) — layered-BFS grid auto-layout: shortest-path depth columns from the start situation, unique cells, orphans parked in a trailing column with `reachable: false`, terminal (ending) flags |
| `src/adapter.ts` | `graphFromConfig` — `@textplus/core` GameConfig → neutral `StoryGraph` (parallel links deduplicated) |
| `src/importer.ts` | `importTranscript(text)` — play transcript → `StoryGraph`: room headers become nodes (unified by name, so revisits converge), commands become edges; headerless responses become linear step nodes. Extracts structure only — prose-preserving conversion belongs to `@textplus/convert` |
| `src/codegen.ts` | `graphToDsl(graph, {title?})` — compiling TextPlus DSL skeleton from a graph (titles, tags — emitted comma-form to match the parser — links, and start survive; prose is a placeholder; throws on an empty graph) |
| `src/index.ts` | Public exports; legacy `autoLayout(rooms)` surface backed by the real engine |

## Verification

Test standard: the traced Playwright E2E suite is the only test layer. Run from the repository root: `npm run test:all`.

`packages/workbench/e2e/map.spec.ts` asserts the layout's properties through the rendered SVG: shortest-path depth columns, unique cells, orphan rooms parked in the trailing column with the unreachable tooltip, terminal flags on endings, parallel-edge dedup, and self-loop suppression. Node click-to-jump and current-room highlight are covered in `e2e/workbench.spec.ts`. `e2e/map-tools.spec.ts` covers the importer (rooms/edges/start from a transcript) and the round-trip: graph → `graphToDsl` → author CLI compile → `graphFromConfig` → the same topology **and tags** (including a start node carrying extra tags — the tag-mangling regression case). Generated DSL and compile reports are attached to those traces. Round-trip fidelity is topology + tags: titles become situation titles; prose is a placeholder by design.

**Not verified**: the legacy `autoLayout(rooms)` surface and custom cell sizing (nothing in the app calls either).

## Trizbort Parity Gap (honest accounting)

[Trizbort.io](https://github.com/henck/trizbort) (MIT, Hans Donner) is a full interactive map *editor*. We currently have none of:

- Hand-drawn/editable maps: room placement, custom shapes, colors, regions, dark rooms
- Connection detail: compass directions, door states (locked/one-way), in/out labels
- Objects/props inside rooms
- Code generation: Inform 7, TADS 3, Alan 2/3, Quest, ZIL, YAML
- Trizbort file format import/export (round-trip with the desktop app and trizbort.io)

(Transcript import — auto-populating a map from a play session — shipped 2026-08-08 as `importTranscript`.)

Our scope (root ROADMAP M3) is *automation on top of* those ideas — auto-layout (done), transcript import (done), and code-gen — not a re-implementation of the whole editor. Anything from the list above that TextPlus adopts should be tracked as an explicit item here and in the root roadmap.

## Ahead (M3 remainder)

- [ ] Code generators: Inform 7, Ink (TextPlus Author DSL shipped via `graphToDsl`)
- [ ] Export to Trizbort format
- [ ] Batch rename / find-replace
- [ ] Workbench surfaces for the new tools (map-panel export, import-to-map flow)
- [ ] Custom cell sizing exposed in the workbench (zoom/density) — would also make it verifiable

## Drift Rules

- This file is the package's only doc — update it in the same change set as the code it describes.
- Keep the parity-gap list honest: move items to "Ahead" only when actually scheduled.
