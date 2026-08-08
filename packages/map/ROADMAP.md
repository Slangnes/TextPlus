# @textplus/map — Roadmap

Story-graph layout and (eventually) Trizbort-style automation. This file is the package's single doc. (Repo-wide sequencing lives in the root `ROADMAP.md`.)

## Status

🚧 Milestone 3 first slice — auto-layout and the GameConfig adapter power the workbench's Map panel. Everything else Trizbort does is still ahead (see the parity gap below).

## Current Surface

| Module | Notes |
|---|---|
| `src/layout.ts` | Layered-BFS grid auto-layout: shortest-path depth columns from the start situation, unique cells, orphans parked in a trailing column with `reachable: false`, terminal (ending) flags |
| `src/adapter.ts` | `graphFromConfig` — `@textplus/core` GameConfig → neutral `StoryGraph` (parallel links deduplicated) |
| `src/index.ts` | Public exports; legacy `autoLayout(rooms)` surface backed by the real engine; `importTranscript` still a throwing placeholder |

## Verification

Test standard: the traced Playwright E2E suite is the only test layer. Run from the repository root: `npm run test:all`.

`packages/workbench/e2e/map.spec.ts` asserts the layout's properties through the rendered SVG: shortest-path depth columns, unique cells, orphan rooms parked in the trailing column with the unreachable tooltip, terminal flags on endings, parallel-edge dedup, and self-loop suppression. Node click-to-jump and current-room highlight are covered in `e2e/workbench.spec.ts`.

**Not verified**: the legacy `autoLayout(rooms)` surface and custom cell sizing (nothing in the app calls either).

## Trizbort Parity Gap (honest accounting)

[Trizbort.io](https://github.com/henck/trizbort) (MIT, Hans Donner) is a full interactive map *editor*. We currently have none of:

- Hand-drawn/editable maps: room placement, custom shapes, colors, regions, dark rooms
- Connection detail: compass directions, door states (locked/one-way), in/out labels
- Objects/props inside rooms
- Code generation: Inform 7, TADS 3, Alan 2/3, Quest, ZIL, YAML
- Trizbort file format import/export (round-trip with the desktop app and trizbort.io)
- Transcript import (auto-populate a map from a play session)

Our scope (root ROADMAP M3) is *automation on top of* those ideas — auto-layout (done), transcript import, and code-gen — not a re-implementation of the whole editor. Anything from the list above that TextPlus adopts should be tracked as an explicit item here and in the root roadmap.

## Ahead (M3 remainder)

- [ ] `importTranscript` — parse transcripts → room definitions (pairs with `@textplus/convert`)
- [ ] Code generators (Inform 7, Ink, TextPlus Author DSL)
- [ ] Export to Trizbort format
- [ ] Batch rename / find-replace
- [ ] Round-trip conversion (map ↔ DSL)
- [ ] Custom cell sizing exposed in the workbench (zoom/density) — would also make it verifiable

## Drift Rules

- This file is the package's only doc — update it in the same change set as the code it describes.
- Keep the parity-gap list honest: move items to "Ahead" only when actually scheduled.
