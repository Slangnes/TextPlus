/**
 * TextPlus Workbench - User Settings
 *
 * Persists workbench preferences to localStorage. Storage is injectable for
 * tests. Holds the confirmation-dialog preference (no-native-popups
 * convention) and the panel layout (up to four segments, each hosting one
 * workbench module).
 */

const SETTINGS_KEY = 'textplus-workbench-settings';

export type PanelView = 'editor' | 'play' | 'map' | 'diagnostics';

export const PANEL_VIEWS: readonly PanelView[] = ['editor', 'play', 'map', 'diagnostics'];

export interface LayoutSettings {
  /** How many panels are visible (1-4). */
  panelCount: number;
  /** Which module each of the four panel slots hosts; always all four, unique. */
  views: PanelView[];
}

export interface WorkbenchSettings {
  /** Show a confirmation dialog before replacing the story. */
  confirmBeforeReplace: boolean;
  layout: LayoutSettings;
}

const DEFAULT_LAYOUT: LayoutSettings = {
  panelCount: 4,
  views: ['editor', 'play', 'map', 'diagnostics'],
};

function defaultStorage(): Storage | null {
  return typeof localStorage !== 'undefined' ? localStorage : null;
}

function isPanelView(value: unknown): value is PanelView {
  return typeof value === 'string' && (PANEL_VIEWS as readonly string[]).includes(value);
}

/** Coerce any stored layout back to a valid one (count 1-4, all views once). */
export function sanitizeLayout(raw: unknown): LayoutSettings {
  const candidate = (raw ?? {}) as Partial<LayoutSettings>;

  const panelCount =
    typeof candidate.panelCount === 'number' &&
    Number.isInteger(candidate.panelCount) &&
    candidate.panelCount >= 1 &&
    candidate.panelCount <= 4
      ? candidate.panelCount
      : DEFAULT_LAYOUT.panelCount;

  const views: PanelView[] = [];
  if (Array.isArray(candidate.views)) {
    candidate.views.forEach((view) => {
      if (isPanelView(view) && !views.includes(view)) {
        views.push(view);
      }
    });
  }
  DEFAULT_LAYOUT.views.forEach((view) => {
    if (!views.includes(view)) {
      views.push(view);
    }
  });

  return { panelCount, views };
}

function withDefaults(parsed: Partial<WorkbenchSettings>): WorkbenchSettings {
  return {
    confirmBeforeReplace:
      typeof parsed.confirmBeforeReplace === 'boolean' ? parsed.confirmBeforeReplace : true,
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
