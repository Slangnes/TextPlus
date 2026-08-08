import { describe, it, expect } from 'vitest';
import { getSettings, updateSettings, sanitizeLayout } from '../../src/settings';

function makeStorage(initial: Record<string, string> = {}): Storage {
  const store: Record<string, string> = { ...initial };
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((key) => delete store[key]);
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
}

describe('settings', () => {
  it('defaults to confirmations enabled', () => {
    expect(getSettings(makeStorage()).confirmBeforeReplace).toBe(true);
    expect(getSettings(null).confirmBeforeReplace).toBe(true);
  });

  it('round-trips an update', () => {
    const storage = makeStorage();
    updateSettings({ confirmBeforeReplace: false }, storage);
    expect(getSettings(storage).confirmBeforeReplace).toBe(false);
  });

  it('recovers from corrupt stored JSON', () => {
    const storage = makeStorage({ 'textplus-workbench-settings': '{not json' });
    expect(getSettings(storage).confirmBeforeReplace).toBe(true);
  });

  it('returns the merged settings without persisting when storage is null', () => {
    const next = updateSettings({ confirmBeforeReplace: false }, null);
    expect(next.confirmBeforeReplace).toBe(false);
  });

  it('defaults to a four-panel layout showing every module', () => {
    const { layout } = getSettings(makeStorage());
    expect(layout.panelCount).toBe(4);
    expect(layout.views).toEqual(['editor', 'play', 'map', 'diagnostics']);
  });

  it('round-trips a layout update', () => {
    const storage = makeStorage();
    updateSettings({ layout: { panelCount: 2, views: ['play', 'editor', 'map', 'diagnostics'] } }, storage);
    const { layout } = getSettings(storage);
    expect(layout.panelCount).toBe(2);
    expect(layout.views[0]).toBe('play');
  });
});

describe('sanitizeLayout', () => {
  it('clamps invalid panel counts back to the default', () => {
    expect(sanitizeLayout({ panelCount: 0 }).panelCount).toBe(4);
    expect(sanitizeLayout({ panelCount: 9 }).panelCount).toBe(4);
    expect(sanitizeLayout({ panelCount: 2.5 }).panelCount).toBe(4);
    expect(sanitizeLayout({ panelCount: '2' }).panelCount).toBe(4);
  });

  it('drops unknown views and dedupes, refilling to all four', () => {
    const layout = sanitizeLayout({ views: ['map', 'map', 'bogus', 'editor'] });
    expect(layout.views.slice(0, 2)).toEqual(['map', 'editor']);
    expect([...layout.views].sort()).toEqual(['diagnostics', 'editor', 'map', 'play']);
    expect(layout.views).toHaveLength(4);
  });

  it('handles garbage input wholesale', () => {
    expect(sanitizeLayout(null).views).toHaveLength(4);
    expect(sanitizeLayout('nonsense').panelCount).toBe(4);
  });
});
