/**
 * TextPlus Workbench - Application Bootstrap
 *
 * Wires the editor, compile controller, live preview, story map, diagnostics,
 * toolbar, and bottom status bar into a configurable 1-4 panel layout with
 * drag-resizable splits. Each panel hosts one module (or nothing). All logic
 * lives in the sibling modules; this file is DOM glue only.
 */

import { analyzeSource } from './controller';
import type { WorkbenchReport } from './controller';
import { createEditor } from './editor';
import { PreviewHost } from './preview';
import { loadDraft, saveDraft } from './drafts';
import { BLANK_TEMPLATE, EXAMPLES, SAMPLE_STORY } from './examples';
import { confirmAction, openImportDialog, openSettingsDialog } from './modal';
import { transcriptToDsl, zilToDsl } from '@textplus/convert';
import { renderMap } from './mapview';
import { getSettings, updateSettings, PANEL_MODULES, SOLO_POSITIONS } from './settings';
import type { PanelModule, PanelView, SoloPosition, WorkbenchSettings } from './settings';
import { graphFromConfig, graphToTrizbort, layoutGraph } from '@textplus/map';
import type { GameConfig } from '@textplus/core';

const COMPILE_DEBOUNCE_MS = 250;

const VIEW_LABELS: Record<PanelView, string> = {
  editor: 'Editor',
  play: 'Play',
  map: 'Map',
  diagnostics: 'Diagnostics',
  none: '— empty —',
};

function requireElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Workbench markup is missing #${id}`);
  }
  return el as T;
}

const statusEl = requireElement<HTMLElement>('status');
const statusSituationEl = requireElement<HTMLElement>('status-situation');
const statusWorldEl = requireElement<HTMLElement>('status-world');
const statusTurnEl = requireElement<HTMLElement>('status-turn');
const statusCursorEl = requireElement<HTMLElement>('status-cursor');
const diagnosticsEl = requireElement<HTMLElement>('diagnostics');
const mapContainer = requireElement<HTMLElement>('map-container');
const exampleSelect = requireElement<HTMLSelectElement>('example-select');
const layoutSelect = requireElement<HTMLSelectElement>('layout-select');
const viewStash = requireElement<HTMLElement>('view-stash');
const preview = new PreviewHost(requireElement<HTMLElement>('preview-game'));
preview.attachMessageLog(requireElement<HTMLElement>('preview-messages'));

const viewElements: Record<PanelModule, HTMLElement> = {
  editor: requireElement<HTMLElement>('view-editor'),
  play: requireElement<HTMLElement>('view-play'),
  map: requireElement<HTMLElement>('view-map'),
  diagnostics: requireElement<HTMLElement>('view-diagnostics'),
};

let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let lastGoodConfig: GameConfig | null = null;
let lastSituationLines: Record<string, number> = {};
let settings = getSettings();

const editor = createEditor(requireElement('editor-host'), loadDraft() ?? SAMPLE_STORY);

// --- Panel layout ------------------------------------------------------------

const SOLO_GLYPHS: Record<SoloPosition, string> = {
  bottom: '◒',
  left: '◐',
  top: '◓',
  right: '◑',
};

/** True when the 3-panel solo sits on the leading edge (top or left). */
function soloIsFirst(): boolean {
  const { panelCount, soloPosition } = settings.layout;
  return panelCount === 3 && (soloPosition === 'top' || soloPosition === 'left');
}

function applyLayout(): void {
  const { panelCount, views, sizes, soloPosition } = settings.layout;
  layoutSelect.value = String(panelCount);

  const showTopSecond = panelCount >= 2;
  const showBottomRow = panelCount >= 3;
  const showBottomSecond = panelCount >= 4;
  const sideways = panelCount === 3 && (soloPosition === 'left' || soloPosition === 'right');
  const soloFirst = soloIsFirst();

  const panes = requireElement('panes');
  const rowTop = requireElement('row-top');
  const rowBottom = requireElement('row-bottom');
  const splitTop = requireElement('split-top');
  const splitRows = requireElement('split-rows');

  splitTop.hidden = !showTopSecond;
  requireElement('panel-1').hidden = !showTopSecond;
  splitRows.hidden = !showBottomRow;
  rowBottom.hidden = !showBottomRow;
  requireElement('split-bottom').hidden = !showBottomSecond;
  requireElement('panel-3').hidden = !showBottomSecond;

  // 3-panel orientation: the solo panel can occupy any edge.
  panes.classList.toggle('panes--sideways', sideways);
  rowTop.classList.toggle('pane-row--stacked', sideways);
  splitRows.classList.toggle('splitter--h', !sideways);
  splitRows.classList.toggle('splitter--v', sideways);
  splitTop.classList.toggle('splitter--v', !sideways);
  splitTop.classList.toggle('splitter--h', sideways);
  rowTop.style.order = soloFirst ? '2' : '0';
  splitRows.style.order = '1';
  rowBottom.style.order = soloFirst ? '0' : '2';

  rowTop.style.flex = showBottomRow ? `${sizes.rows} 1 0%` : '1 1 0%';
  rowBottom.style.flex = `${100 - sizes.rows} 1 0%`;
  requireElement('panel-0').style.flex = showTopSecond ? `${sizes.topCols} 1 0%` : '1 1 0%';
  requireElement('panel-1').style.flex = `${100 - sizes.topCols} 1 0%`;
  requireElement('panel-2').style.flex = showBottomSecond ? `${sizes.bottomCols} 1 0%` : '1 1 0%';
  requireElement('panel-3').style.flex = `${100 - sizes.bottomCols} 1 0%`;

  const soloButton = requireElement<HTMLButtonElement>('btn-solo-position');
  soloButton.hidden = panelCount !== 3;
  soloButton.textContent = SOLO_GLYPHS[soloPosition];
  soloButton.title = `Large panel: ${soloPosition} (click to cycle)`;

  // 4-panel center handle sits at the split intersection.
  const centerHandle = requireElement('center-handle');
  centerHandle.hidden = panelCount !== 4;
  if (panelCount === 4) {
    centerHandle.style.left = `${sizes.topCols}%`;
    centerHandle.style.top = `${sizes.rows}%`;
  }

  for (let i = 0; i < 4; i += 1) {
    const body = requireElement(`panel-body-${i}`);
    const picker = requireElement<HTMLSelectElement>(`panel-picker-${i}`);
    const view = views[i];
    picker.value = view;
    requireElement(`panel-empty-${i}`).hidden = view !== 'none';
    if (view !== 'none') {
      const viewEl = viewElements[view];
      if (viewEl.parentElement !== body) {
        body.appendChild(viewEl);
      }
    }
  }

  // Modules not assigned to any slot wait in the hidden stash.
  PANEL_MODULES.forEach((module) => {
    if (!views.includes(module) && viewElements[module].parentElement !== viewStash) {
      viewStash.appendChild(viewElements[module]);
    }
  });
}

function persistLayout(): void {
  settings = updateSettings({ layout: settings.layout });
}

/** Assign a module (or nothing) to a panel; a module held elsewhere swaps in. */
function setPanelView(index: number, view: PanelView): void {
  const views = [...settings.layout.views];
  const current = views[index];
  if (current === view) {
    return;
  }
  if (view !== 'none') {
    const other = views.indexOf(view);
    if (other !== -1) {
      views[other] = current;
    }
  }
  views[index] = view;
  settings.layout.views = views;
  persistLayout();
  applyLayout();
}

function setPanelCount(count: number): void {
  settings.layout.panelCount = count;
  persistLayout();
  applyLayout();
}

// --- Splitter dragging -------------------------------------------------------

function clampPercent(value: number): number {
  return Math.min(90, Math.max(10, value));
}

/** Generic pointer-drag on a handle; reports 10-90 percentages within container. */
function wireDrag(
  handle: HTMLElement,
  container: HTMLElement,
  onDrag: (xPercent: number, yPercent: number) => void,
): void {
  handle.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    handle.setPointerCapture(event.pointerId);
    handle.classList.add('is-dragging');

    const onMove = (move: PointerEvent): void => {
      const rect = container.getBoundingClientRect();
      const x = clampPercent(((move.clientX - rect.left) / rect.width) * 100);
      const y = clampPercent(((move.clientY - rect.top) / rect.height) * 100);
      onDrag(x, y);
      applyLayout();
    };

    const onUp = (): void => {
      handle.classList.remove('is-dragging');
      handle.removeEventListener('pointermove', onMove);
      persistLayout();
    };

    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp, { once: true });
  });
}

/** Splitter axis follows its current orientation class (3-panel mode flips it). */
function wireSplitter(splitterId: string, containerId: string, apply: (percent: number) => void): void {
  const splitter = requireElement(splitterId);
  wireDrag(splitter, requireElement(containerId), (x, y) => {
    apply(splitter.classList.contains('splitter--h') ? y : x);
  });
}

wireSplitter('split-top', 'row-top', (p) => {
  settings.layout.sizes.topCols = p;
});
wireSplitter('split-bottom', 'row-bottom', (p) => {
  settings.layout.sizes.bottomCols = p;
});
wireSplitter('split-rows', 'panes', (p) => {
  // When the solo panel leads (top/left), the divider measures the solo share.
  settings.layout.sizes.rows = soloIsFirst() ? 100 - p : p;
});

// 4-panel mode: dragging the center handle moves the row split and aligns
// both column splits to the same axis.
wireDrag(requireElement('center-handle'), requireElement('panes'), (x, y) => {
  settings.layout.sizes.rows = y;
  settings.layout.sizes.topCols = x;
  settings.layout.sizes.bottomCols = x;
});

// --- Editor helpers ----------------------------------------------------------

function applyEditorPrefs(): void {
  editor.setWordWrap(settings.editorWordWrap);
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
        editor.focusLine(issue.line);
      } else {
        editor.focus();
      }
    });
    diagnosticsEl.appendChild(item);
  });
}

// --- Map ---------------------------------------------------------------------

/** null = the "All" view (whole graph, cross-world edges visible). */
let activeMapWorld: string | null = null;

function worldLabel(worldId: string): string {
  return lastGoodConfig?.worlds?.[worldId]?.label ?? worldId;
}

function renderWorldTabs(worldIds: string[]): void {
  const host = requireElement<HTMLElement>('map-worlds');
  host.replaceChildren();
  host.hidden = worldIds.length === 0;
  if (worldIds.length === 0) {
    return;
  }
  const addTab = (id: string | null, label: string): void => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = `map-world-tab${id === activeMapWorld ? ' is-active' : ''}`;
    tab.setAttribute('data-world-id', id ?? '*');
    tab.textContent = label;
    tab.addEventListener('click', () => {
      activeMapWorld = id;
      redrawMap();
    });
    host.appendChild(tab);
  };
  addTab(null, 'All');
  worldIds.forEach((id) => addTab(id, worldLabel(id)));
}

function redrawMap(): void {
  if (!lastGoodConfig) {
    return;
  }
  const graph = graphFromConfig(lastGoodConfig);
  const worldIds = Object.keys(lastGoodConfig.worlds ?? {});
  if (activeMapWorld && !worldIds.includes(activeMapWorld)) {
    activeMapWorld = null;
  }
  renderWorldTabs(worldIds);

  let filtered = graph;
  if (activeMapWorld) {
    const nodes = graph.nodes.filter((node) => node.world === activeMapWorld);
    const ids = new Set(nodes.map((node) => node.id));
    filtered = {
      nodes,
      edges: graph.edges.filter((edge) => ids.has(edge.from) && ids.has(edge.to)),
      startId:
        graph.startId && ids.has(graph.startId)
          ? graph.startId
          : lastGoodConfig.worlds?.[activeMapWorld]?.initialSituation ?? null,
    };
  }

  const graphLayout = layoutGraph(filtered);
  renderMap(
    graphLayout,
    {
      currentId: preview.getEngine()?.currentSituation ?? null,
      onNodeClick: (situationId) => {
        const engine = preview.getEngine();
        if (engine && engine.getSituation(situationId)) {
          engine.goToSituation(situationId);
        }
        // Clicking a room also takes the editor to its definition, so the
        // map, preview, and source stay one connected view of the story.
        const line = lastSituationLines[situationId];
        if (line !== undefined) {
          editor.focusLine(line);
        }
      },
    },
    mapContainer,
  );
}

preview.onRender = (info) => {
  statusSituationEl.textContent = `@ ${info.situationId}`;
  statusWorldEl.textContent = info.worldId ? `⬒ ${worldLabel(info.worldId)}` : '';
  statusTurnEl.textContent = info.turn !== undefined ? `⏱ ${info.turn}` : '';
  // The map follows the player between worlds (unless viewing All).
  if (info.worldId && activeMapWorld && info.worldId !== activeMapWorld) {
    activeMapWorld = info.worldId;
  }
  redrawMap();
};

// --- Compile pipeline --------------------------------------------------------

function compileNow(): void {
  const report = analyzeSource(editor.getValue());
  renderStatus(report);
  renderDiagnostics(report);
  editor.setMarkers(
    report.issues
      .filter((issue) => issue.line !== null)
      .map((issue) => ({ line: issue.line!, message: issue.message, severity: issue.severity })),
  );
  if (report.config) {
    lastGoodConfig = report.config;
    lastSituationLines = report.situationLines;
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
    saveDraft(editor.getValue());
    compileNow();
  }, COMPILE_DEBOUNCE_MS);
}

function setSource(source: string): void {
  editor.setValue(source);
  saveDraft(source);
  compileNow();
}

// --- Toolbar actions ---------------------------------------------------------

function downloadText(filename: string, text: string, type: string): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function storySlug(): string {
  const title = /^title:\s*(.+)$/m.exec(editor.getValue())?.[1]?.trim() ?? '';
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'story';
}

function exportStory(): void {
  downloadText(`${storySlug()}.tp.txt`, editor.getValue(), 'text/plain');
}

function exportTrizbort(): void {
  if (!lastGoodConfig) {
    statusEl.textContent = '✗ Nothing to export — fix the story errors first';
    statusEl.className = 'status status--error';
    return;
  }
  const layout = layoutGraph(graphFromConfig(lastGoodConfig));
  const xml = graphToTrizbort(layout, { title: lastGoodConfig.title });
  downloadText(`${storySlug()}.trizbort`, xml, 'application/xml');
}

// --- Wiring ------------------------------------------------------------------

editor.onChange(() => scheduleCompile());
editor.onCursorChange((line, column) => {
  statusCursorEl.textContent = `Ln ${line}, Col ${column}`;
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

requireElement<HTMLButtonElement>('btn-import').addEventListener('click', () => {
  void openImportDialog({
    // ZIL source deconstructs directly; anything else is read as a transcript.
    convert: (text) => (/<ROOM\s/.test(text) ? zilToDsl(text) : transcriptToDsl(text)),
  }).then((dsl) => {
    if (dsl === null) {
      return;
    }
    void confirmAction('Replace the current story with the imported transcript?').then((confirmed) => {
      if (confirmed) {
        setSource(dsl);
      }
    });
  });
});

requireElement<HTMLButtonElement>('btn-export').addEventListener('click', exportStory);

requireElement<HTMLButtonElement>('btn-export-trizbort').addEventListener('click', exportTrizbort);

requireElement<HTMLButtonElement>('btn-restart').addEventListener('click', () => {
  if (preview.getEngine()) {
    preview.restart();
    return;
  }
  if (lastGoodConfig) {
    preview.mount(lastGoodConfig, { preserveState: false });
    return;
  }
  // Nothing has ever compiled (e.g. a broken draft on load): say so instead
  // of silently doing nothing.
  statusEl.textContent = '✗ Nothing to restart — fix the story errors first';
  statusEl.className = 'status status--error';
});

requireElement<HTMLButtonElement>('btn-settings').addEventListener('click', () => {
  void openSettingsDialog({
    onChange: (next: WorkbenchSettings) => {
      settings = next;
      applyEditorPrefs();
      applyLayout();
    },
  });
});

layoutSelect.addEventListener('change', () => {
  setPanelCount(Number(layoutSelect.value));
});

requireElement<HTMLButtonElement>('btn-solo-position').addEventListener('click', () => {
  const current = settings.layout.soloPosition;
  const next = SOLO_POSITIONS[(SOLO_POSITIONS.indexOf(current) + 1) % SOLO_POSITIONS.length];
  settings.layout.soloPosition = next;
  persistLayout();
  applyLayout();
});

for (let i = 0; i < 4; i += 1) {
  const picker = requireElement<HTMLSelectElement>(`panel-picker-${i}`);
  (['editor', 'play', 'map', 'diagnostics', 'none'] as PanelView[]).forEach((view) => {
    const option = document.createElement('option');
    option.value = view;
    option.textContent = VIEW_LABELS[view];
    picker.appendChild(option);
  });
  picker.addEventListener('change', () => {
    setPanelView(i, picker.value as PanelView);
  });
}

// Test/automation hooks (used by the Playwright E2E suite).
declare global {
  interface Window {
    __workbench?: {
      getSource(): string;
      setSource(source: string): void;
      wordWrapOn(): boolean;
      getWorld(): string | undefined;
      setWorld(worldId: string): void;
      getTurn(): number | undefined;
      wait(turns?: number): void;
    };
  }
}
window.__workbench = {
  getSource: () => editor.getValue(),
  setSource,
  wordWrapOn: () => settings.editorWordWrap,
  getWorld: () => preview.getEngine()?.getCurrentWorld?.(),
  setWorld: (worldId: string) => {
    preview.getEngine()?.goToWorld?.(worldId);
  },
  getTurn: () => preview.getEngine()?.getTurn?.(),
  wait: (turns?: number) => {
    preview.wait(turns);
  },
};

// Restore layout and prefs; the editor was created with the saved draft
// (or the sample story) already loaded.
applyLayout();
applyEditorPrefs();
compileNow();
statusCursorEl.textContent = 'Ln 1, Col 1';
