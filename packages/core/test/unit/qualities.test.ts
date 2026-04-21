import { describe, it, expect } from 'vitest';
import { QualitySystem } from '../../src/qualities';
import type { QualityDefinition } from '../../src/types';

const definitions: Record<string, QualityDefinition> = {
  health: { name: 'Health', type: 'number', default: 50, min: 0, max: 100 },
  mood: { name: 'Mood', type: 'string', default: 'neutral' },
  seenIntro: { name: 'Seen intro', type: 'boolean', default: false }
};

describe('QualitySystem', () => {
  it('initializes and returns defaults', () => {
    const system = new QualitySystem();
    system.initialize(definitions);

    expect(system.getValue('health')).toBe(50);
    expect(system.getValue('mood')).toBe('neutral');
    expect(system.getValue('seenIntro')).toBe(false);
  });

  it('clamps numeric values to min/max', () => {
    const system = new QualitySystem();
    system.initialize(definitions);

    system.setValue('health', 999);
    expect(system.getValue('health')).toBe(100);

    system.setValue('health', -999);
    expect(system.getValue('health')).toBe(0);
  });

  it('supports string and boolean values', () => {
    const system = new QualitySystem();
    system.initialize(definitions);

    system.setValue('mood', 'happy');
    system.setValue('seenIntro', true);

    expect(system.getValue('mood')).toBe('happy');
    expect(system.getValue('seenIntro')).toBe(true);
  });

  it('mutates numeric values and clamps result', () => {
    const system = new QualitySystem();
    system.initialize(definitions);

    system.mutate('health', 10);
    expect(system.getValue('health')).toBe(60);

    system.mutate('health', -1000);
    expect(system.getValue('health')).toBe(0);
  });

  it('throws when mutating non-numeric value', () => {
    const system = new QualitySystem();
    system.initialize(definitions);

    expect(() => system.mutate('mood', 1)).toThrow('Cannot mutate non-numeric quality');
  });

  it('exports and imports state', () => {
    const system = new QualitySystem();
    system.initialize(definitions);
    system.setValue('health', 80);
    system.setValue('mood', 'grim');

    const snapshot = system.exportState();

    const second = new QualitySystem();
    second.initialize(definitions);
    second.importState(snapshot);

    expect(second.getValue('health')).toBe(80);
    expect(second.getValue('mood')).toBe('grim');
  });

  it('returns full quality view from getAll', () => {
    const system = new QualitySystem();
    system.initialize(definitions);

    const all = system.getAll();
    expect(all.health.definition.name).toBe('Health');
    expect(all.health.value).toBe(50);
    expect(all.mood.value).toBe('neutral');
  });

  it('resets qualities to defaults', () => {
    const system = new QualitySystem();
    system.initialize(definitions);
    system.setValue('health', 80);
    system.setValue('mood', 'sad');

    system.reset();

    expect(system.getValue('health')).toBe(50);
    expect(system.getValue('mood')).toBe('neutral');
  });

  it('throws for unknown quality id in set/mutate', () => {
    const system = new QualitySystem();
    system.initialize(definitions);

    expect(() => system.setValue('missing', 1)).toThrow('Quality not found: missing');
    expect(() => system.mutate('missing', 1)).toThrow('Quality not found: missing');
  });
});
