# @textplus/map — Roadmap

Story-graph layout and (eventually) Trizbort-style automation. This file is the package's single doc. (Repo-wide sequencing lives in the root `ROADMAP.md`.)

## Status

🚧 Milestone 3 in progress — the mapping core is at Trizbort level for auto-mapping (2026-08-09): compass-true layout from direction-carrying edges, zoom/pan navigation, Trizbort XML export, plus importers Trizbort doesn't have (ZIL source → exact map). Hand-editing, regions/colors, and the Inform 7/Ink generators are still ahead (see the parity gap below).

## Current Surface

| Module | Notes |
|---|---|
| `src/layout.ts` | `layoutGraph(graph, {columnWidth?, rowHeight?, mode?})` — two auto-selected modes: **compass** (Trizbort-style: rooms honor edge directions — north up, east right; collisions stretch along the exit vector) when most edges carry vectors, else **flow** (layered BFS depth columns). Unique cells; orphans flagged `reachable: false`; terminal flags |
| `src/directions.ts` | The direction vocabulary: `directionFromText` (commands and link labels → canonical Direction), `directionLabel` (Direction → "Go north"/"Enter") |
| `src/adapter.ts` | `graphFromConfig` — `@textplus/core` GameConfig → neutral `StoryGraph` (parallel links deduplicated) |
| `src/importer.ts` | `importTranscript(text)` — play transcript → `StoryGraph`: room headers become nodes (unified by name, so revisits converge), commands become edges; headerless responses become linear step nodes. Extracts structure only — prose-preserving conversion belongs to `@textplus/convert` |
| `src/zil.ts` | `importZilRooms(source)` — original Infocom ZIL source → exact `StoryGraph` with directional edges: `<ROOM …>` forms become nodes (titled by `DESC`), plain and conditional directional exits become compass-carrying edges; `SORRY`/`PER` exits and cross-file targets are skipped. Proven on AMFV's real `rockvil.zil`: 150 rooms, 331 directional connections, compass layout |
| `src/trizbort.ts` | `graphToTrizbort(layout, {title?})` — Trizbort XML export: rooms positioned from the layout, compass directions docked as ports, opposite one-ways merged into two-way lines. Generated to the published schema; not yet validated inside trizbort.io |
| `src/codegen.ts` | `graphToDsl(graph, {title?})` — compiling TextPlus DSL skeleton from a graph (titles, tags — emitted comma-form to match the parser — links, and start survive; prose is a placeholder; throws on an empty graph) |
| `src/index.ts` | Public exports; legacy `autoLayout(rooms)` surface backed by the real engine |

## Verification

Test standard: the traced Playwright E2E suite is the only test layer. Run from the repository root: `npm run test:all`.

`packages/workbench/e2e/map.spec.ts` asserts the layout's properties through the rendered SVG: shortest-path depth columns, unique cells, orphan rooms parked in the trailing column with the unreachable tooltip, terminal flags on endings, parallel-edge dedup, and self-loop suppression. Node click-to-jump and current-room highlight are covered in `e2e/workbench.spec.ts`. `e2e/map-tools.spec.ts` covers the importer (rooms/edges/start from a transcript) and the round-trip: graph → `graphToDsl` → author CLI compile → `graphFromConfig` → the same topology **and tags** (including a start node carrying extra tags — the tag-mangling regression case). Generated DSL and compile reports are attached to those traces. Round-trip fidelity is topology + tags: titles become situation titles; prose is a placeholder by design.

**Not verified**: the legacy `autoLayout(rooms)` surface and custom cell sizing (nothing in the app calls either).

## Trizbort Parity Gap (honest accounting)

[Trizbort.io](https://github.com/henck/trizbort) (MIT, Hans Donner) is a full interactive map *editor*. Shipped from its feature set: compass-direction layout and in/out/up/down labels (2026-08-09), one-way vs two-way connection flow in the export, Trizbort-format **export** (import still open), transcript import (2026-08-08), and zoom/pan navigation. We still have none of:

- Hand-drawn/editable maps: room placement, custom shapes, colors, regions, dark rooms
- Door states (locked doors) and per-connection text labels
- Objects/props inside rooms
- Code generation: Inform 7, TADS 3, Alan 2/3, Quest, ZIL, YAML
- Trizbort file format **import** (round-trip with the desktop app and trizbort.io)

Our scope (root ROADMAP M3) is *automation on top of* those ideas — auto-layout (done), transcript import (done), and code-gen — not a re-implementation of the whole editor. Anything from the list above that TextPlus adopts should be tracked as an explicit item here and in the root roadmap.

## Ahead (M3 remainder)

- [ ] Code generators: Inform 7, Ink (TextPlus Author DSL shipped via `graphToDsl`)
- [ ] Trizbort format import (export shipped; validate the export inside trizbort.io)
- [ ] Batch rename / find-replace
- [ ] Hand-editing: drag rooms, edit connections (the gap between auto-mapper and editor)

## Drift Rules

- This file is the package's only doc — update it in the same change set as the code it describes.
- Keep the parity-gap list honest: move items to "Ahead" only when actually scheduled.
