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
    updateSettings(
      {
        layout: {
          panelCount: 2,
          views: ['play', 'editor', 'map', 'diagnostics'],
          sizes: { rows: 30, topCols: 65, bottomCols: 50 },
          soloPosition: 'bottom',
        },
      },
      storage,
    );
    const { layout } = getSettings(storage);
    expect(layout.panelCount).toBe(2);
    expect(layout.views[0]).toBe('play');
    expect(layout.sizes.topCols).toBe(65);
  });

  it('defaults editor word wrap on and round-trips it', () => {
    const storage = makeStorage();
    expect(getSettings(storage).editorWordWrap).toBe(true);
    updateSettings({ editorWordWrap: false }, storage);
    expect(getSettings(storage).editorWordWrap).toBe(false);
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

  it("allows repeated 'none' entries while keeping modules unique", () => {
    const layout = sanitizeLayout({ views: ['none', 'editor', 'none', 'editor'] });
    expect(layout.views).toEqual(['none', 'editor', 'none', 'play']);
  });

  it('clamps split sizes to 10-90 and defaults missing ones', () => {
    const layout = sanitizeLayout({ sizes: { rows: 5, topCols: 99, bottomCols: 'x' } });
    expect(layout.sizes).toEqual({ rows: 10, topCols: 90, bottomCols: 50 });
  });

  it('defaults the solo panel position to bottom and rejects invalid values', () => {
    expect(sanitizeLayout({}).soloPosition).toBe('bottom');
    expect(sanitizeLayout({ soloPosition: 'left' }).soloPosition).toBe('left');
    expect(sanitizeLayout({ soloPosition: 'diagonal' }).soloPosition).toBe('bottom');
  });
});
