/**
 * TextPlus Core - Quality System
 *
 * Manages game qualities (stats, attributes, conditions) and their state.
 * Supports tracking, mutating, history, and bounds checking.
 */

import type { QualityDefinition, QualityValue } from './types';

/**
 * Manages a single quality and its state (supports number, string, boolean)
 */
export class Quality {
  readonly definition: QualityDefinition;
  private currentValue: number | string | boolean;
  private changeCount: number = 0;
  private lastChangedTime: number = 0;

  constructor(definition: QualityDefinition) {
    this.definition = definition;
    this.currentValue = definition.default;
  }

  /**
   * Get the current value of this quality
   */
  getValue(): number | string | boolean {
    return this.currentValue;
  }

  /**
   * Set the quality to a specific value, respecting bounds for numbers
   */
  setValue(value: number | string | boolean): { oldValue: number | string | boolean; newValue: number | string | boolean } {
    const oldValue = this.currentValue;

    // Apply bounds checking only for numbers
    let newValue = value;
    if (typeof newValue === 'number' && this.definition.type === 'number') {
      if (this.definition.min !== undefined) {
        newValue = Math.max(newValue, this.definition.min);
      }
      if (this.definition.max !== undefined) {
        newValue = Math.min(newValue, this.definition.max);
      }
    }

    if (newValue !== oldValue) {
      this.currentValue = newValue;
      this.changeCount++;
      this.lastChangedTime = Date.now();
    }

    return { oldValue, newValue };
  }

  /**
   * Mutate a numeric quality by delta
   */
  mutate(delta: number): { oldValue: number; newValue: number } {
    if (this.definition.type !== 'number') {
      throw new Error(`Cannot mutate non-numeric quality: ${this.definition.name}`);
    }

    const oldValue = this.currentValue as number;
    const result = this.setValue(oldValue + delta);
    return {
      oldValue,
      newValue: result.newValue as number
    };
  }

  /**
   * Export current state for serialization
   */
  export(): QualityValue {
    return {
      definition: this.definition,
      value: this.currentValue,
      changeCount: this.changeCount,
      lastChanged: this.lastChangedTime
    };
  }

  /**
   * Import state from serialized data
   */
  import(state: QualityValue): void {
    this.currentValue = state.value;
    this.changeCount = state.changeCount ?? 0;
    this.lastChangedTime = state.lastChanged ?? 0;
  }

  /**
   * Reset quality to its default value
   */
  reset(): void {
    this.currentValue = this.definition.default;
    this.changeCount = 0;
    this.lastChangedTime = 0;
  }
}

/**
 * Manages all qualities in the game
 */
export class QualitySystem {
  private qualities: Map<string, Quality> = new Map();

  /**
   * Initialize with quality definitions (Record of id -> definition)
   */
  initialize(definitions: Record<string, QualityDefinition>): void {
    this.qualities.clear();
    for (const [id, def] of Object.entries(definitions)) {
      this.qualities.set(id, new Quality(def));
    }
  }

  /**
   * Get a quality by ID
   */
  getQuality(qualityId: string): Quality | undefined {
    return this.qualities.get(qualityId);
  }

  /**
   * Get a quality's current value
   */
  getValue(qualityId: string): number | string | boolean | undefined {
    const quality = this.qualities.get(qualityId);
    return quality?.getValue();
  }

  /**
   * Set a quality to a specific value
   */
  setValue(qualityId: string, value: number | string | boolean): { oldValue: number | string | boolean; newValue: number | string | boolean } {
    const quality = this.qualities.get(qualityId);
    if (!quality) {
      throw new Error(`Quality not found: ${qualityId}`);
    }
    return quality.setValue(value);
  }

  /**
   * Mutate a numeric quality by delta
   */
  mutate(qualityId: string, delta: number): { oldValue: number; newValue: number } {
    const quality = this.qualities.get(qualityId);
    if (!quality) {
      throw new Error(`Quality not found: ${qualityId}`);
    }
    return quality.mutate(delta);
  }

  /**
   * Get all qualities with their values
   */
  getAll(): Record<string, QualityValue> {
    const result: Record<string, QualityValue> = {};
    for (const [id, quality] of this.qualities) {
      result[id] = quality.export();
    }
    return result;
  }

  /**
   * Get a quality's definition
   */
  getDefinition(qualityId: string): QualityDefinition | undefined {
    const quality = this.qualities.get(qualityId);
    return quality?.definition;
  }

  /**
   * Export all quality values for save/load
   */
  exportState(): Record<string, number | string | boolean> {
    const result: Record<string, number | string | boolean> = {};
    for (const [id, quality] of this.qualities) {
      result[id] = quality.getValue();
    }
    return result;
  }

  /**
   * Import quality values from saved state
   */
  importState(state: Record<string, number | string | boolean>): void {
    for (const [id, value] of Object.entries(state)) {
      const quality = this.qualities.get(id);
      if (quality) {
        quality.setValue(value);
      }
    }
  }

  /**
   * Reset all qualities to their defaults
   */
  reset(): void {
    for (const quality of this.qualities.values()) {
      quality.reset();
    }
  }
}

