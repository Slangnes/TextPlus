# @textplus/convert

Status: Milestone 4 **first slice implemented** — plain-text transcript → linear TextPlus DSL (the Transmatte-inspired workflow). Engine-specific formats, branch merging, and other generators are tracked as `it.todo` stubs.

## Current Surface

| File | Status | Notes |
|---|---|---|
| `src/transcript.ts` | Implemented | `parseTranscriptText(text)` — segments a transcript into moves (`>` commands, room headers, prose; strips `[Score...]`/`*** ... ***` noise); `transcriptToDsl(text, {title?})` — one situation per move, slugified deduped ids, `[start]` tag, links from sentence-cased commands, linkless final situation, prose sanitizer |
| `src/index.ts` | Partial | Exports the transcript slice; `parseTranscript`/`generateDSL`/`generateHTML` remain M4 placeholders |
| `test/unit/transcript.test.ts` | Real | 13 tests incl. the acceptance round-trip: generated DSL compiles through `@textplus/author` with zero errors |
| `test/fixtures/mini-transcript.txt` | Fixture | Hand-written Zork-style walk with header/noise/directive-lookalike edge cases |

## Accepted transcript format

- Lines starting with `>` are player commands.
- A short (≤50 chars) Title-Case or ALL-CAPS line opening a prose block is treated as a room header; lines ending in sentence punctuation are prose.
- `[bracketed interpreter noise]` and `*** banners ***` are stripped.
- Prose lines that would lex as DSL directives (`-> `, `:: `, `{ ... }`, `title:`, `quality `, `hud `, `theme `) are neutralized with lookalike characters or indentation — a documented limitation.

## Known Gaps (M4 remainder)

- Z-machine/Glulx/Inform 7/TADS 3 format specifics; multi-transcript branch merging; HTML and Trizbort generators; CLI.
- The far-future "dissect and extend compiled games" ambition is a project horizon note (see ROADMAP Extras), not scheduled work.

## Verification

```bash
npm run lint       # from repo root
npm run test:e2e   # Import-transcript scenarios exercise the full slice
```

The transcript slice is verified end-to-end through the workbench **Import** feature (`packages/workbench/e2e/import.spec.ts`): a pasted transcript must convert, compile with zero issues, play along its own command path, and map — the round-trip acceptance, running through the real app. The M4 placeholders (`parseTranscript`, `generateDSL`, `generateHTML`) throw and have no coverage.

## Drift Rules

- Keep this file aligned with actual modules in `src/`.
- Track roadmap-level sequencing in `ROADMAP.md`, not here.
