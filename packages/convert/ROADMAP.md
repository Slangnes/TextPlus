# @textplus/convert — Roadmap

Transcript-to-story conversion (the Transmatte-inspired workflow). This file is the package's single doc. (Repo-wide sequencing lives in the root `ROADMAP.md`.)

## Status

🚧 Milestone 4 in progress — the Transmatte flow runs from the actual program: ZIL deconstruction recovers rooms, prose, compass exits, **gated (conditional) exits** over synthesized qualities, opt-in **globals as qualities** (`--globals`), and **multi-file → worlds** (one world per file, cross-file exits as world-switch links). Every ZIL run emits a **deconstruction report** (recovered / derived / not recovered — modeled on the cite-your-source discipline of AMFV-EE's game-data.js), printed by the CLI and summarized in the workbench Import confirm. Plus: transcripts (linear + branching merge). Compiled story-file (.z5) deconstruction and the HTML/Trizbort generators remain ahead. Proving ground: the full AMFV set (prism+rockvil+apartment) → 178 rooms / 3 worlds / 446 exits, prose for 167, with 185 SORRY + 197 PER exits honestly reported as not recovered.

## Current Surface

| Module | Notes |
|---|---|
| `src/transcript.ts` | `parseTranscriptText(text)` — segments a transcript into moves (`>` commands, room headers, prose; strips `[Score…]`/`*** … ***` noise). `transcriptToDsl(text, {title?})` — one situation per move, slugified deduped ids, `[start]` tag, links from sentence-cased commands, linkless final situation, directive-lookalike prose neutralized. Throws only on empty input |
| `src/merge.ts` | `mergeTranscriptsToDsl(texts, {title?})` — merges several playthroughs into one branching story: rooms unify by header name (within and across transcripts), shared rooms gain one link per distinct continuation; headerless moves stay linear (nothing safe to unify on) |
| `src/zil.ts` | `deconstructZil(files, {title?, globals?})` → `{dsl, report}` (plus `zilToDsl` single-source convenience): rooms with real prose (LDESC, else M-LOOK strings — flagged *derived*), movement-labeled exits, `IF FLAG` / `IF DOOR IS OPEN` gates → boolean qualities + `? gated` links (mechanics reported as authoring work), simple globals → qualities, multi-file → worlds. `formatConversionReport` renders the recovered/derived/not-recovered ledger |
| `src/cli.ts` + `bin/` | `textplus-convert <input...> [--title] [--out] [--check]` — ZIL sources auto-detected (`<ROOM` forms) and deconstructed; otherwise one transcript converts linearly, several merge; `--check` compiles through `@textplus/author`. Exit codes 0/1/2. Run `bin/textplus-convert.mjs` after `npm run build` |
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

- [ ] Compiled story-file deconstruction (.z5/.dat) — ZIL *source* deconstruction shipped; binaries remain the horizon note
- [ ] Engine-specific transcript formats: Glulx, Inform 7, TADS 3
- [ ] Object/inventory extraction (ZIL `<OBJECT>` forms — next docs-grounded slice)
- [ ] Blocked-link DSL construct (a gated link with a refusal message) — would recover the 185 SORRY exits
- [ ] Standalone HTML generator (via Core)
- [ ] Trizbort map generator (pairs with `@textplus/map`)
- [ ] Merge unification for headerless moves (currently only room headers unify)
- [ ] Broad transcript-sample coverage through the Import/CLI E2E paths
- [ ] Multi-file merge in the workbench Import dialog (CLI-only today); drag-and-drop / file upload

## Drift Rules

- This file is the package's only doc — update it in the same change set as the code it describes.
- The "always compiles with zero errors" guarantee holds only for the accepted format above; keep the guarantee and the format description in sync.
