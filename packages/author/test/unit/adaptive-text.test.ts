/**
 * TextPlus Author - Adaptive Text Tests
 *
 * Real coverage for the [oneOf | randomly | frequently | rarely] spans and
 * {quality} interpolation (replacing the former placeholder suite):
 * - [x] oneOf cycles deterministically and wraps
 * - [x] randomly is uniform under a seeded RNG and reproducible
 * - [x] frequently/rarely approximate their 70%/20% rates
 * - [x] interpolation reads current quality values, missing ids left intact
 */

import { describe, it, expect } from 'vitest';
import { compileContent, createRng } from '../../src/content';
import type { QualitiesRecord } from '../../src/expression';
import type { QualityValue } from '@textplus/core';

function qualities(values: Record<string, number | boolean | string>): QualitiesRecord {
  const record: QualitiesRecord = {};
  Object.entries(values).forEach(([id, value]) => {
    record[id] = {
      definition: { name: id, type: typeof value as 'number' | 'boolean' | 'string', default: value },
      value,
    } as QualityValue;
  });
  return record;
}

function renderer(raw: string, seed = 42): (values?: Record<string, number | boolean | string>) => string {
  const compiled = compileContent(raw, createRng(seed));
  if (typeof compiled === 'string') {
    return () => compiled;
  }
  return (values = {}) => compiled(qualities(values));
}

describe('oneOf', () => {
  it('cycles through options in order and wraps around', () => {
    const render = renderer('[oneOf: first | second | third]');
    expect(render()).toBe('<p>first</p>');
    expect(render()).toBe('<p>second</p>');
    expect(render()).toBe('<p>third</p>');
    expect(render()).toBe('<p>first</p>');
  });

  it('handles a single option', () => {
    const render = renderer('[oneOf: only]');
    expect(render()).toBe('<p>only</p>');
    expect(render()).toBe('<p>only</p>');
  });

  it('tracks multiple spans independently', () => {
    const render = renderer('[oneOf: a | b] [oneOf: x | y]');
    expect(render()).toBe('<p>a x</p>');
    expect(render()).toBe('<p>b y</p>');
  });
});

describe('randomly', () => {
  it('is reproducible for the same seed', () => {
    const a = renderer('[randomly: rain | wind | hail]', 7);
    const b = renderer('[randomly: rain | wind | hail]', 7);
    const sequenceA = [a(), a(), a(), a()];
    const sequenceB = [b(), b(), b(), b()];
    expect(sequenceA).toEqual(sequenceB);
  });

  it('only ever produces declared options, roughly uniformly', () => {
    const render = renderer('[randomly: rain | wind]', 11);
    const counts: Record<string, number> = { rain: 0, wind: 0 };
    for (let i = 0; i < 200; i += 1) {
      const output = render().replace(/<\/?p>/g, '');
      expect(['rain', 'wind']).toContain(output);
      counts[output] += 1;
    }
    expect(counts.rain).toBeGreaterThan(50);
    expect(counts.wind).toBeGreaterThan(50);
  });
});

describe('frequently / rarely', () => {
  it('frequently shows its text most of the time', () => {
    const render = renderer('[frequently: dust hangs in the light]', 3);
    let shown = 0;
    for (let i = 0; i < 200; i += 1) {
      if (render().includes('dust')) {
        shown += 1;
      }
    }
    expect(shown / 200).toBeGreaterThan(0.55);
    expect(shown / 200).toBeLessThan(0.85);
  });

  it('rarely shows its text a minority of the time', () => {
    const render = renderer('[rarely: something shifts]', 5);
    let shown = 0;
    for (let i = 0; i < 200; i += 1) {
      if (render().includes('shifts')) {
        shown += 1;
      }
    }
    expect(shown / 200).toBeGreaterThan(0.05);
    expect(shown / 200).toBeLessThan(0.4);
  });

  it('renders cleanly when the span is omitted (empty replacement)', () => {
    const render = renderer('Before. [rarely: ghost] After.', 1);
    const output = render();
    expect(output).toContain('Before.');
    expect(output).toContain('After.');
  });
});

describe('interpolation', () => {
  it('substitutes current quality values', () => {
    const render = renderer('Courage stands at {courage}.');
    expect(render({ courage: 7 })).toBe('<p>Courage stands at 7.</p>');
    expect(render({ courage: 8 })).toBe('<p>Courage stands at 8.</p>');
  });

  it('renders booleans and strings', () => {
    const render = renderer('Key: {hasKey}. Mood: {mood}.');
    expect(render({ hasKey: true, mood: 'grim' })).toBe('<p>Key: true. Mood: grim.</p>');
  });

  it('leaves unknown quality placeholders intact', () => {
    const render = renderer('A {mystery} remains.');
    expect(render()).toBe('<p>A {mystery} remains.</p>');
  });

  it('composes with adaptive spans and markdown', () => {
    const render = renderer('**{courage}** [oneOf: rises | falls]');
    expect(render({ courage: 5 })).toBe('<p><strong>5</strong> rises</p>');
    expect(render({ courage: 5 })).toBe('<p><strong>5</strong> falls</p>');
  });
});
