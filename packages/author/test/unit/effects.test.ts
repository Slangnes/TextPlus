import { describe, it, expect, vi } from 'vitest';
import { parseEffects, compileEffects, collectEffectRefs, EffectError } from '../../src/effects';
import { createGame } from '@textplus/core';
import type { GameConfig } from '@textplus/core';

function testEngine(): ReturnType<typeof createGame> {
  const config: GameConfig = {
    title: 'T',
    initialSituation: 'start',
    qualities: {
      courage: { name: 'Courage', type: 'number', default: 5, min: 0, max: 10 },
      hasKey: { name: 'Has Key', type: 'boolean', default: false },
      mood: { name: 'Mood', type: 'string', default: 'calm' },
    },
    situations: { start: { id: 'start', title: 'Start', content: 'x', links: [] } },
  };
  return createGame(config);
}

describe('parseEffects', () => {
  it('parses mutations and assignments', () => {
    expect(parseEffects('courage += 2, hasKey = true')).toEqual([
      { kind: 'mutate', qualityId: 'courage', delta: 2 },
      { kind: 'set', qualityId: 'hasKey', value: true },
    ]);
  });

  it('parses -= as a negative delta and quoted strings', () => {
    expect(parseEffects("sanity -= 10, mood = 'grim'")).toEqual([
      { kind: 'mutate', qualityId: 'sanity', delta: -10 },
      { kind: 'set', qualityId: 'mood', value: 'grim' },
    ]);
  });

  it('parses decimal and negative assignment values', () => {
    expect(parseEffects('depth = -2.5')).toEqual([{ kind: 'set', qualityId: 'depth', value: -2.5 }]);
  });

  it('rejects malformed effects', () => {
    expect(() => parseEffects('')).toThrow(EffectError);
    expect(() => parseEffects('courage ++')).toThrow(/Invalid effect/);
    expect(() => parseEffects('courage += lots')).toThrow(/Invalid effect value/);
    expect(() => parseEffects("courage += 'two'")).toThrow(/requires a number/);
    expect(() => parseEffects('mood = unquoted words')).toThrow(/Invalid effect value/);
  });
});

describe('compileEffects', () => {
  it('mutates and sets qualities on a real engine, respecting bounds', () => {
    const engine = testEngine();
    compileEffects(parseEffects('courage += 3, hasKey = true'))(engine);
    expect(engine.getQuality('courage')).toBe(8);
    expect(engine.getQuality('hasKey')).toBe(true);

    compileEffects(parseEffects('courage += 99'))(engine);
    expect(engine.getQuality('courage')).toBe(10);

    compileEffects(parseEffects('courage -= 99'))(engine);
    expect(engine.getQuality('courage')).toBe(0);
  });

  it('sets string qualities', () => {
    const engine = testEngine();
    compileEffects(parseEffects("mood = 'grim'"))(engine);
    expect(engine.getQuality('mood')).toBe('grim');
  });

  it('swallows runtime failures and applies the remaining effects', () => {
    const engine = testEngine();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // mutate on a boolean throws inside the engine; the closure must survive.
    compileEffects(parseEffects('hasKey += 1, courage += 2'))(engine);
    expect(engine.getQuality('courage')).toBe(7);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe('collectEffectRefs', () => {
  it('collects unique quality ids', () => {
    const refs = collectEffectRefs(parseEffects('courage += 1, hasKey = true, courage -= 1'));
    expect(refs.sort()).toEqual(['courage', 'hasKey']);
  });
});
