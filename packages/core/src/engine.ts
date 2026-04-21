/**
 * TextPlus Core - Game Engine
 */

import type {
  EventListener,
  GameConfig,
  GameEngine,
  GameState,
  QualityChangeEvent,
  SituationChangeEvent,
  SituationLink
} from './types';
import { QualitySystem } from './qualities';
import { SituationSystem } from './situation';

export class TextPlusGameEngine implements GameEngine {
  readonly config: GameConfig;

  private readonly qualitySystem: QualitySystem;
  private readonly situationSystem: SituationSystem;
  private currentSituationId: string;
  private history: string[] = [];

  private situationChangeListeners: EventListener<SituationChangeEvent>[] = [];
  private qualityChangeListeners: EventListener<QualityChangeEvent>[] = [];

  constructor(config: GameConfig) {
    if (!config.initialSituation) {
      throw new Error('GameConfig must specify initialSituation');
    }

    this.config = config;

    this.qualitySystem = new QualitySystem();
    this.qualitySystem.initialize(config.qualities);

    this.situationSystem = new SituationSystem();
    this.situationSystem.initialize(config.situations);

    if (!this.situationSystem.hasSituation(config.initialSituation)) {
      throw new Error(`Initial situation not found: ${config.initialSituation}`);
    }

    this.currentSituationId = config.initialSituation;
    this.history = [this.currentSituationId];

    const initialSituation = this.situationSystem.getSituation(this.currentSituationId);
    if (initialSituation) {
      this.situationSystem.callOnEnter(initialSituation, this);
    }
  }

  get currentSituation(): string {
    return this.currentSituationId;
  }

  getQuality(qualityId: string): number | string | boolean {
    const value = this.qualitySystem.getValue(qualityId);
    if (value === undefined) {
      throw new Error(`Quality not found: ${qualityId}`);
    }
    return value;
  }

  setQuality(qualityId: string, value: number | string | boolean): void {
    const oldValue = this.getQuality(qualityId);
    const { newValue } = this.qualitySystem.setValue(qualityId, value);

    if (newValue !== oldValue) {
      this.emitQualityChange({
        qualityId,
        oldValue,
        newValue,
        timestamp: Date.now()
      });
    }
  }

  mutateQuality(qualityId: string, delta: number): void {
    const { oldValue, newValue } = this.qualitySystem.mutate(qualityId, delta);
    if (newValue !== oldValue) {
      this.emitQualityChange({
        qualityId,
        oldValue,
        newValue,
        timestamp: Date.now()
      });
    }
  }

  getQualityDefinition(qualityId: string) {
    return this.qualitySystem.getDefinition(qualityId);
  }

  getAllQualities() {
    return this.qualitySystem.getAll();
  }

  getSituation(situationId: string) {
    return this.situationSystem.getSituation(situationId);
  }

  getCurrentSituation() {
    const situation = this.situationSystem.getSituation(this.currentSituationId);
    if (!situation) {
      throw new Error(`Current situation not found: ${this.currentSituationId}`);
    }
    return situation;
  }

  getSituationHistory(): string[] {
    return [...this.history];
  }

  hasSituationBeenVisited(situationId: string): boolean {
    return this.history.includes(situationId);
  }

  getAvailableLinks(): SituationLink[] {
    const situation = this.getCurrentSituation();
    return this.situationSystem.getAvailableLinks(situation, this);
  }

  goToSituation(situationId: string): void {
    if (!this.situationSystem.hasSituation(situationId)) {
      throw new Error(`Situation not found: ${situationId}`);
    }

    const previousSituation = this.currentSituationId;
    const previousDefinition = this.situationSystem.getSituation(previousSituation);
    if (previousDefinition) {
      this.situationSystem.callOnExit(previousDefinition, this);
    }

    this.currentSituationId = situationId;
    this.history.push(situationId);

    const newDefinition = this.situationSystem.getSituation(situationId);
    if (newDefinition) {
      this.situationSystem.callOnEnter(newDefinition, this);
    }

    this.emitSituationChange({
      previousSituation,
      currentSituation: situationId,
      timestamp: Date.now()
    });
  }

  followLink(link: SituationLink): void {
    if (link.onChoose) {
      try {
        link.onChoose(this);
      } catch (error) {
        console.error('Error in link.onChoose handler:', error);
      }
    }
    this.goToSituation(link.target);
  }

  getSaveState(): GameState {
    return {
      currentSituation: this.currentSituationId,
      situations: {
        history: [...this.history]
      },
      qualities: this.qualitySystem.exportState(),
      version: 1,
      timestamp: Date.now()
    };
  }

  loadState(state: GameState): void {
    if (state.version !== 1) {
      throw new Error(`Incompatible save format version: ${state.version}`);
    }
    if (!this.situationSystem.hasSituation(state.currentSituation)) {
      throw new Error(`Situation not found in loaded state: ${state.currentSituation}`);
    }

    this.qualitySystem.importState(state.qualities);
    this.currentSituationId = state.currentSituation;
    this.history = [...state.situations.history];
  }

  reset(): void {
    this.qualitySystem.reset();
    this.currentSituationId = this.config.initialSituation;
    this.history = [this.currentSituationId];

    const situation = this.situationSystem.getSituation(this.currentSituationId);
    if (situation) {
      this.situationSystem.callOnEnter(situation, this);
    }
  }

  onQualityChange(listener: EventListener<QualityChangeEvent>): () => void {
    this.qualityChangeListeners.push(listener);
    return () => {
      const index = this.qualityChangeListeners.indexOf(listener);
      if (index >= 0) {
        this.qualityChangeListeners.splice(index, 1);
      }
    };
  }

  onSituationChange(listener: EventListener<SituationChangeEvent>): () => void {
    this.situationChangeListeners.push(listener);
    return () => {
      const index = this.situationChangeListeners.indexOf(listener);
      if (index >= 0) {
        this.situationChangeListeners.splice(index, 1);
      }
    };
  }

  // Backward-compatible aliases used by current tests.
  onQualityChanged(callback: (name: string, oldValue: number | string | boolean, newValue: number | string | boolean) => void): void {
    this.onQualityChange((event) => {
      callback(event.qualityId, event.oldValue, event.newValue);
    });
  }

  onSituationChanged(callback: (previousSituation: string, newSituation: string) => void): void {
    this.onSituationChange((event) => {
      callback(event.previousSituation, event.currentSituation);
    });
  }

  getCurrentSituationContent(): string {
    return this.situationSystem.getContent(this.getCurrentSituation(), this);
  }

  checkCondition(condition: (game: GameEngine) => boolean): boolean {
    try {
      return condition(this);
    } catch (error) {
      console.error('Error evaluating condition:', error);
      return false;
    }
  }

  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [situationId, situation] of Object.entries(this.config.situations)) {
      for (const link of situation.links ?? []) {
        if (!this.situationSystem.hasSituation(link.target)) {
          errors.push(
            `Invalid link in ${situationId}: target situation \"${link.target}\" does not exist`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private emitQualityChange(event: QualityChangeEvent): void {
    for (const listener of this.qualityChangeListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in quality change listener:', error);
      }
    }
  }

  private emitSituationChange(event: SituationChangeEvent): void {
    for (const listener of this.situationChangeListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in situation change listener:', error);
      }
    }
  }
}

export function createGame(config: GameConfig): TextPlusGameEngine {
  return new TextPlusGameEngine(config);
}
