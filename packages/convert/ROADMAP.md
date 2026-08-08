# @textplus/convert — Roadmap

Transcript-to-story conversion (the Transmatte-inspired workflow). This file is the package's single doc. (Repo-wide sequencing lives in the root `ROADMAP.md`.)

## Status

🚧 Milestone 4 first slice — plain-text transcript → linear TextPlus DSL, surfaced in the workbench as the **Import** toolbar feature. Engine-specific formats, branch merging, and the other generators remain ahead.

## Current Surface

| Module | Notes |
|---|---|
| `src/transcript.ts` | `parseTranscriptText(text)` — segments a transcript into moves (`>` commands, room headers, prose; strips `[Score…]`/`*** … ***` noise). `transcriptToDsl(text, {title?})` — one situation per move, slugified deduped ids, `[start]` tag, links from sentence-cased commands, linkless final situation, directive-lookalike prose neutralized. Throws only on empty input |
| `src/index.ts` | Exports the transcript slice; `parseTranscript` / `generateDSL` / `generateHTML` remain throwing M4 placeholders |

## Accepted transcript format

- Lines starting with `>` are player commands (a bare `>` reads as `wait`).
- A short (≤50 chars) Title-Case or ALL-CAPS line opening a prose block is treated as a room header; lines ending in sentence punctuation are prose.
- `[bracketed interpreter noise]` and `*** banners ***` are stripped.
- Prose lines that would lex as DSL directives (`-> `, `:: `, `{ … }`, `title:`, `quality `, `hud `, `theme `) are neutralized with lookalike characters or indentation — a documented limitation.

## Verification

Test standard: the traced Playwright E2E suite is the only test layer. Run from the repository root: `npm run test:all`.

The slice is verified end-to-end through the workbench **Import** feature (`packages/workbench/e2e/import.spec.ts`): a pasted transcript must convert, compile with zero issues, play along its own command path, neutralize directive-lookalike prose, and map one room per move with a single terminal — the round-trip acceptance, running through the real app. The dialog's inline-error (empty transcript) and cancel paths are covered too.

**Not verified**: individual parser edge rules in isolation (header length/word-count rejection, slug prefixing, id dedup counters) — they're exercised only as far as the fixture transcript reaches them; feed varied real transcripts through the Import path to broaden this (see Ahead).

## Ahead (M4 remainder)

- [ ] Engine-specific format support: Z-machine variants, Glulx, Inform 7, TADS 3
- [ ] Object/inventory extraction from transcripts
- [ ] Multi-transcript merging (detect branching) → branching DSL
- [ ] Standalone HTML generator (via Core)
- [ ] Trizbort map generator (pairs with `@textplus/map`)
- [ ] `textplus-convert` CLI (root ROADMAP M5; the author CLI is the pattern to follow)
- [ ] Broad transcript-sample coverage through the Import E2E path
- [ ] Drag-and-drop / file upload in the workbench Import dialog (paste-only today)

## Drift Rules

- This file is the package's only doc — update it in the same change set as the code it describes.
- The "always compiles with zero errors" guarantee holds only for the accepted format above; keep the guarantee and the format description in sync.
