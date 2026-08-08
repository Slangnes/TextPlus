# @textplus/map

Status: Milestone 3 **first slice implemented** — auto-layout and the GameConfig adapter power the workbench's Map panel. Everything else Trizbort does is still ahead of us (see the parity gap below).

## Current Surface

| File | Status | Notes |
|---|---|---|
| `src/layout.ts` | Implemented | Layered-BFS grid auto-layout: depth columns from the start situation, unique cells, orphans parked in a trailing column, terminal (ending) flags |
| `src/adapter.ts` | Implemented | `graphFromConfig` — `@textplus/core` GameConfig → neutral `StoryGraph` (deduplicated edges) |
| `src/index.ts` | Implemented | Public exports; legacy `autoLayout(rooms)` surface now backed by the real engine; `importTranscript` still a placeholder |
| `test/unit/layout.test.ts` | Real | 15 tests covering chains, branches, cycles, orphans, sizing, adapter, legacy surface |

## Trizbort Parity Gap (honest accounting)

[Trizbort.io](https://github.com/henck/trizbort) (MIT, Hans Donner) is a full interactive map *editor*. We currently have none of:

- Hand-drawn/editable maps: room placement, custom shapes, colors, regions, dark rooms
- Connection detail: compass directions, door states (locked/one-way), in/out labels
- Objects/props inside rooms
- Code generation: Inform 7, TADS 3, Alan 2/3, Quest, ZIL, YAML
- Trizbort file format import/export (round-trip with the desktop app and trizbort.io)
- Transcript import (auto-populate a map from a play session)

Our scope (per ROADMAP M3) is *automation on top of* those ideas — auto-layout (done), transcript import, and code-gen — not a re-implementation of the whole editor. Anything from the list above that TextPlus adopts should be tracked as explicit ROADMAP items.

## Verification

Run these from the repository root:

```bash
npm run lint
npm run test:map
```

## Drift Rules

- Keep this file aligned with actual modules in `src/`.
- Track roadmap-level sequencing in `ROADMAP.md`, not here.
