# @textplus/workbench

Browser authoring environment for TextPlus: write DSL in the left pane, play the compiled game live in the right pane, with lint/compile diagnostics streaming below.

## Module Inventory

| Module | Responsibility |
|--------|----------------|
| `src/controller.ts` | Runs the `@textplus/author` parse→compile→lint workflow, shapes results into a display report with line-number extraction |
| `src/preview.ts` | `PreviewHost` — mounts compiled `GameConfig`s into a playable preview via `@textplus/core`; preserves the playthrough across recompiles; `onRender` hook for observers |
| `src/mapview.ts` | SVG story map from `@textplus/map` layouts: rooms, arrows, current-situation highlight, click-to-jump |
| `src/drafts.ts` | Autosave/restore of DSL source to localStorage (injectable storage) |
| `src/settings.ts` | User preferences (confirmation dialogs on/off), localStorage-backed |
| `src/modal.ts` | In-app modal dialogs (`confirmAction`, `openSettingsDialog`) — native popups are banned project-wide, see CLAUDE.md |
| `src/examples.ts` | Blank template + four example stories (DSL tour and adaptations of all three demo games); must always compile clean |
| `src/main.ts` | DOM glue: editor, gutter, debounce, toolbar (New / example picker / Export / Restart / Settings), Play↔Map tabs, diagnostics bar with click-to-line |

## Usage

```bash
npm run workbench          # from repo root — dev server on http://localhost:5175
npm run test:workbench     # from repo root — unit + integration tests (vitest)
npm run test:e2e           # from repo root — Playwright E2E suite, traces always on
```

The layout is 1–4 panels (toolbar selector), each hosting any module — Editor, Play, Map, or Diagnostics — via the dropdown in its corner; picking a module already shown elsewhere swaps the two panels. Layout and draft persist in localStorage.

E2E runs write a `trace.zip` per test to `test-results/` — the visual QA artifact for releases. Open one with `npx playwright show-trace <path>/trace.zip`, or `npx playwright show-report` for the suite.

The Vite config aliases `@textplus/core` and `@textplus/author` to their **source** entrypoints, so edits to those packages hot-reload the workbench without a rebuild.

## Known Gaps

- Link conditions (`-> text => target ? condition`) are accepted by the parser but not evaluated (Author Phase 2B) — conditional links always show. The demo-game DSL adaptations flatten those mechanics accordingly.
- No Markdown rendering in situation content (Author Phase 2B).
- Plain textarea editor: no syntax highlighting or autocomplete yet.
- Map view is read-only layout (no drag repositioning or Trizbort export yet).
