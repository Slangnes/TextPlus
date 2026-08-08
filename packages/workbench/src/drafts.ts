/**
 * TextPlus Workbench - Draft Persistence
 *
 * Autosaves the in-progress DSL source to localStorage so a reload
 * never loses work. Storage is injectable for tests and non-browser use.
 */

const DRAFT_KEY = 'textplus-workbench-draft';

function defaultStorage(): Storage | null {
  return typeof localStorage !== 'undefined' ? localStorage : null;
}

export function loadDraft(storage: Storage | null = defaultStorage()): string | null {
  if (!storage) {
    return null;
  }
  try {
    return storage.getItem(DRAFT_KEY);
  } catch {
    return null;
  }
}

export function saveDraft(source: string, storage: Storage | null = defaultStorage()): void {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(DRAFT_KEY, source);
  } catch {
    // Quota exceeded or storage unavailable — the draft just isn't persisted.
  }
}

export function clearDraft(storage: Storage | null = defaultStorage()): void {
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(DRAFT_KEY);
  } catch {
    // Ignore storage failures on clear.
  }
}
