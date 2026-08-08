import { describe, it, expect } from 'vitest';
import { loadDraft, saveDraft, clearDraft } from '../../src/drafts';

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

describe('drafts', () => {
  it('round-trips a saved draft', () => {
    const storage = makeStorage();
    saveDraft('title: My Story', storage);
    expect(loadDraft(storage)).toBe('title: My Story');
  });

  it('returns null when no draft exists', () => {
    expect(loadDraft(makeStorage())).toBeNull();
  });

  it('clears a saved draft', () => {
    const storage = makeStorage();
    saveDraft('draft', storage);
    clearDraft(storage);
    expect(loadDraft(storage)).toBeNull();
  });

  it('tolerates a missing storage backend', () => {
    expect(() => saveDraft('x', null)).not.toThrow();
    expect(loadDraft(null)).toBeNull();
    expect(() => clearDraft(null)).not.toThrow();
  });

  it('swallows storage write failures', () => {
    const storage = makeStorage();
    storage.setItem = () => {
      throw new Error('quota exceeded');
    };
    expect(() => saveDraft('big draft', storage)).not.toThrow();
  });
});
