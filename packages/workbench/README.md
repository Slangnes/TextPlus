# @textplus/workbench

Browser authoring environment for TextPlus: a 1–4 panel workspace where each panel hosts the Editor, live Play preview, story Map, or Diagnostics — recompiling as you type.

## Module Inventory

| Module | Responsibility |
|--------|----------------|
| `src/editor.ts` | Monaco editor host: wires up the grammar/themes from `dsl-language.ts`, wrap-safe line numbers, diagnostic squiggles via model markers |
| `src/dsl-language.ts` | The TextPlus DSL Monarch grammar and palette-matched light/dark editor themes, kept as plain data |
| `src/controller.ts` | Runs the `@textplus/author` parse→compile→lint workflow, shapes results into a display report with line-number extraction |
| `src/preview.ts` | `PreviewHost` — mounts compiled `GameConfig`s into a playable preview via `@textplus/core`; preserves the playthrough across recompiles; `onRender` hook for observers |
| `src/mapview.ts` | SVG story map from `@textplus/map` layouts: rooms, arrows, up/down/in/out edge labels, current-situation highlight, click-to-jump, wheel zoom / drag pan / double-click fit; world tabs (All + per world) filter the graph and follow the player between modes |
| `src/drafts.ts` | Autosave/restore of DSL source to localStorage (injectable storage) |
| `src/settings.ts` | User preferences and layout persistence (confirm dialogs, word wrap, panel count/views/splitter sizes/solo position), localStorage-backed |
| `src/modal.ts` | In-app modal dialogs (`confirmAction`, `openImportDialog`, `openSettingsDialog`) — native popups are banned project-wide, see CLAUDE.md |
| `src/examples.ts` | Blank template + four example stories (DSL tour and adaptations of all three demo games); must always compile clean |
| `src/main.ts` | DOM glue: editor, compile debounce, toolbar (New / example picker / Import / Export / Restart / layout selector / solo-position / Settings), 1–4 panel layout with drag splitters, status bar (compile · world · situation · turn · cursor), diagnostics with click-to-line |
| `src/journal.ts` | Journal panel: task checklist + capture recordings (frozen content snapshots), entries click through to their situation in the editor |

## Usage

```bash
npm run workbench          # from repo root — dev server on http://localhost:5175
npm run test:e2e           # from repo root — Playwright E2E suite, traces always on
```

The layout is 1–4 panels (toolbar selector), each hosting any module — Editor, Play, Map, Diagnostics, or nothing — via the dropdown in its corner; picking a module already shown elsewhere swaps the two panels. Panels resize by dragging the splitters; in 4-panel mode the center handle moves all splits at once, and in 3-panel mode the ◒/◐/◓/◑ toolbar button cycles the large panel between bottom/left/top/right. A bottom status bar shows compile state, the preview's current situation, and the cursor position. The editor is Monaco (the VS Code editor component) with TextPlus DSL syntax highlighting, error/warning squiggles, and word wrap on by default — line numbers stay correct while wrapping, with continuations indented below their number. Everything persists in localStorage.

E2E tests drive the editor through the `window.__workbench` hook (`getSource`/`setSource`/`wordWrapOn`) instead of DOM typing.

E2E runs write a `trace.zip` per test to `test-results/` — the release QA artifacts (browser scenarios carry the visual film-strip; Node-context specs attach their command output and generated artifacts instead). Open one with `npx playwright show-trace <path>/trace.zip`, or `npx playwright show-report` for the suite.

## Verification

The suite verifies the workbench itself, not just the packages it hosts: toolbar flows (New through the confirm modal with draft persistence, Export filename slugification and payload, Import incl. the ZIL file-picker path, inline errors, and cancel), map navigation (compass-true geometry, zoom/pan/fit, Trizbort export download), panel/layout behavior (module swap semantics, empty panels, 3-panel solo-edge cycling, 4-panel center-handle alignment, splitter sizes and layout surviving reload), editor behavior (fine-grained tokenization, word-wrap toggle, cursor readout, diagnostic click-to-focus/click-to-line), modal dismissal (Escape and backdrop), and draft autosave across reloads (`e2e/workbench.spec.ts`, `e2e/toolbar.spec.ts`, `e2e/import.spec.ts`).

The `e2e/` directory hosts the **repo-wide** suite, not just workbench scenarios: convention guards (`conventions.spec.ts`), core-through-the-app (`engine.spec.ts`), linting/diagnostics (`diagnostics.spec.ts`), map geometry (`map.spec.ts`), the Import feature (`import.spec.ts`), and Node-context specs for the author/convert CLIs and map tools (`cli.spec.ts`, `convert-cli.spec.ts`, `map-tools.spec.ts`). It lives here because the Playwright config and dev server do.

The Vite config aliases `@textplus/core`, `@textplus/author`, `@textplus/map`, and `@textplus/convert` to their **source** entrypoints, so edits to those packages hot-reload the workbench without a rebuild.

**Import** (toolbar) opens an in-app dialog: paste — or file-pick — a Z-machine-style play transcript *or original ZIL source*. Transcripts become linear story drafts (`transcriptToDsl`); ZIL is deconstructed directly into rooms with real prose and compass exits (`zilToDsl`), auto-detected by its `<ROOM …>` forms. Either replaces the current story through the standard confirm flow. The map panel's **Export Trizbort** button downloads the current story's map in Trizbort's XML format.

## DSL quick reference

```
title: My Story
quality courage number = 5 min 0 max 10
hud courage meter "Courage"
theme dark when courage < 3

:: start [start]
Situation Title
{ courage += 1 }
Prose with **markdown**, {courage} interpolation,
and [oneOf: variants | that cycle].

-> Choice text => target ? courage >= 6 { courage -= 1 }
```

Conditions evaluate at runtime (links hide until true); effects mutate qualities on choose, and a whole-line `{ … }` block right after the situation title runs on entry (the DSL has no comment syntax); the HUD and theme rules react live in the Play panel. Full DSL reference: `packages/author/README.md`.

## Known Gaps

- No DSL autocomplete or hover docs in the editor yet (Monaco makes these natural next steps).
- Map view is read-only layout — see `packages/map/ROADMAP.md` for the full Trizbort parity gap.
- No situation "modes"/timed text/media hooks yet — see ROADMAP "Beyond Text".
