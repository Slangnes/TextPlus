/**
 * TextPlus Workbench - User Settings
 *
 * Persists workbench preferences to localStorage. Storage is injectable for
 * tests. Holds the confirmation-dialog preference (no-native-popups
 * convention), editor word wrap, and the panel layout: up to four segments,
 * each hosting one module or nothing, with drag-adjustable split sizes.
 */

const SETTINGS_KEY = 'textplus-workbench-settings';

export type PanelModule = 'editor' | 'play' | 'map' | 'diagnostics';
/** What a panel can host: a module, or nothing. 'none' may repeat; modules may not. */
export type PanelView = PanelModule | 'none';

export const PANEL_MODULES: readonly PanelModule[] = ['editor', 'play', 'map', 'diagnostics'];

export interface LayoutSizes {
  /** Height of the top row as a percentage (10-90). */
  rows: number;
  /** Width of the top-left panel as a percentage (10-90). */
  topCols: number;
  /** Width of the bottom-left panel as a percentage (10-90). */
  bottomCols: number;
}

/** Where the full-length panel sits in the 3-panel layout. */
export type SoloPosition = 'bottom' | 'left' | 'top' | 'right';

export const SOLO_POSITIONS: readonly SoloPosition[] = ['bottom', 'left', 'top', 'right'];

export interface LayoutSettings {
  /** How many panels are visible (1-4). */
  panelCount: number;
  /** What each of the four panel slots hosts. */
  views: PanelView[];
  sizes: LayoutSizes;
  /** 3-panel mode only: which edge the solo (full-length) panel occupies. */
  soloPosition: SoloPosition;
}

export interface WorkbenchSettings {
  /** Show a confirmation dialog before replacing the story. */
  confirmBeforeReplace: boolean;
  /** Soft-wrap long lines in the editor (hides the line-number gutter). */
  editorWordWrap: boolean;
  layout: LayoutSettings;
}

const DEFAULT_SIZES: LayoutSizes = { rows: 50, topCols: 50, bottomCols: 50 };

const DEFAULT_LAYOUT: LayoutSettings = {
  panelCount: 4,
  views: ['editor', 'play', 'map', 'diagnostics'],
  sizes: DEFAULT_SIZES,
  soloPosition: 'bottom',
};

function defaultStorage(): Storage | null {
  return typeof localStorage !== 'undefined' ? localStorage : null;
}

function isPanelModule(value: unknown): value is PanelModule {
  return typeof value === 'string' && (PANEL_MODULES as readonly string[]).includes(value);
}

function clampPercent(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(90, Math.max(10, value))
    : fallback;
}

/** Coerce any stored layout back to a valid one. */
export function sanitizeLayout(raw: unknown): LayoutSettings {
  const candidate = (raw ?? {}) as Partial<LayoutSettings>;

  const panelCount =
    typeof candidate.panelCount === 'number' &&
    Number.isInteger(candidate.panelCount) &&
    candidate.panelCount >= 1 &&
    candidate.panelCount <= 4
      ? candidate.panelCount
      : DEFAULT_LAYOUT.panelCount;

  // Keep 'none' entries as-is; keep each module's first occurrence only.
  const views: PanelView[] = [];
  if (Array.isArray(candidate.views)) {
    candidate.views.forEach((view) => {
      if (views.length >= 4) {
        return;
      }
      if (view === 'none') {
        views.push('none');
      } else if (isPanelModule(view) && !views.includes(view)) {
        views.push(view);
      }
    });
  }
  DEFAULT_LAYOUT.views.forEach((view) => {
    if (views.length < 4 && !views.includes(view)) {
      views.push(view);
    }
  });
  while (views.length < 4) {
    views.push('none');
  }

  const rawSizes = (candidate.sizes ?? {}) as Partial<LayoutSizes>;
  const sizes: LayoutSizes = {
    rows: clampPercent(rawSizes.rows, DEFAULT_SIZES.rows),
    topCols: clampPercent(rawSizes.topCols, DEFAULT_SIZES.topCols),
    bottomCols: clampPercent(rawSizes.bottomCols, DEFAULT_SIZES.bottomCols),
  };

  const soloPosition = (SOLO_POSITIONS as readonly unknown[]).includes(candidate.soloPosition)
    ? (candidate.soloPosition as SoloPosition)
    : DEFAULT_LAYOUT.soloPosition;

  return { panelCount, views, sizes, soloPosition };
}

function withDefaults(parsed: Partial<WorkbenchSettings>): WorkbenchSettings {
  return {
    confirmBeforeReplace:
      typeof parsed.confirmBeforeReplace === 'boolean' ? parsed.confirmBeforeReplace : true,
    editorWordWrap: typeof parsed.editorWordWrap === 'boolean' ? parsed.editorWordWrap : true,
    layout: sanitizeLayout(parsed.layout),
  };
}

export function getSettings(storage: Storage | null = defaultStorage()): WorkbenchSettings {
  if (!storage) {
    return withDefaults({});
  }
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    return withDefaults(raw ? (JSON.parse(raw) as Partial<WorkbenchSettings>) : {});
  } catch {
    return withDefaults({});
  }
}

export function updateSettings(
  patch: Partial<WorkbenchSettings>,
  storage: Storage | null = defaultStorage(),
): WorkbenchSettings {
  const next = withDefaults({ ...getSettings(storage), ...patch });
  if (storage) {
    try {
      storage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable — the setting just isn't persisted.
    }
  }
  return next;
}
