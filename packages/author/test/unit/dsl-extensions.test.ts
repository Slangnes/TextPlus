/**
 * Additive coverage for the Phase-A DSL extensions:
 * brace-block effects, entry effects, positions side table, compiled
 * conditions/effects on the GameConfig, and the new lint diagnostics.
 */

import { describe, it, expect } from 'vitest';
import { parseGame } from '../../src/parser';
import { compileAST } from '../../src/compiler';
import { lintAST } from '../../src/linter';
import type { QualitiesRecord } from '../../src/expression';
import { createGame } from '@textplus/core';
import type { QualityValue } from '@textplus/core';

const SOURCE = `title: Gated Cave

quality courage number = 5 min 0 max 10
quality hasKey boolean = false

:: start [start]
A Crossroads
Your courage is {courage}.

-> Enter the cave => cave ? courage >= 6
-> Steel yourself => start { courage += 2 }
-> Grab the key => cave { hasKey = true, courage += 1 }

:: cave
The Cave
{ courage -= 1 }
Dark in here.
`;

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

describe('parser extensions', () => {
  const ast = parseGame(SOURCE);

  it('captures the effects clause as a raw string', () => {
    expect(ast.situations.start.links[1].effects).toBe('courage += 2');
    expect(ast.situations.start.links[2].effects).toBe('hasKey = true, courage += 1');
    expect(ast.situations.start.links[0].effects).toBeUndefined();
  });

  it('keeps condition and effects independent on the same link', () => {
    const parsed = parseGame(`title: T

:: start [start]
S
Text.

-> Go => start ? courage >= 6 { courage -= 1 }
`);
    expect(parsed.situations.start.links[0].condition).toBe('courage >= 6');
    expect(parsed.situations.start.links[0].effects).toBe('courage -= 1');
  });

  it('collects whole-line brace blocks as entry effects, not prose', () => {
    expect(ast.situations.cave.onEnterEffects).toEqual(['courage -= 1']);
    expect(ast.situations.cave.content).toBe('Dark in here.');
    expect(ast.situations.start.onEnterEffects).toBeUndefined();
  });

  it('records line positions for qualities, situations, links, and entry effects', () => {
    expect(ast.positions?.qualities.courage).toBe(3);
    expect(ast.positions?.situations.start).toBe(6);
    expect(ast.positions?.links.start).toEqual([10, 11, 12]);
    expect(ast.positions?.entryEffects.cave).toEqual([16]);
  });
});

describe('compiler extensions', () => {
  const output = compileAST(parseGame(SOURCE), { randomSeed: 1 });
  const config = output.config!;

  it('compiles clean with no errors', () => {
    expect(output.errors).toEqual([]);
  });

  it('attaches a working condition closure (first-attempt Record shape)', () => {
    const gated = config.situations.start.links![0];
    expect(typeof gated.condition).toBe('function');
    expect(gated.condition!(qualities({ courage: 6 }) as never)).toBe(true);
    expect(gated.condition!(qualities({ courage: 5 }) as never)).toBe(false);
  });

  it('attaches onChoose effects that mutate a real engine', () => {
    const engine = createGame(config);
    config.situations.start.links![1].onChoose!(engine);
    expect(engine.getQuality('courage')).toBe(7);
    config.situations.start.links![2].onChoose!(engine);
    expect(engine.getQuality('hasKey')).toBe(true);
    expect(engine.getQuality('courage')).toBe(8);
  });

  it('attaches onEnter from entry-effect lines', () => {
    const engine = createGame(config);
    config.situations.cave.onEnter!(engine);
    expect(engine.getQuality('courage')).toBe(4);
  });

  it('compiles interpolated prose to a content function', () => {
    expect(typeof config.situations.start.content).toBe('function');
    const render = config.situations.start.content as (q: QualitiesRecord) => string;
    expect(render(qualities({ courage: 5 }))).toContain('Your courage is 5.');
  });

  it('reports invalid conditions/effects as compile errors when unlinted', () => {
    const bad = compileAST(
      parseGame(`title: T

:: start [start]
S
Text.

-> Go => start ? courage >>= 6 { courage ++ }
`),
    );
    expect(bad.config).toBeNull();
    expect(bad.errors.some((e) => e.type === 'invalid_condition')).toBe(true);
    expect(bad.errors.some((e) => e.type === 'invalid_effects')).toBe(true);
  });
});

describe('linter extensions', () => {
  it('passes the clean source with no new diagnostics', () => {
    const output = lintAST(parseGame(SOURCE));
    expect(output.diagnostics).toEqual([]);
    expect(output.isValid).toBe(true);
  });

  it('flags condition parse errors with the line number', () => {
    const output = lintAST(
      parseGame(`title: T

:: start [start]
S
Text.

-> Go => start ? courage >>= 6
`),
    );
    const diag = output.diagnostics.find((d) => d.code === 'condition-parse-error');
    expect(diag?.severity).toBe('error');
    expect(diag?.message).toMatch(/^Line 7:/);
    expect(diag?.line).toBe(7);
    expect(output.isValid).toBe(false);
  });

  it('flags effect parse errors and type mismatches', () => {
    const output = lintAST(
      parseGame(`title: T

quality hasKey boolean = false

:: start [start]
S
The hasKey text.

-> Bad => start { hasKey += 1 }
-> Worse => start { hasKey ++ }
`),
    );
    expect(output.diagnostics.some((d) => d.code === 'effect-type-mismatch' && d.severity === 'error')).toBe(true);
    expect(output.diagnostics.some((d) => d.code === 'effect-parse-error' && d.severity === 'error')).toBe(true);
  });

  it('warns on undeclared qualities in conditions and effects', () => {
    const output = lintAST(
      parseGame(`title: T

:: start [start]
S
Text.

-> Go => start ? ghost >= 1 { phantom += 1 }
`),
    );
    const codes = output.diagnostics.map((d) => d.code);
    expect(codes).toContain('unknown-quality-in-condition');
    expect(codes).toContain('unknown-quality-in-effect');
    expect(output.isValid).toBe(true);
  });

  it('parses and compiles hud declarations and theme rules', () => {
    const ast = parseGame(`title: T

quality sanity number = 100 min 0 max 100

hud sanity meter "Sanity"
hud sanity badge
theme dark when sanity < 40

:: start [start]
S
Sanity dwells here.
`);
    expect(ast.hud).toEqual([
      { qualityId: 'sanity', kind: 'meter', label: 'Sanity' },
      { qualityId: 'sanity', kind: 'badge', label: undefined },
    ]);
    expect(ast.themes).toEqual([{ theme: 'dark', when: 'sanity < 40' }]);
    expect(ast.positions?.hud).toEqual([5, 6]);
    expect(ast.positions?.themes).toEqual([7]);

    const output = compileAST(ast);
    expect(output.errors).toEqual([]);
    const hud = output.config!.hud!;
    expect(hud.entries).toHaveLength(2);
    expect(hud.themes).toHaveLength(1);
    expect(hud.themes![0].theme).toBe('dark');
    expect(hud.themes![0].when(qualities({ sanity: 30 }) as never)).toBe(true);
    expect(hud.themes![0].when(qualities({ sanity: 90 }) as never)).toBe(false);
  });

  it('omits hud from the config when no directives are present', () => {
    const output = compileAST(parseGame(SOURCE));
    expect(output.config!.hud).toBeUndefined();
  });

  it('lints hud/theme quality references and theme parse errors', () => {
    const output = lintAST(
      parseGame(`title: T

hud ghost meter
theme dark when phantom >>= 1

:: start [start]
S
Text.
`),
    );
    const codes = output.diagnostics.map((d) => d.code);
    expect(codes).toContain('unknown-quality-in-hud');
    expect(codes).toContain('condition-parse-error');
  });

  it('credits condition/effect/interpolation refs against unused-quality', () => {
    const output = lintAST(
      parseGame(`title: T

quality courage number = 5
quality hasKey boolean = false
quality mood string = 'calm'

:: start [start]
S
Mood: {mood}.

-> Go => start ? courage >= 6 { hasKey = true }
`),
    );
    expect(output.diagnostics.filter((d) => d.code === 'unused-quality')).toEqual([]);
  });
});
