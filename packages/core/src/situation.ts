/**
 * TextPlus Core - Situation System
 *
 * Manages game situations (scenes/locations) including situation lookup,
 * link resolution, and conditional text evaluation.
 */

import type { SituationDefinition, SituationLink, GameEngine, CallbackContext } from './types';

/**
 * Manages all situations in a game
 */
export class SituationSystem {
  private situations: Map<string, SituationDefinition> = new Map();

  /**
   * Initialize with situation definitions
   */
  initialize(definitions: Record<string, SituationDefinition>): void {
    this.situations.clear();
    for (const [id, def] of Object.entries(definitions)) {
      this.situations.set(id, def);
    }
  }

  /**
   * Get a situation by ID
   */
  getSituation(situationId: string): SituationDefinition | undefined {
    return this.situations.get(situationId);
  }

  /**
   * Check if a situation exists
   */
  hasSituation(situationId: string): boolean {
    return this.situations.has(situationId);
  }

  /**
   * Get all situation IDs
   */
  getAllSituationIds(): string[] {
    return Array.from(this.situations.keys());
  }

  /**
   * Validate that all referenced situations exist
   */
  validateSituationReferences(): { valid: boolean; invalidLinks: string[] } {
    const invalidLinks: string[] = [];

    for (const situation of this.situations.values()) {
      if (situation.links) {
        for (const link of situation.links) {
          if (!this.hasSituation(link.target)) {
            invalidLinks.push(`${situation.id} → ${link.target}`);
          }
        }
      }
    }

    return {
      valid: invalidLinks.length === 0,
      invalidLinks
    };
  }

  /**
   * Get available links from a situation (filtering by condition)
   */
  getAvailableLinks(situation: SituationDefinition, engine: GameEngine): SituationLink[] {
    if (!situation.links) {
      return [];
    }

    return situation.links.filter((link) => {
      // If no condition, link is always available
      if (!link.condition) {
        return true;
      }

      // Evaluate condition. Prefer quality-map callbacks (legacy tests/content),
      // then fall back to engine-style callbacks.
      const legacyQualities = engine.getAllQualities();
      try {
        return (link.condition as unknown as (qualities: typeof legacyQualities) => boolean)(legacyQualities);
      } catch {
        try {
          return link.condition(engine as unknown as CallbackContext);
        } catch (error) {
          console.error(`Error evaluating condition for link: ${link.text}`, error);
          return false;
        }
      }
    });
  }

  /**
   * Get content for a situation (evaluate if it's a function)
   */
  getContent(situation: SituationDefinition, engine?: GameEngine): string {
    if (typeof situation.content === 'string') {
      return situation.content;
    }

    // Content is a function
    if (!engine) {
      throw new Error(`Cannot evaluate dynamic content without game engine`);
    }

    const legacyQualities = engine.getAllQualities();
    try {
      return (situation.content as unknown as (qualities: typeof legacyQualities) => string)(legacyQualities);
    } catch {
      try {
        return situation.content(engine as unknown as CallbackContext);
      } catch (error) {
        console.error(`Error evaluating content for situation: ${situation.id}`, error);
        return '[Error rendering situation content]';
      }
    }
  }

  /**
   * Call situation onEnter handler if defined
   */
  callOnEnter(situation: SituationDefinition, engine: GameEngine): void {
    if (situation.onEnter) {
      try {
        situation.onEnter(engine);
      } catch (error) {
        console.error(`Error in onEnter for situation: ${situation.id}`, error);
      }
    }
  }

  /**
   * Call situation onExit handler if defined
   */
  callOnExit(situation: SituationDefinition, engine: GameEngine): void {
    if (situation.onExit) {
      try {
        situation.onExit(engine);
      } catch (error) {
        console.error(`Error in onExit for situation: ${situation.id}`, error);
      }
    }
  }

  /**
   * Get all situations
   */
  getAll(): Record<string, SituationDefinition> {
    const all: Record<string, SituationDefinition> = {};
    for (const [id, situation] of this.situations) {
      all[id] = situation;
    }
    return all;
  }

  /**
   * Count total situations
   */
  count(): number {
    return this.situations.size;
  }
}
