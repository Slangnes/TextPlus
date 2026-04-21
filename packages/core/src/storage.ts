/**
 * TextPlus Core - LocalStorage Save Handler
 *
 * Implements the StorageHandler interface using the browser's localStorage API.
 * Supports multiple named save slots, version validation, and corruption detection.
 */

import type { GameState, StorageHandler } from './types';
import { SAVE_FORMAT_VERSION } from './types';

// --- Constants ---------------------------------------------------------------

const KEY_PREFIX = 'textplus-save:';

// --- Helpers -----------------------------------------------------------------

function slotKey(name: string): string {
  return `${KEY_PREFIX}${name}`;
}

function assertValidState(raw: unknown, slotName: string): GameState {
  if (raw === null || typeof raw !== 'object') {
    throw new Error(`TextPlus: save "${slotName}" is corrupted (not an object)`);
  }

  const state = raw as Record<string, unknown>;

  if (typeof state['version'] !== 'number') {
    throw new Error(
      `TextPlus: save "${slotName}" is missing a version field`
    );
  }

  if (state['version'] !== SAVE_FORMAT_VERSION) {
    throw new Error(
      `TextPlus: save "${slotName}" version ${state['version']} is incompatible ` +
        `(expected ${SAVE_FORMAT_VERSION})`
    );
  }

  if (typeof state['currentSituation'] !== 'string') {
    throw new Error(
      `TextPlus: save "${slotName}" is missing currentSituation`
    );
  }

  if (typeof state['qualities'] !== 'object' || state['qualities'] === null) {
    throw new Error(`TextPlus: save "${slotName}" is missing qualities map`);
  }

  return state as unknown as GameState;
}

// --- LocalStorageHandler class -----------------------------------------------

/**
 * Saves and loads game state using `window.localStorage`.
 *
 * Each slot is stored under the key `textplus-save:<name>` as JSON.
 *
 * Throws `StorageQuotaExceededError` when the quota is full.
 */
export class LocalStorageHandler implements StorageHandler {
  private readonly storage: Storage;

  constructor(storage: Storage = localStorage) {
    this.storage = storage;
  }

  async save(name: string, state: GameState): Promise<void> {
    const key = slotKey(name);
    const json = JSON.stringify(state);

    try {
      this.storage.setItem(key, json);
    } catch (err) {
      // Rethrow quota errors with a more helpful message
      if (err instanceof DOMException && err.name === 'QuotaExceededError') {
        throw new StorageQuotaExceededError(
          `TextPlus: localStorage quota exceeded while saving "${name}"`
        );
      }
      throw err;
    }
  }

  async load(name: string): Promise<GameState> {
    const key = slotKey(name);
    const raw = this.storage.getItem(key);

    if (raw === null) {
      throw new SaveNotFoundError(`TextPlus: save "${name}" does not exist`);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`TextPlus: save "${name}" contains invalid JSON`);
    }

    return assertValidState(parsed, name);
  }

  async listSaves(): Promise<string[]> {
    const names: string[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && key.startsWith(KEY_PREFIX)) {
        names.push(key.slice(KEY_PREFIX.length));
      }
    }
    return names.sort();
  }

  async deleteSave(name: string): Promise<void> {
    this.storage.removeItem(slotKey(name));
  }
}

// --- Custom error classes ----------------------------------------------------

export class SaveNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SaveNotFoundError';
  }
}

export class StorageQuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageQuotaExceededError';
  }
}

// --- Default export ----------------------------------------------------------

/**
 * Factory that creates a LocalStorageHandler bound to the browser's
 * global localStorage.  Throws at call-time if localStorage is unavailable.
 */
export function createLocalStorageHandler(): LocalStorageHandler {
  if (typeof localStorage === 'undefined') {
    throw new Error(
      'TextPlus: localStorage is not available in this environment'
    );
  }
  return new LocalStorageHandler(localStorage);
}
