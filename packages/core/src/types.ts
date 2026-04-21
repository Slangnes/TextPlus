/**
 * TextPlus Core - Type Definitions
 *
 * Core interfaces and types for the TextPlus game engine.
 * Provides a strongly-typed API for game definition, state management,
 * and interaction.
 */

/**
 * Quality definition - describes a trackable attribute/stat in the game
 */
export interface QualityDefinition {
  /** Display name of the quality */
  name: string;
  /** Type of current value */
  type: 'number' | 'string' | 'boolean';
  /** Initial/default value */
  default: number | string | boolean;
  /** Minimum value (for numbers) */
  min?: number;
  /** Maximum value (for numbers) */
  max?: number;
  /** Description of this quality */
  description?: string;
  /** Tags/categories for organization */
  tags?: string[];
}

/**
 * Current state of a single quality (returned by getAllQualities)
 */
export interface QualityValue {
  /** Quality definition */
  definition: QualityDefinition;
  /** Current value */
  value: number | string | boolean;
  /** When was this quality last changed (timestamp)? */
  lastChanged?: number;
  /** How many times has this quality been changed? */
  changeCount?: number;
}

/**
 * Context passed to condition/content callbacks.
 * Allows both engine-style callbacks and quality-id indexing.
 */
export type CallbackContext = GameEngine & Record<string, QualityValue>;

/**
 * Link to another situation
 */
export interface SituationLink {
  /** Target situation ID to transition to */
  target: string;
  /** Display text for the link */
  text: string;
  /** Condition that must be true to show this link (optional) */
  condition?: (context: CallbackContext) => boolean;
  /** Called when link is clicked, before transition */
  onChoose?: (game: GameEngine) => void;
}

/**
 * Situation definition - a location/state in the game
 */
export interface SituationDefinition {
  /** Unique identifier for this situation */
  id: string;
  /** Title/heading to display when entering this situation */
  title: string;
  /** Main text content of the situation */
  content: string | ((context: CallbackContext) => string);
  /** CSS class names to apply to the root element */
  tags?: string[];
  /** Available links from this situation */
  links?: SituationLink[];
  /** Called when entering this situation */
  onEnter?: (game: GameEngine) => void;
  /** Called when leaving this situation */
  onExit?: (game: GameEngine) => void;
}

/**
 * Complete game configuration
 */
export interface GameConfig {
  /** Unique game title */
  title: string;
  /** Starting situation ID */
  initialSituation: string;
  /** All qualities that will be tracked (by quality ID) */
  qualities: Record<string, QualityDefinition>;
  /** All situations in the game */
  situations: Record<string, SituationDefinition>;
  /** Optional game metadata */
  author?: string;
  version?: string;
  description?: string;
}

/**
 * Serializable game state (for save/load)
 */
export interface GameState {
  /** Current situation ID */
  currentSituation: string;
  /** Situation state tracking */
  situations: {
    /** History of visited situations in order */
    history: string[];
    /** Set of visited situation IDs */
    visited?: string[];
  };
  /** Current quality values */
  qualities: Record<string, number | string | boolean>;
  /** Save file version for compatibility checking */
  version: number;
  /** When was this save created? */
  timestamp: number;
}

/**
 * Event fired when a quality changes
 */
export interface QualityChangeEvent {
  /** Quality ID that changed */
  qualityId: string;
  /** Old value */
  oldValue: number | string | boolean;
  /** New value */
  newValue: number | string | boolean;
  /** When did this change occur? */
  timestamp: number;
}

/**
 * Event fired when transitioning to a new situation
 */
export interface SituationChangeEvent {
  /** Previous situation ID */
  previousSituation: string;
  /** New situation ID */
  currentSituation: string;
  /** When did this occur? */
  timestamp: number;
}

/**
 * Event listener callback function
 */
export type EventListener<T> = (event: T) => void;

/**
 * Game engine interface - main entry point for game interaction
 */
export interface GameEngine {
  /** Current game configuration */
  readonly config: GameConfig;

  /** Current situation ID */
  readonly currentSituation: string;

  /** Get a quality's current value */
  getQuality(qualityId: string): number | string | boolean;

  /** Set a quality to a specific value */
  setQuality(qualityId: string, value: number | string | boolean): void;

  /** Modify a numeric quality by adding/subtracting a value */
  mutateQuality(qualityId: string, delta: number): void;

  /** Get a quality's definition */
  getQualityDefinition(qualityId: string): QualityDefinition | undefined;

  /** Get all qualities with their current values */
  getAllQualities(): Record<string, QualityValue>;

  /** Get situation history as array of IDs */
  getSituationHistory(): string[];

  /** Check if a situation has been visited */
  hasSituationBeenVisited(situationId: string): boolean;

  /** Get a situation definition */
  getSituation(situationId: string): SituationDefinition | undefined;

  /** Get the current situation definition */
  getCurrentSituation(): SituationDefinition;

  /** Get all available links from current situation */
  getAvailableLinks(): SituationLink[];

  /** Transition to a new situation */
  goToSituation(situationId: string): void;

  /** Follow a specific link */
  followLink(link: SituationLink): void;

  /** Get current game state for saving */
  getSaveState(): GameState;

  /** Load a previously saved game state */
  loadState(state: GameState): void;

  /** Reset game to initial state */
  reset(): void;

  /** Subscribe to quality change events */
  onQualityChange(listener: EventListener<QualityChangeEvent>): () => void;

  /** Subscribe to situation change events */
  onSituationChange(listener: EventListener<SituationChangeEvent>): () => void;

  /** Get readable content for the current situation (with dynamic evaluation) */
  getCurrentSituationContent(): string;

  /** Check if a condition is met (for conditional text) */
  checkCondition(condition: (game: GameEngine) => boolean): boolean;
}

/**
 * Situation renderer - renders situation content to DOM
 */
export interface SituationRenderer {
  /** Render situation to a specific DOM element */
  render(situation: SituationDefinition, engine: GameEngine, target: HTMLElement): void;

  /** Clear previously rendered content */
  clear(target: HTMLElement): void;
}

/**
 * Storage handler for save/load
 */
export interface StorageHandler {
  /** Save game state to persistent storage */
  save(name: string, state: GameState): Promise<void>;

  /** Load game state from persistent storage */
  load(name: string): Promise<GameState>;

  /** List all saved games */
  listSaves(): Promise<string[]>;

  /** Delete a saved game */
  deleteSave(name: string): Promise<void>;
}

export const SAVE_FORMAT_VERSION = 1;
