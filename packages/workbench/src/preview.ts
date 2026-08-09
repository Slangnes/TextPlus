/**
 * TextPlus Workbench - Live Preview Host
 *
 * Boots compiled GameConfigs into a playable preview using the Core engine
 * and DOM renderer. On recompile it remounts the game, carrying the player's
 * current state across when the edited story still supports it.
 */

import { createGame, DomRenderer, renderQualities, renderHud, applyHudThemes } from '@textplus/core';
import type { GameConfig, GameEngine, JournalEntry, TaskDefinition } from '@textplus/core';
import { renderGameMap } from '@textplus/map';

export interface MountOptions {
  /** Try to keep the current playthrough (situation + qualities). Default true. */
  preserveState?: boolean;
}

export interface RenderInfo {
  situationId: string;
  /** World/mode of the current situation, when the game uses worlds. */
  worldId?: string;
  /** Current turn on the game clock. */
  turn?: number;
}

export class PreviewHost {
  private readonly container: HTMLElement;
  private readonly renderer = new DomRenderer();
  private engine: GameEngine | null = null;
  private unsubscribes: Array<() => void> = [];
  private messageLog: HTMLElement | null = null;

  /** Invoked after every render with the current position (survives remounts). */
  onRender: ((info: RenderInfo) => void) | null = null;

  /** Invoked whenever the journal/tasks state should be (re)rendered. */
  onJournal: ((journal: JournalEntry[], tasks: Record<string, TaskDefinition>) => void) | null =
    null;

  private notifyJournal(): void {
    if (this.onJournal && this.engine) {
      this.onJournal(this.engine.getJournal?.() ?? [], this.engine.getTasks?.() ?? {});
    }
  }

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /** Host element for scheduled-message log entries (.tp-message). */
  attachMessageLog(element: HTMLElement): void {
    this.messageLog = element;
  }

  private appendMessage(message: string, turn: number): void {
    if (!this.messageLog) {
      return;
    }
    const entry = document.createElement('div');
    entry.className = 'tp-message';
    const turnEl = document.createElement('span');
    turnEl.className = 'tp-message__turn';
    turnEl.textContent = `turn ${turn}`;
    entry.appendChild(turnEl);
    entry.appendChild(document.createTextNode(` ${message}`));
    this.messageLog.appendChild(entry);
  }

  private clearMessages(): void {
    this.messageLog?.replaceChildren();
  }

  /** The engine backing the current preview, if a game is mounted. */
  getEngine(): GameEngine | null {
    return this.engine;
  }

  mount(config: GameConfig, options: MountOptions = {}): void {
    const preserveState = options.preserveState ?? true;
    const saved = this.engine ? this.engine.getSaveState() : null;

    this.teardown();
    if (!preserveState) {
      this.clearMessages();
    }

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
    if (engine.onWorldChange) {
      this.unsubscribes.push(engine.onWorldChange(() => this.render()));
    }
    if (engine.onMessage) {
      this.unsubscribes.push(
        engine.onMessage((event) => this.appendMessage(event.message, event.turn)),
      );
    }
    if (engine.onJournalChange) {
      this.unsubscribes.push(engine.onJournalChange(() => this.notifyJournal()));
    }
    this.render();
    this.notifyJournal();
  }

  /** Let time pass in place, then reflect the new clock in the UI. */
  wait(turns = 1): void {
    if (!this.engine?.wait) {
      return;
    }
    this.engine.wait(turns);
    this.render();
  }

  /** Restart the mounted game from its initial situation. */
  restart(): void {
    if (!this.engine) {
      return;
    }
    this.engine.reset();
    this.clearMessages();
    this.render();
    this.notifyJournal();
  }

  private render(): void {
    if (!this.engine) {
      return;
    }
    const situation = this.engine.getCurrentSituation();
    this.renderer.render(situation, this.engine, this.container);

    const qualities = this.engine.getAllQualities();
    const hud = this.engine.config.hud;
    if (hud) {
      renderHud(hud, qualities, this.container);
      if (hud.themes) {
        applyHudThemes(hud.themes, qualities, this.container);
      }
    } else if (Object.keys(qualities).length > 0) {
      renderQualities(qualities, this.container);
    }

    // Games that opt in ship a player-facing dungeon map: fog-of-war reveal
    // of visited rooms, fast-travel to places already seen.
    if (this.engine.config.map?.style === 'dungeon') {
      const host = document.createElement('div');
      host.className = 'tp-gamemap-host';
      this.container.appendChild(host);
      renderGameMap(this.engine, host);
    }

    if (this.onRender) {
      this.onRender({
        situationId: this.engine.currentSituation,
        worldId: situation.world,
        turn: this.engine.getTurn?.(),
      });
    }
  }

  private teardown(): void {
    this.unsubscribes.forEach((unsubscribe) => unsubscribe());
    this.unsubscribes = [];
    this.engine = null;
  }
}
