/**
 * TextPlus Core - Game Engine
 */

import type {
  EventListener,
  GameConfig,
  GameEngine,
  GameMessageEvent,
  GameState,
  JournalChangeEvent,
  JournalEntry,
  QualityChangeEvent,
  SituationChangeEvent,
  SituationLink,
  TaskDefinition,
  WorldChangeEvent
} from './types';
import { SAVE_FORMAT_VERSION } from './types';
import { QualitySystem } from './qualities';
import { SituationSystem } from './situation';

export class TextPlusGameEngine implements GameEngine {
  readonly config: GameConfig;

  private readonly qualitySystem: QualitySystem;
  private readonly situationSystem: SituationSystem;
  private currentSituationId: string;
  private history: string[] = [];
  /** Last-visited situation per world, for world-switch resume. */
  private perWorldPositions: Record<string, string> = {};
  /** Turn clock: 0 at start; every transition (and wait tick) advances it. */
  private turnCount = 0;
  /** Recorded journal entries, in capture order. */
  private journal: JournalEntry[] = [];

  private situationChangeListeners: EventListener<SituationChangeEvent>[] = [];
  private qualityChangeListeners: EventListener<QualityChangeEvent>[] = [];
  private worldChangeListeners: EventListener<WorldChangeEvent>[] = [];
  private messageListeners: EventListener<GameMessageEvent>[] = [];
  private journalChangeListeners: EventListener<JournalChangeEvent>[] = [];

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
    this.trackWorldPosition(this.currentSituationId);

    const initialSituation = this.situationSystem.getSituation(this.currentSituationId);
    if (initialSituation) {
      this.situationSystem.callOnEnter(initialSituation, this);
    }
    this.mirrorWorldQuality();
    this.mirrorTurnQuality();
  }

  /**
   * Like the `world` quality: declaring a number quality named `turn` opts in
   * to the engine maintaining it, so the clock is visible to conditions,
   * interpolation, HUD readouts, and theme rules with no extra plumbing.
   */
  private mirrorTurnQuality(): void {
    if (this.qualitySystem.getDefinition('turn')?.type !== 'number') {
      return;
    }
    if (this.qualitySystem.getValue('turn') !== this.turnCount) {
      this.setQuality('turn', this.turnCount);
    }
  }

  /** Advance the clock one tick and fire any due scheduled entries. */
  private tickSchedule(): void {
    this.turnCount += 1;
    this.mirrorTurnQuality();
    for (const entry of this.config.schedule ?? []) {
      if (entry.world && entry.world !== this.getCurrentWorld()) {
        continue;
      }
      const due =
        entry.at !== undefined
          ? entry.at === this.turnCount
          : entry.every !== undefined
            ? entry.every > 0 && this.turnCount % entry.every === 0
            : false;
      if (!due) {
        continue;
      }
      if (entry.effects) {
        try {
          entry.effects(this);
        } catch (error) {
          console.error('Error in scheduled effects:', error);
        }
      }
      if (entry.message) {
        this.emitMessage({
          message: entry.message,
          turn: this.turnCount,
          timestamp: Date.now()
        });
      }
    }
  }

  /** Remember the situation as the world's resume point, when it has one. */
  private trackWorldPosition(situationId: string): void {
    const world = this.situationSystem.getSituation(situationId)?.world;
    if (world) {
      this.perWorldPositions[world] = situationId;
    }
  }

  /**
   * Games that declare a string quality named `world` get it maintained by
   * the engine, making the current world visible to conditions, adaptive
   * text, HUD readouts, and theme rules with no extra plumbing. Opt-in by
   * declaration — nothing is injected into games that don't ask.
   */
  private mirrorWorldQuality(): void {
    if (this.qualitySystem.getDefinition('world')?.type !== 'string') {
      return;
    }
    const world = this.situationSystem.getSituation(this.currentSituationId)?.world ?? '';
    if (this.qualitySystem.getValue('world') !== world) {
      this.setQuality('world', world);
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
    this.transition(situationId);
  }

  /**
   * The single transition path — both public entry points and world switches
   * come through here, so lifecycle hooks, history, world bookkeeping, and
   * events can never diverge. (The DOM renderer calls goToSituation directly,
   * bypassing followLink — anything per-move must live here.)
   */
  private transition(situationId: string): void {
    if (!this.situationSystem.hasSituation(situationId)) {
      throw new Error(`Situation not found: ${situationId}`);
    }

    const previousSituation = this.currentSituationId;
    const previousWorld = this.situationSystem.getSituation(previousSituation)?.world;
    const previousDefinition = this.situationSystem.getSituation(previousSituation);
    if (previousDefinition) {
      this.situationSystem.callOnExit(previousDefinition, this);
    }

    this.currentSituationId = situationId;
    this.history.push(situationId);
    this.trackWorldPosition(situationId);

    const newDefinition = this.situationSystem.getSituation(situationId);
    if (newDefinition) {
      this.situationSystem.callOnEnter(newDefinition, this);
    }
    this.mirrorWorldQuality();
    // The clock ticks after arrival (schedule sees the post-move world) and
    // before the situation-change emit, so one render shows post-event state.
    this.tickSchedule();

    this.emitSituationChange({
      previousSituation,
      currentSituation: situationId,
      timestamp: Date.now()
    });

    const currentWorld = newDefinition?.world;
    if (currentWorld !== previousWorld) {
      this.emitWorldChange({
        previousWorld,
        currentWorld,
        currentSituation: situationId,
        timestamp: Date.now()
      });
    }
  }

  getCurrentWorld(): string | undefined {
    return this.situationSystem.getSituation(this.currentSituationId)?.world;
  }

  goToWorld(worldId: string): void {
    const worldDef = this.config.worlds?.[worldId];
    if (!worldDef) {
      throw new Error(`World not found: ${worldId}`);
    }
    const target = this.perWorldPositions[worldId] ?? worldDef.initialSituation;
    this.transition(target);
  }

  getTurn(): number {
    return this.turnCount;
  }

  /**
   * Record the current situation into the journal — content is snapshotted
   * exactly as it reads now, because dynamic text may depend on state that
   * later changes. Optionally completes a declared task.
   */
  capture(taskId?: string): void {
    if (taskId !== undefined && !this.config.tasks?.[taskId]) {
      throw new Error(`Task not found: ${taskId}`);
    }
    const entry: JournalEntry = {
      turn: this.turnCount,
      world: this.getCurrentWorld(),
      situationId: this.currentSituationId,
      taskId,
      content: this.situationSystem.getContent(this.getCurrentSituation(), this)
    };
    this.journal.push(entry);
    this.emitJournalChange({ entry, timestamp: Date.now() });
  }

  getJournal(): JournalEntry[] {
    return [...this.journal];
  }

  getTasks(): Record<string, TaskDefinition> {
    return this.config.tasks ?? {};
  }

  /** Let time pass in place: N clock ticks with no movement or lifecycle. */
  wait(turns = 1): void {
    for (let i = 0; i < turns; i += 1) {
      this.tickSchedule();
    }
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
      perWorldPositions: { ...this.perWorldPositions },
      turnCount: this.turnCount,
      journal: this.journal.map((entry) => ({ ...entry })),
      version: SAVE_FORMAT_VERSION,
      timestamp: Date.now()
    };
  }

  loadState(state: GameState): void {
    if (state.version !== SAVE_FORMAT_VERSION) {
      throw new Error(`Incompatible save format version: ${state.version}`);
    }
    if (!this.situationSystem.hasSituation(state.currentSituation)) {
      throw new Error(`Situation not found in loaded state: ${state.currentSituation}`);
    }

    this.qualitySystem.importState(state.qualities);
    this.currentSituationId = state.currentSituation;
    this.history = [...state.situations.history];

    // Restore world resume points, dropping any that reference situations
    // no longer present (a live edit may have removed them).
    this.perWorldPositions = {};
    Object.entries(state.perWorldPositions ?? {}).forEach(([world, situationId]) => {
      if (this.situationSystem.hasSituation(situationId)) {
        this.perWorldPositions[world] = situationId;
      }
    });
    this.trackWorldPosition(this.currentSituationId);
    // Pre-scheduler saves lack turnCount. Under this engine's own semantics
    // every transition was exactly one turn (wait() didn't exist), so
    // history.length - 1 IS the true turn count for them — derived, not guessed.
    this.turnCount = state.turnCount ?? Math.max(0, state.situations.history.length - 1);
    this.mirrorTurnQuality();
    this.journal = (state.journal ?? []).map((entry) => ({ ...entry }));
  }

  reset(): void {
    this.qualitySystem.reset();
    this.currentSituationId = this.config.initialSituation;
    this.history = [this.currentSituationId];
    this.perWorldPositions = {};
    this.trackWorldPosition(this.currentSituationId);
    this.turnCount = 0;
    this.journal = [];

    const situation = this.situationSystem.getSituation(this.currentSituationId);
    if (situation) {
      this.situationSystem.callOnEnter(situation, this);
    }
    this.mirrorWorldQuality();
    this.mirrorTurnQuality();
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

  onWorldChange(listener: EventListener<WorldChangeEvent>): () => void {
    this.worldChangeListeners.push(listener);
    return () => {
      const index = this.worldChangeListeners.indexOf(listener);
      if (index >= 0) {
        this.worldChangeListeners.splice(index, 1);
      }
    };
  }

  onMessage(listener: EventListener<GameMessageEvent>): () => void {
    this.messageListeners.push(listener);
    return () => {
      const index = this.messageListeners.indexOf(listener);
      if (index >= 0) {
        this.messageListeners.splice(index, 1);
      }
    };
  }

  onJournalChange(listener: EventListener<JournalChangeEvent>): () => void {
    this.journalChangeListeners.push(listener);
    return () => {
      const index = this.journalChangeListeners.indexOf(listener);
      if (index >= 0) {
        this.journalChangeListeners.splice(index, 1);
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
      if (situation.world && this.config.worlds && !this.config.worlds[situation.world]) {
        errors.push(
          `Situation ${situationId} belongs to undeclared world \"${situation.world}\"`
        );
      }
    }

    for (const [worldId, world] of Object.entries(this.config.worlds ?? {})) {
      if (!this.situationSystem.hasSituation(world.initialSituation)) {
        errors.push(
          `World ${worldId}: initial situation \"${world.initialSituation}\" does not exist`
        );
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

  private emitWorldChange(event: WorldChangeEvent): void {
    for (const listener of this.worldChangeListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in world change listener:', error);
      }
    }
  }

  private emitMessage(event: GameMessageEvent): void {
    for (const listener of this.messageListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in message listener:', error);
      }
    }
  }

  private emitJournalChange(event: JournalChangeEvent): void {
    for (const listener of this.journalChangeListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in journal change listener:', error);
      }
    }
  }
}

export function createGame(config: GameConfig): TextPlusGameEngine {
  return new TextPlusGameEngine(config);
}
