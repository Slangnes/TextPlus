/**
 * TextPlus Core - Modern Undum Runtime
 *
 * Main entry point for TextPlus Core library.
 *
 * Exports game engine, types, and utilities for creating interactive fiction games.
 */

// Export types
export type {
  GameConfig,
  GameEngine,
  GameState,
  SituationDefinition,
  SituationLink,
  QualityDefinition,
  QualityValue,
  QualityChangeEvent,
  SituationChangeEvent,
  EventListener,
  SituationRenderer,
  StorageHandler
} from './types';

// Export main engine
export { TextPlusGameEngine, createGame } from './engine';

// Export subsystems
export { Quality, QualitySystem } from './qualities';
export { SituationSystem } from './situation';

// Export DOM utilities
export {
  DomRenderer,
  domRenderer,
  renderQualities,
  applyTheme,
  getSavedTheme
} from './dom';
export type { ThemeVariables } from './dom';

// Export storage utilities
export {
  LocalStorageHandler,
  createLocalStorageHandler,
  SaveNotFoundError,
  StorageQuotaExceededError
} from './storage';

// Version info
export const VERSION = '0.0.1';
export const SAVE_VERSION = 1;
