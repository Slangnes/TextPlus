/**
 * TextPlus Workbench - Application Bootstrap
 *
 * Wires the editor, compile controller, live preview, story map, diagnostics,
 * and toolbar into a configurable 1-4 panel layout where each panel hosts one
 * module. All logic lives in the sibling modules; this file is DOM glue only.
 */

import { analyzeSource } from './controller';
import type { WorkbenchReport } from './controller';
import { PreviewHost } from './preview';
import { loadDraft, saveDraft } from './drafts';
import { BLANK_TEMPLATE, EXAMPLES, SAMPLE_STORY } from './examples';
import { confirmAction, openSettingsDialog } from './modal';
import { renderMap } from './mapview';
import { getSettings, updateSettings, PANEL_VIEWS } from './settings';
import type { PanelView } from './settings';
import { graphFromConfig, layoutGraph } from '@textplus/map';
import type { GameConfig } from '@textplus/core';

const COMPILE_DEBOUNCE_MS = 250;

const VIEW_LABELS: Record<PanelView, string> = {
  editor: 'Editor',
  play: 'Play',
  map: 'Map',
  diagnostics: 'Diagnostics',
};

function requireElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Workbench markup is missing #${id}`);
  }
  return el as T;
}

const editor = requireElement<HTMLTextAreaElement>('editor');
const gutter = requireElement<HTMLElement>('gutter');
const statusEl = requireElement<HTMLElement>('status');
const diagnosticsEl = requireElement<HTMLElement>('diagnostics');
const mapContainer = requireElement<HTMLElement>('map-container');
const exampleSelect = requireElement<HTMLSelectElement>('example-select');
const layoutSelect = requireElement<HTMLSelectElement>('layout-select');
const panes = requireElement<HTMLElement>('panes');
const preview = new PreviewHost(requireElement<HTMLElement>('preview-game'));

const viewElements: Record<PanelView, HTMLElement> = {
  editor: requireElement<HTMLElement>('view-editor'),
  play: requireElement<HTMLElement>('view-play'),
  map: requireElement<HTMLElement>('view-map'),
  diagnostics: requireElement<HTMLElement>('view-diagnostics'),
};

let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let lastGoodConfig: GameConfig | null = null;
let layout = getSettings().layout;

// --- Panel layout ------------------------------------------------------------

function applyLayout(): void {
  panes.className = `panes panes--${layout.panelCount}`;
  layoutSelect.value = String(layout.panelCount);

  for (let i = 0; i < 4; i += 1) {
    const panel = requireElement(`panel-${i}`);
    const body = requireElement(`panel-body-${i}`);
    const picker = requireElement<HTMLSelectElement>(`panel-picker-${i}`);
    const view = layout.views[i];

    panel.hidden = i >= layout.panelCount;
    picker.value = view;
    const viewEl = viewElements[view];
    if (viewEl.parentElement !== body) {
      body.appendChild(viewEl);
    }
  }
}

/** Assign a module to a panel; if another panel holds it, the two swap. */
function setPanelView(index: number, view: PanelView): void {
  const current = layout.views[index];
  if (current === view) {
    return;
  }
  const views = [...layout.views];
  views[views.indexOf(view)] = current;
  views[index] = view;
  layout = { ...layout, views };
  updateSettings({ layout });
  applyLayout();
}

function setPanelCount(count: number): void {
  layout = { ...layout, panelCount: count };
  updateSettings({ layout });
  applyLayout();
}

// --- Editor helpers ----------------------------------------------------------

function refreshGutter(): void {
  const count = editor.value.split('\n').length;
  gutter.textContent = Array.from({ length: count }, (_, i) => String(i + 1)).join('\n');
}

function focusLine(line: number): void {
  const lines = editor.value.split('\n');
  let start = 0;
  for (let i = 0; i < line - 1 && i < lines.length; i += 1) {
    start += lines[i].length + 1;
  }
  const length = lines[line - 1]?.length ?? 0;
  editor.focus();
  editor.setSelectionRange(start, start + length);
}

// --- Status & diagnostics ----------------------------------------------------

function renderStatus(report: WorkbenchReport): void {
  statusEl.className = `status status--${report.status}`;
  switch (report.status) {
    case 'empty':
      statusEl.textContent = 'Start typing your story';
      break;
    case 'ok':
      statusEl.textContent = `✓ ${report.config?.title} · ${report.summary}`;
      break;
    case 'warning':
      statusEl.textContent = `⚠ ${report.config?.title} · ${report.summary} · warnings`;
      break;
    case 'error': {
      const count = report.issues.filter((i) => i.severity === 'error').length;
      statusEl.textContent = `✗ ${count} error${count === 1 ? '' : 's'}`;
      break;
    }
  }
}

function renderDiagnostics(report: WorkbenchReport): void {
  diagnosticsEl.replaceChildren();

  if (report.issues.length === 0) {
    const ok = document.createElement('div');
    ok.className = 'diag diag--clean';
    ok.textContent = report.status === 'empty' ? 'The diagnostics panel reports problems as you type.' : 'No issues detected.';
    diagnosticsEl.appendChild(ok);
    return;
  }

  report.issues.forEach((issue) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `diag diag--${issue.severity}`;
    item.textContent = `${issue.severity === 'error' ? '✗' : '⚠'} ${issue.message}`;
    item.addEventListener('click', () => {
      if (issue.line !== null) {
        focusLine(issue.line);
      } else {
        editor.focus();
      }
    });
    diagnosticsEl.appendChild(item);
  });
}

// --- Map ---------------------------------------------------------------------

function redrawMap(): void {
  if (!lastGoodConfig) {
    return;
  }
  const graphLayout = layoutGraph(graphFromConfig(lastGoodConfig));
  renderMap(
    graphLayout,
    {
      currentId: preview.getEngine()?.currentSituation ?? null,
      onNodeClick: (situationId) => {
        const engine = preview.getEngine();
        if (engine && engine.getSituation(situationId)) {
          engine.goToSituation(situationId);
        }
      },
    },
    mapContainer,
  );
}

preview.onRender = () => redrawMap();

// --- Compile pipeline --------------------------------------------------------

function compileNow(): void {
  const report = analyzeSource(editor.value);
  renderStatus(report);
  renderDiagnostics(report);
  if (report.config) {
    lastGoodConfig = report.config;
    preview.mount(report.config);
    redrawMap();
  }
  // On errors the last good preview and map stay so play-testing can continue.
}

function scheduleCompile(): void {
  if (debounceTimer !== undefined) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    saveDraft(editor.value);
    compileNow();
  }, COMPILE_DEBOUNCE_MS);
}

function setSource(source: string): void {
  editor.value = source;
  refreshGutter();
  saveDraft(source);
  compileNow();
}

// --- Toolbar actions ---------------------------------------------------------

function exportStory(): void {
  const title = /^title:\s*(.+)$/m.exec(editor.value)?.[1]?.trim() ?? '';
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'story';
  const blob = new Blob([editor.value], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slug}.tp.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

// --- Wiring ------------------------------------------------------------------

editor.addEventListener('input', () => {
  refreshGutter();
  scheduleCompile();
});

editor.addEventListener('scroll', () => {
  gutter.scrollTop = editor.scrollTop;
});

requireElement<HTMLButtonElement>('btn-new').addEventListener('click', () => {
  void confirmAction('Replace the current story with a blank template?').then((confirmed) => {
    if (confirmed) {
      setSource(BLANK_TEMPLATE);
    }
  });
});

EXAMPLES.forEach((example) => {
  const option = document.createElement('option');
  option.value = example.id;
  option.textContent = example.label;
  exampleSelect.appendChild(option);
});

exampleSelect.addEventListener('change', () => {
  const example = EXAMPLES.find((candidate) => candidate.id === exampleSelect.value);
  exampleSelect.value = '';
  if (!example) {
    return;
  }
  void confirmAction(`Replace the current story with "${example.label}"?`).then((confirmed) => {
    if (confirmed) {
      setSource(example.source);
    }
  });
});

requireElement<HTMLButtonElement>('btn-export').addEventListener('click', exportStory);

requireElement<HTMLButtonElement>('btn-restart').addEventListener('click', () => {
  preview.restart();
});

requireElement<HTMLButtonElement>('btn-settings').addEventListener('click', () => {
  void openSettingsDialog();
});

layoutSelect.addEventListener('change', () => {
  setPanelCount(Number(layoutSelect.value));
});

for (let i = 0; i < 4; i += 1) {
  const picker = requireElement<HTMLSelectElement>(`panel-picker-${i}`);
  PANEL_VIEWS.forEach((view) => {
    const option = document.createElement('option');
    option.value = view;
    option.textContent = VIEW_LABELS[view];
    picker.appendChild(option);
  });
  picker.addEventListener('change', () => {
    setPanelView(i, picker.value as PanelView);
  });
}

// Restore layout, then the last draft (or seed first-timers with the sample).
applyLayout();
editor.value = loadDraft() ?? SAMPLE_STORY;
refreshGutter();
compileNow();
