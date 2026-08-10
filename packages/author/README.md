# @textplus/author

The TextPlus authoring toolchain: a human-readable DSL that compiles to `@textplus/core` game configs, with linting, a unified workflow, and a CLI. Milestone 2 complete — this is the package's real documentation.

## The DSL

A story is a plain text file (`.tp.txt` by convention). Line-oriented: directives up top, then situations.

```
title: The Dusty Archive

quality curiosity number = 1 min 0 max 10
quality lantern boolean = false

hud curiosity meter "Curiosity"
hud lantern badge "Lantern lit"

theme dark when curiosity < 3

:: start [start]
The Reading Room
Dust motes drift through amber light. Your curiosity stands at {curiosity}.
[oneOf: A page turns by itself. | The dark between the shelves breathes.]

-> Take the lantern and descend => stacks { lantern = true, curiosity += 1 }
-> Wait by the desk => start ? curiosity >= 3

:: stacks
The Lower Stacks
{ curiosity += 1 }
**Bold** and *soft* markdown render natively; raw HTML is escaped, never executed.
```

### Directives

| Line | Meaning |
|---|---|
| `title: <text>` | Story title (required) |
| `quality <id> number\|boolean\|string = <default> [min N] [max N]` | Declare a quality; numbers clamp to bounds; `min` must precede `max`; string defaults are written bare (`= calm`) |
| `hud <id> meter\|badge\|readout ["Label"]` | HUD entry bound to a quality (meter: progress bar; badge: shown when truthy; readout: label + value) |
| `theme <name> when <expr>` | Sets `data-theme="<name>"` on the play surface while the expression holds; last matching rule wins |
| `every <n> [in <world>] [{ effects }] [say "msg"]` | Fire effects and/or a message on every Nth turn of the game clock (each transition and `wait()` tick is one turn) |
| `at <n> [in <world>] [{ effects }] [say "msg"]` | Fire exactly once when the clock reaches turn N. World-scoped entries only fire while the player is there — a missed moment stays missed. Declaring `quality turn number = 0` gets the clock engine-maintained for conditions/HUD/interpolation. `at 0` is a parse error — the clock starts at 0, so moments fire from turn 1 |
| `map dungeon` | Ship a player-facing in-game map: fog-of-war reveal of visited rooms, a you-are-here marker, fast-travel to rooms already seen. Distinct from the workbench's developer map |
| `task <id> ["label"]` | Declare a capturable task/scene; `{ capture <id> }` effects complete it, recording the situation's content into the journal exactly as it read at capture time |
| `world <id> ["Label"]` | Declare a world/mode. Situations join it via qualified ids (`:: <world>:<id>`); links may target any world's situations (`=> comm:feed-a`), and crossing worlds is an ordinary transition. Each world resumes at its last-visited situation; the current world is exposed as `data-world` on the play surface and, when you declare `quality world string = ...`, mirrored into that quality for conditions/HUD/themes |

### Situations

| Line | Meaning |
|---|---|
| `:: <id> [tag, tag]` | Situation header; tags are **comma**-separated; the `start` tag marks the initial situation (defaults to the first one); tags become CSS classes on the rendered content |
| First line after the header | Situation title |
| `{ <effects> }` on its own line | Entry effects — run every time the situation is entered |
| Prose lines | Markdown (`**bold**`, `*emphasis*`, `` `code` ``), `{quality}` interpolation, adaptive spans |
| `-> <label> => <target> [? <condition>] [{ <effects> }]` | A choice link: optional gate condition, optional effects applied on choose |

### Expressions (conditions)

Safe, eval-free: `== != < > <= >=`, `and or not` (with `&& || !` accepted as aliases), parentheses, literals (numbers, `'single'`- or `"double"`-quoted strings, `true`/`false`), quality references. Unknown qualities read as undefined — comparisons are false except `!=`. Compiled conditions never throw; a gated link is simply hidden.

### Effects

`id = value` (typed: must match the declaration), `id += n` / `id -= n` (numbers only, clamped to bounds), and `capture <task-id>` (record the current scene into the journal). Comma-separated inside one brace block. Runtime failures are logged and never take down the UI.

### Adaptive text

`[oneOf: a | b | c]` cycles in order per render (spans track independently); `[randomly: …]` picks uniformly; `[frequently: …]` ≈70%, `[rarely: …]` ≈20%. `{quality}` interpolates the live value; unknown placeholders render literally.

**Footgun**: directives (`title:`, `quality`, `hud`, `theme`, `world`, `task`, `map`, `every`/`at`) are only recognized *before* the first `::` header — placed later they read as prose (or the situation's title). The linter surfaces full directive-shaped lines there as `misplaced-directive` warnings; `@textplus/convert` additionally neutralizes directive-lookalike transcript prose.

## CLI

```bash
npm run build                                                # builds dist/cli.mjs
node packages/author/bin/create-textplus-game.mjs MyGame .   # scaffold a starter
node packages/author/bin/textplus-author.mjs compile MyGame/game.tp.txt [--out report.json]
node packages/author/bin/textplus-author.mjs lint MyGame/game.tp.txt
node packages/author/bin/textplus-author.mjs scaffold MyGame .    # same as create-textplus-game
```

Exit codes: 0 success (warnings allowed), 1 errors/failure, 2 usage. `--out` writes the serialized workflow report (config + diagnostics) as JSON — note the config's compiled functions (conditions, effects, dynamic content) are dropped by JSON serialization; the report is for inspection, not execution.

## Library API

| Export | Purpose |
|---|---|
| `workflowExecute(source, {randomSeed?})` | parse → lint → compile; returns `{success, config, errors, warnings, lintDiagnostics, ast}` |
| `compileGame(source, options?)` | Thin wrapper returning `{game, errors, warnings}` |
| `formatWorkflowReport(result)` / `serializeWorkflowResult(result)` | Human-readable / JSON reports |
| `parseGame`, `compileAST`, `lintAST`, `formatDiagnostics` | The individual pipeline stages |
| `createScaffold(name, dir)` | Writes a starter `game.tp.txt` + `README.md` (Node only) |
| Expression/effect/content internals | `parseExpression`, `compileConditionExpr`, `parseEffects`, `markdownToHtml`, … for tooling |

## Linter rules

| Code | Severity | Fires when |
|---|---|---|
| `broken-link` | error | A link targets an undefined situation |
| `effect-parse-error` / `condition-parse-error` | error | A brace block / condition fails to parse |
| `effect-type-mismatch` | error | `+=`/`-=` on a non-number, or `=` assigning against the declared type |
| `orphaned-situation` | warning | Unreachable from the start |
| `empty-world` | warning | A declared world has no situations |
| `unknown-world-in-schedule` | warning | A schedule entry is scoped to a world that doesn't exist |
| `unknown-task-in-capture` | warning | A `capture` effect names an undeclared task |
| `unused-task` | warning | A task is declared but no effect ever captures it (well-formed `capture`s inside a parse-failing block still count) |
| `misplaced-directive` | warning | A full directive-shaped line sits inside a situation, where it reads as prose or the title |
| `unknown-quality-in-effect` / `-condition` / `-hud` | warning | Reference to an undeclared quality |
| `condition-type-mismatch` | warning | Ordered comparison on a declared non-number |
| `unused-quality` | warning | Declared but never referenced |

The parse/type/unknown-quality rules carry a `Line N:` prefix — the workbench uses it for Monaco squiggles and click-to-line. `broken-link`, `orphaned-situation`, and `unused-quality` are structural (no single line); clicking them focuses the editor without jumping.

## Migrating from Raconteur

Decision (M2 research, 2026-08-08): TextPlus does **not** execute Raconteur games — Raconteur stories are CoffeeScript/JavaScript programs whose situations run arbitrary code, and running them would mean shipping a JS sandbox rather than a declarative format. Migration is a rewrite into the DSL, and the mapping is direct:

| Raconteur | TextPlus DSL |
|---|---|
| `situation('id', { content: … })` | `:: id` + prose lines |
| `undularity.game.init` / start situation | `[start]` tag |
| `qualities.gold = qualities.integer(…)` | `quality gold number = 0 min … max …` |
| Markdown strings via markdown-it | Markdown is native (escape-first) |
| `oneOf(…)` / adaptive text helpers | `[oneOf: …]`, `[randomly: …]`, `[frequently: …]`, `[rarely: …]` |
| String interpolation of quality values | `{quality}` |
| `choices` / explicit link markup | `-> label => target ? cond { effects }` |
| Custom situation JS (arbitrary logic) | Not supported by design — model state with qualities, conditions, and effects; anything beyond that belongs in a core `SituationRenderer` (see root ROADMAP "Beyond Text") |
| CoffeeScript + Gulp build chain | None — the workbench compiles live; the CLI compiles files |

## Verification

The traced Playwright E2E suite is the only test layer (`npm run test:all` from the repo root). DSL behavior: `e2e/engine.spec.ts`, `e2e/diagnostics.spec.ts`, `e2e/workbench.spec.ts`, `e2e/conventions.spec.ts`. CLI: `e2e/cli.spec.ts`. **Not verified**: `compileGame` option flags beyond defaults; adaptive-text randomness rates (seeded RNG exists, no deterministic surface drives it — tracked in the root ROADMAP).

## Drift Rules

- This file is the package's only doc — keep the DSL reference in sync with the parser in the same change set.
- Open work lives in the root `ROADMAP.md`, not here.
