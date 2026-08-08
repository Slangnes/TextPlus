/**
 * TextPlus Workbench - Live Preview Host
 *
 * Boots compiled GameConfigs into a playable preview using the Core engine
 * and DOM renderer. On recompile it remounts the game, carrying the player's
 * current state across when the edited story still supports it.
 */

import { createGame, DomRenderer, renderQualities } from '@textplus/core';
import type { GameConfig, GameEngine } from '@textplus/core';

export interface MountOptions {
  /** Try to keep the current playthrough (situation + qualities). Default true. */
  preserveState?: boolean;
}

export class PreviewHost {
  private readonly container: HTMLElement;
  private readonly renderer = new DomRenderer();
  private engine: GameEngine | null = null;
  private unsubscribes: Array<() => void> = [];

  /** Invoked after every render with the current situation id (survives remounts). */
  onRender: ((situationId: string) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /** The engine backing the current preview, if a game is mounted. */
  getEngine(): GameEngine | null {
    return this.engine;
  }

  mount(config: GameConfig, options: MountOptions = {}): void {
    const preserveState = options.preserveState ?? true;
    const saved = this.engine ? this.engine.getSaveState() : null;

    this.teardown();

    let engine = createGame(config);
    if (preserveState && saved && config.situations[saved.currentSituation]) {
      try {
        engine.loadState(saved);
      } catch {
        // Story changed shape (e.g. qualities removed) — start fresh instead.
        engine = createGame(config);
      }
    }

    this.engine = engine;
    this.unsubscribes.push(engine.onSituationChange(() => this.render()));
    this.unsubscribes.push(engine.onQualityChange(() => this.render()));
    this.render();
  }

  /** Restart the mounted game from its initial situation. */
  restart(): void {
    if (!this.engine) {
      return;
    }
    this.engine.reset();
    this.render();
  }

  private render(): void {
    if (!this.engine) {
      return;
    }
    const situation = this.engine.getCurrentSituation();
    this.renderer.render(situation, this.engine, this.container);

    const qualities = this.engine.getAllQualities();
    if (Object.keys(qualities).length > 0) {
      renderQualities(qualities, this.container);
    }

    if (this.onRender) {
      this.onRender(this.engine.currentSituation);
    }
  }

  private teardown(): void {
    this.unsubscribes.forEach((unsubscribe) => unsubscribe());
    this.unsubscribes = [];
    this.engine = null;
  }
}
