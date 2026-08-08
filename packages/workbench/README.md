# @textplus/workbench

Browser authoring environment for TextPlus: write DSL in the left pane, play the compiled game live in the right pane, with lint/compile diagnostics streaming below.

## Module Inventory

| Module | Responsibility |
|--------|----------------|
| `src/editor.ts` | Monaco editor host: TextPlus DSL Monarch grammar (syntax highlighting), palette-matched light/dark themes, wrap-safe line numbers, diagnostic squiggles via model markers |
| `src/controller.ts` | Runs the `@textplus/author` parse→compile→lint workflow, shapes results into a display report with line-number extraction |
| `src/preview.ts` | `PreviewHost` — mounts compiled `GameConfig`s into a playable preview via `@textplus/core`; preserves the playthrough across recompiles; `onRender` hook for observers |
| `src/mapview.ts` | SVG story map from `@textplus/map` layouts: rooms, arrows, current-situation highlight, click-to-jump |
| `src/drafts.ts` | Autosave/restore of DSL source to localStorage (injectable storage) |
| `src/settings.ts` | User preferences (confirmation dialogs on/off), localStorage-backed |
| `src/modal.ts` | In-app modal dialogs (`confirmAction`, `openImportDialog`, `openSettingsDialog`) — native popups are banned project-wide, see CLAUDE.md |
| `src/examples.ts` | Blank template + four example stories (DSL tour and adaptations of all three demo games); must always compile clean |
| `src/main.ts` | DOM glue: editor, gutter, debounce, toolbar (New / example picker / Import / Export / Restart / Settings), Play↔Map tabs, diagnostics bar with click-to-line |

## Usage

```bash
npm run workbench          # from repo root — dev server on http://localhost:5175
npm run test:e2e           # from repo root — Playwright E2E suite, traces always on
```

The layout is 1–4 panels (toolbar selector), each hosting any module — Editor, Play, Map, Diagnostics, or nothing — via the dropdown in its corner; picking a module already shown elsewhere swaps the two panels. Panels resize by dragging the splitters; in 4-panel mode the center handle moves all splits at once, and in 3-panel mode the ◒/◐/◓/◑ toolbar button cycles the large panel between bottom/left/top/right. A bottom status bar shows compile state, the preview's current situation, and the cursor position. The editor is Monaco (the VS Code editor component) with TextPlus DSL syntax highlighting, error/warning squiggles, and word wrap on by default — line numbers stay correct while wrapping, with continuations indented below their number. Everything persists in localStorage.

E2E tests drive the editor through the `window.__workbench` hook (`getSource`/`setSource`/`wordWrapOn`) instead of DOM typing.

E2E runs write a `trace.zip` per test to `test-results/` — the visual QA artifact for releases. Open one with `npx playwright show-trace <path>/trace.zip`, or `npx playwright show-report` for the suite.

The Vite config aliases `@textplus/core`, `@textplus/author`, `@textplus/map`, and `@textplus/convert` to their **source** entrypoints, so edits to those packages hot-reload the workbench without a rebuild.

**Import** (toolbar) opens an in-app dialog: paste a Z-machine-style play transcript and it becomes a linear story draft via `@textplus/convert`'s `transcriptToDsl` (replacing the current story through the standard confirm flow).

## DSL quick reference

```
title: My Story
quality courage number = 5 min 0 max 10
hud courage meter "Courage"
theme dark when courage < 3

:: start [start]
Situation Title
{ courage += 1 }                          # entry effects
Prose with **markdown**, {courage} interpolation,
and [oneOf: variants | that cycle].

-> Choice text => target ? courage >= 6 { courage -= 1 }
```

Conditions evaluate at runtime (links hide until true); effects mutate qualities on choose/entry; the HUD and theme rules react live in the Play panel.

## Known Gaps

- No DSL autocomplete or hover docs in the editor yet (Monaco makes these natural next steps).
- Map view is read-only layout — see `packages/map/README.md` for the full Trizbort parity gap.
- No situation "modes"/timed text/media hooks yet — see ROADMAP "Beyond Text".
