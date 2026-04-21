import { describe, it, expect, beforeEach } from 'vitest';
import {
  LocalStorageHandler,
  SaveNotFoundError,
  StorageQuotaExceededError
} from '@textplus/core';
import type { GameState } from '@textplus/core';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    currentSituation: 'start',
    situations: { history: ['start'] },
    qualities: { health: 100 },
    version: 1,
    timestamp: Date.now(),
    ...overrides
  };
}

/** Minimal in-memory Storage implementation for tests */
function makeMemoryStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    get length() { return Object.keys(store).length; },
    key(index: number) { return Object.keys(store)[index] ?? null; },
    getItem(k: string) { return store[k] ?? null; },
    setItem(k: string, v: string) { store[k] = v; },
    removeItem(k: string) { delete store[k]; },
    clear() { store = {}; }
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TextPlus Core - Storage Integration', () => {
  let storage: Storage;
  let handler: LocalStorageHandler;

  beforeEach(() => {
    storage = makeMemoryStorage();
    handler = new LocalStorageHandler(storage);
  });

  // -------------------------------------------------------------------------
  describe('Saving', () => {
    it('should persist a save under the expected key', async () => {
      await handler.save('slot1', makeState());
      expect(storage.getItem('textplus-save:slot1')).not.toBeNull();
    });

    it('should serialize qualities and situation history', async () => {
      const state = makeState({ qualities: { health: 42, name: 'Arthur' } });
      await handler.save('slot1', state);
      const raw = JSON.parse(storage.getItem('textplus-save:slot1')!);
      expect(raw.qualities.health).toBe(42);
      expect(raw.qualities.name).toBe('Arthur');
      expect(raw.situations.history).toEqual(['start']);
    });

    it('should include timestamp in saved data', async () => {
      const before = Date.now();
      await handler.save('slot1', makeState({ timestamp: Date.now() }));
      const raw = JSON.parse(storage.getItem('textplus-save:slot1')!);
      expect(raw.timestamp).toBeGreaterThanOrEqual(before - 10);
    });

    it('should support multiple independent save slots', async () => {
      await handler.save('slot1', makeState({ currentSituation: 'cave' }));
      await handler.save('slot2', makeState({ currentSituation: 'forest' }));

      const s1 = await handler.load('slot1');
      const s2 = await handler.load('slot2');
      expect(s1.currentSituation).toBe('cave');
      expect(s2.currentSituation).toBe('forest');
    });

    it('should throw StorageQuotaExceededError when quota is exceeded', async () => {
      const quotaStorage = makeMemoryStorage();
      const original = quotaStorage.setItem.bind(quotaStorage);
      quotaStorage.setItem = (_k: string, _v: string) => {
        const err = new DOMException('QuotaExceededError');
        Object.defineProperty(err, 'name', { value: 'QuotaExceededError' });
        throw err;
      };
      void original; // prevent lint warning

      const h = new LocalStorageHandler(quotaStorage);
      await expect(h.save('x', makeState())).rejects.toThrow(StorageQuotaExceededError);
    });
  });

  // -------------------------------------------------------------------------
  describe('Loading', () => {
    it('should restore game state from storage', async () => {
      const state = makeState({ currentSituation: 'forest', qualities: { luck: 5 } });
      await handler.save('slot1', state);
      const loaded = await handler.load('slot1');

      expect(loaded.currentSituation).toBe('forest');
      expect(loaded.qualities.luck).toBe(5);
    });

    it('should maintain situation history after load', async () => {
      const state = makeState({ situations: { history: ['start', 'cave', 'forest'] } });
      await handler.save('game', state);
      const loaded = await handler.load('game');
      expect(loaded.situations.history).toEqual(['start', 'cave', 'forest']);
    });

    it('should throw SaveNotFoundError for unknown slot', async () => {
      await expect(handler.load('nonexistent')).rejects.toThrow(SaveNotFoundError);
    });
  });

  // -------------------------------------------------------------------------
  describe('Listing & Deleting', () => {
    it('should list saved slot names', async () => {
      await handler.save('alpha', makeState());
      await handler.save('beta', makeState());
      const names = await handler.listSaves();
      expect(names.sort()).toEqual(['alpha', 'beta']);
    });

    it('should delete a save slot', async () => {
      await handler.save('slot1', makeState());
      await handler.deleteSave('slot1');
      const names = await handler.listSaves();
      expect(names).not.toContain('slot1');
    });

    it('should return empty list when no saves exist', async () => {
      expect(await handler.listSaves()).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  describe('Data Integrity', () => {
    it('should throw on corrupted JSON in storage', async () => {
      storage.setItem('textplus-save:broken', '{invalid json}');
      await expect(handler.load('broken')).rejects.toThrow(/invalid JSON/i);
    });

    it('should throw on save with wrong version', async () => {
      const badState = makeState({ version: 999 });
      await handler.save('slot1', badState);
      await expect(handler.load('slot1')).rejects.toThrow(/incompatible/i);
    });

    it('should throw when currentSituation is missing', async () => {
      const partial = { version: 1, qualities: {}, situations: { history: [] }, timestamp: 0 };
      storage.setItem('textplus-save:bad', JSON.stringify(partial));
      await expect(handler.load('bad')).rejects.toThrow(/currentSituation/i);
    });

    it('should throw when qualities map is missing', async () => {
      const partial = { version: 1, currentSituation: 'start', situations: { history: [] }, timestamp: 0 };
      storage.setItem('textplus-save:bad2', JSON.stringify(partial));
      await expect(handler.load('bad2')).rejects.toThrow(/qualities/i);
    });
  });
});
