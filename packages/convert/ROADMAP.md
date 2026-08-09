# @textplus/convert — Roadmap

Transcript-to-story conversion (the Transmatte-inspired workflow). This file is the package's single doc. (Repo-wide sequencing lives in the root `ROADMAP.md`.)

## Status

🚧 Milestone 4 in progress — three slices shipped: plain-text transcript → linear DSL (the workbench **Import** feature), multi-transcript **branching merge**, and the **`textplus-convert` CLI**. Engine-specific formats and the HTML/Trizbort generators remain ahead.

## Current Surface

| Module | Notes |
|---|---|
| `src/transcript.ts` | `parseTranscriptText(text)` — segments a transcript into moves (`>` commands, room headers, prose; strips `[Score…]`/`*** … ***` noise). `transcriptToDsl(text, {title?})` — one situation per move, slugified deduped ids, `[start]` tag, links from sentence-cased commands, linkless final situation, directive-lookalike prose neutralized. Throws only on empty input |
| `src/merge.ts` | `mergeTranscriptsToDsl(texts, {title?})` — merges several playthroughs into one branching story: rooms unify by header name (within and across transcripts), shared rooms gain one link per distinct continuation; headerless moves stay linear (nothing safe to unify on) |
| `src/cli.ts` + `bin/` | `textplus-convert <transcript...> [--title] [--out] [--check]` — one file converts linearly, several merge; `--check` compiles through `@textplus/author`. Exit codes 0/1/2. Run `bin/textplus-convert.mjs` after `npm run build` |
| `src/index.ts` | Public exports: `parseTranscriptText`, `transcriptToDsl`, `mergeTranscriptsToDsl` (+ types); the `slugify`/`sentenceCase`/`sanitizeProse` helpers stay module-internal; `parseTranscript` / `generateDSL` / `generateHTML` remain throwing M4 placeholders |

## Accepted transcript format

- Lines starting with `>` are player commands (a bare `>` reads as `wait`).
- A short (≤50 chars, ≤6 words for Title-Case) Title-Case or ALL-CAPS line opening a prose block is treated as a room header; lines ending in sentence punctuation are prose.
- `[bracketed interpreter noise]` and `*** banners ***` are stripped.
- Prose lines that would lex as DSL directives (`-> `, `:: `, `{ … }`, `title:`, `quality `, `hud `, `theme `) are neutralized with lookalike characters or indentation — a documented limitation.

## Verification

Test standard: the traced Playwright E2E suite is the only test layer. Run from the repository root: `npm run test:all`.

The linear slice is verified end-to-end through the workbench **Import** feature (`packages/workbench/e2e/import.spec.ts`): a pasted transcript must convert, compile with zero issues, play along its own command path, neutralize directive-lookalike prose, and map one room per move with a single terminal — the round-trip acceptance, running through the real app. The dialog's inline-error (empty transcript) and cancel paths are covered too.

The merge and CLI slices are verified by `e2e/convert-cli.spec.ts`: linear conversion under `--check`, a two-walk merge producing a branch point (the shared room gains both continuations) that compiles clean, `--out`/`--title`, empty-input failure, and usage exit codes.

**Not verified**: individual parser edge rules in isolation (header length/word-count rejection, slug prefixing, id dedup counters) — they're exercised only as far as the fixture transcript reaches them; feed varied real transcripts through the Import path to broaden this (see Ahead).

## Ahead (M4 remainder)

- [ ] Engine-specific format support: Z-machine variants, Glulx, Inform 7, TADS 3
- [ ] Object/inventory extraction from transcripts
- [ ] Standalone HTML generator (via Core)
- [ ] Trizbort map generator (pairs with `@textplus/map`)
- [ ] Merge unification for headerless moves (currently only room headers unify)
- [ ] Broad transcript-sample coverage through the Import/CLI E2E paths
- [ ] Multi-file merge in the workbench Import dialog (CLI-only today); drag-and-drop / file upload

## Drift Rules

- This file is the package's only doc — update it in the same change set as the code it describes.
- The "always compiles with zero errors" guarantee holds only for the accepted format above; keep the guarantee and the format description in sync.
