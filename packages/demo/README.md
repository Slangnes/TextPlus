# @textplus/demo

Playable example games built directly on `@textplus/core`. Each game is a
static Vite page: an inline `<script type="module">` in its `index.html`
imports the engine, with a documented `game.ts` config alongside it as the
readable reference.

## Games

| Path | Game | Demonstrates |
|---|---|---|
| `index.html` | Landing page | Links to all demos with a suggested reading order |
| `hello-world/` | Hello World | Minimal Core usage: situation transitions, quality tracking, conditional text, multiple endings |
| `detective-case/` | The Detective's Case | Event listeners, situation history, mixed quality types, conditional links, save/load |
| `memory-keeper/` | The Memory Keeper | Quality constraints, entry/exit callbacks, state-driven theme switching, multi-slot save/load |

## Development

Run from the repository root:

```bash
npm run dev --workspace=@textplus/demo   # dev server on port 5174
npm run build                            # builds every package, demo included
```

`vite.config.ts` aliases `@textplus/core` to `../core/src/index.ts` (the same
pattern as workbench), so demos always run against current core sources — no
prior core build is required.

## Verification

`npm run build` compiles every demo page against current core sources, and the
DSL adaptations of all three games load and compile clean in the workbench E2E
suite (`npm run test:e2e`, guarded by `e2e/conventions.spec.ts`).

## Drift Rules

- Add one README section per demo when adding a folder.
- Keep demos tied to real package capabilities, not aspirational features.
- Use the repository `ROADMAP.md` for milestone sequencing and completion state.
