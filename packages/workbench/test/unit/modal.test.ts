// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { confirmAction, openSettingsDialog } from '../../src/modal';
import { getSettings, updateSettings } from '../../src/settings';

function makeStorage(): Storage {
  const store: Record<string, string> = {};
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

function query<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) {
    throw new Error(`Expected element ${selector}`);
  }
  return el;
}

describe('confirmAction', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('resolves true without rendering when confirmations are disabled', async () => {
    const storage = makeStorage();
    updateSettings({ confirmBeforeReplace: false }, storage);
    const result = await confirmAction('Replace?', { storage });
    expect(result).toBe(true);
    expect(document.querySelector('.modal-backdrop')).toBeNull();
  });

  it('resolves true when the confirm button is clicked', async () => {
    const storage = makeStorage();
    const pending = confirmAction('Replace the story?', { storage });
    expect(query('.modal__body p').textContent).toBe('Replace the story?');
    query<HTMLButtonElement>('.modal__button--primary').click();
    await expect(pending).resolves.toBe(true);
    expect(document.querySelector('.modal-backdrop')).toBeNull();
  });

  it('resolves false when cancelled', async () => {
    const pending = confirmAction('Replace?', { storage: makeStorage() });
    query<HTMLButtonElement>('.modal__button--plain').click();
    await expect(pending).resolves.toBe(false);
  });

  it('resolves false on Escape', async () => {
    const pending = confirmAction('Replace?', { storage: makeStorage() });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await expect(pending).resolves.toBe(false);
    expect(document.querySelector('.modal-backdrop')).toBeNull();
  });

  it('persists "don\'t ask again" when checked before confirming', async () => {
    const storage = makeStorage();
    const pending = confirmAction('Replace?', { storage });
    const checkbox = query<HTMLInputElement>('.modal__suppress input');
    checkbox.checked = true;
    query<HTMLButtonElement>('.modal__button--primary').click();
    await expect(pending).resolves.toBe(true);
    expect(getSettings(storage).confirmBeforeReplace).toBe(false);

    // Subsequent confirms skip the dialog entirely.
    const second = await confirmAction('Replace again?', { storage });
    expect(second).toBe(true);
    expect(document.querySelector('.modal-backdrop')).toBeNull();
  });
});

describe('openSettingsDialog', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('reflects and updates the confirmation setting', async () => {
    const storage = makeStorage();
    updateSettings({ confirmBeforeReplace: false }, storage);

    const pending = openSettingsDialog({ storage });
    const toggle = query<HTMLInputElement>('.modal__setting--confirm input');
    expect(toggle.checked).toBe(false);

    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
    expect(getSettings(storage).confirmBeforeReplace).toBe(true);

    query<HTMLButtonElement>('.modal__button--primary').click();
    await pending;
    expect(document.querySelector('.modal-backdrop')).toBeNull();
  });

  it('toggles editor word wrap and notifies onChange with full settings', async () => {
    const storage = makeStorage();
    const seen: boolean[] = [];

    const pending = openSettingsDialog({
      storage,
      onChange: (settings) => seen.push(settings.editorWordWrap),
    });

    const wrapToggle = query<HTMLInputElement>('.modal__setting--wrap input');
    expect(wrapToggle.checked).toBe(true);

    wrapToggle.checked = false;
    wrapToggle.dispatchEvent(new Event('change'));
    expect(getSettings(storage).editorWordWrap).toBe(false);
    expect(seen).toEqual([false]);

    query<HTMLButtonElement>('.modal__button--primary').click();
    await pending;
  });
});
