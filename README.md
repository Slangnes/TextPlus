# TextPlus

**Modernizing the Interactive Fiction Stack**

TextPlus is a project to bridge the gap between the classic, beloved tools of interactive fiction (IF) and the modern web. Rather than starting from scratch, TextPlus builds on the shoulders of giants — updating, connecting, and extending existing open-source IF tools to make them easier to author, easier to play, and better to look at.

---

## Vision

Interactive fiction has a rich history, but many of the best tools are unmaintained, difficult to set up, or locked to outdated workflows. TextPlus aims to:

- **Modernize Undum** — Bring the Undum hypertext IF framework up to current JavaScript/web standards.
- **Modernize Raconteur** — Revive and extend the author-friendly Undum wrapper with a contemporary toolchain.
- **Automate Trizbort** — Add automation and quality-of-life improvements to the Trizbort.io browser-based map/code generator so it is less manual and more intelligent.
- **Automate Transmatte** — Streamline the process of converting parser-IF transcripts into the hypertext-style HTML experiences that Undum and Raconteur produce.

The four tools work together as a coherent pipeline:

```
Parser IF game → Transcript (Convert) → TextPlus DSL (Author) → Playable hypertext (Core) → Visual Map (Map)
```

…and the **Workbench** wraps the whole pipeline in a browser: paste a transcript, edit the story, play it live, and watch the map draw itself.

---

## Packages

npm workspaces monorepo under `packages/*`. Dependency direction: `core` ← `author` ← (`map`, `convert`) ← `demo`/`workbench`.

| Package | Upstream inspiration | Status | What it is |
|---|---|---|---|
| `@textplus/core` | [Undum](https://github.com/idmillington/undum) | ✅ M1 complete | ES-module runtime: engine, qualities, situations, DOM renderer, HUD/themes, storage |
| `@textplus/author` | [Raconteur](https://github.com/sequitur/raconteur) | ✅ M2 complete | Authoring DSL: parser → compiler → linter → workflow, plus the `textplus-author` / `create-textplus-game` CLI |
| `@textplus/map` | [Trizbort.io](https://github.com/henck/trizbort) | 🚧 M3 in progress | Compass-true auto-layout, zoom/pan, ZIL + transcript importers, Trizbort XML export, graph→DSL round-trip (powers the Workbench map) |
| `@textplus/convert` | [Transmatte](https://eblong.com/zarf/transmatte/) | 🚧 M4 in progress | Parser-IF material → compiling TextPlus DSL: transcripts (linear or branching merge), **ZIL deconstruction straight from the program**, `textplus-convert` CLI |
| `@textplus/demo` | — | ✅ | Three playable example games built directly on core |
| `@textplus/workbench` | — | ✅ active | Browser authoring app: Monaco editor, live preview, map, diagnostics, import/export |

Each package keeps exactly one doc: completed packages a real `README.md` (usage/reference), in-progress packages a `ROADMAP.md` (surface, verification, open items). Repo-wide sequencing lives in [ROADMAP.md](./ROADMAP.md).

---

## Quick start

Requires Node 20+.

```bash
npm install
npm run workbench        # authoring app on http://localhost:5175
```

Try it: pick an example from the toolbar, edit the DSL and watch the preview/map react, or click **Import** and paste a parser-IF transcript.

Other entry points:

```bash
npm run dev --workspace=@textplus/demo                        # example games on :5174
npm run build                                                 # build every package — required before any CLI bin below
node packages/author/bin/create-textplus-game.mjs MyGame .    # scaffold a starter game
node packages/author/bin/textplus-author.mjs compile MyGame/game.tp.txt
node packages/convert/bin/textplus-convert.mjs walk1.txt walk2.txt --check   # merge transcripts into a branching story
```

---

## Testing

The project's test layer is a **traced Playwright E2E suite** — every test records a `trace.zip`. Browser scenarios carry both verification vectors at once (the visual film-strip/DOM snapshots plus the code-level log of actions, console, and network); Node-context scenarios (the CLI and map-tool specs) carry the step log with command output and generated artifacts attached. Traces are the release QA artifacts.

```bash
npm run test:all         # tsc strict lint + all builds + the traced E2E suite
npm run test:e2e         # the suite alone; traces land in packages/workbench/test-results/
npx playwright show-trace <path>/trace.zip   # inspect a trace
```

---

## Credits & Inspirations

See [CREDITS.md](CREDITS.md) for the full bibliography of upstream projects, inspirations, historical references, and community resources that TextPlus is built upon.

---

## License

MIT — see [LICENSE](LICENSE).
