/**
 * Grammar-as-data tests for the TextPlus Monarch language definition.
 *
 * Monarch's group-rule contract: each capture group maps to one token, and
 * the concatenation of all groups must reproduce the entire matched line.
 * These tests enforce that contract for every construct so the grammar can't
 * silently regress to whole-line coloring or broken group splits.
 */

import { describe, it, expect } from 'vitest';
import { LINE_RULES, PROSE_RULES, dslMonarchLanguage, dslThemes } from '../../src/dsl-language';

interface MatchResult {
  tokens: string[];
  groups: string[];
}

function matchLine(line: string): MatchResult | null {
  for (const [regex, tokens] of LINE_RULES) {
    const match = regex.exec(line);
    if (match) {
      return { tokens, groups: match.slice(1).map((g) => g ?? '') };
    }
  }
  return null;
}

function tokensFor(line: string): Map<string, string> {
  const result = matchLine(line);
  if (!result) {
    throw new Error(`No line rule matched: ${line}`);
  }
  const map = new Map<string, string>();
  result.tokens.forEach((token, i) => {
    if (result.groups[i]) {
      map.set(token, (map.get(token) ?? '') + result.groups[i]);
    }
  });
  return map;
}

const SAMPLES = [
  'title: The Dusty Archive',
  'quality courage number = 5 min 0 max 10',
  "quality mood string = 'calm'",
  'hud courage meter "Courage"',
  'hud hasKey badge',
  'theme dark when sanity < 30',
  ':: start [start]',
  ':: ending-flee',
  '-> Take the lantern => stacks',
  '-> Enter the cave => cave ? courage >= 6',
  '-> Grab the key => cave-key { hasKey = true, courage += 2 }',
  '-> Bribe the guard => hall ? coins >= 10 { coins -= 10 }',
  '{ sanity -= 10, clarity += 15 }',
];

describe('line rules', () => {
  SAMPLES.forEach((line) => {
    it(`covers "${line}" with groups that reassemble the full line`, () => {
      const result = matchLine(line);
      expect(result, `no rule matched: ${line}`).not.toBeNull();
      expect(result!.groups.join('')).toBe(line);
      expect(result!.tokens.length).toBe(result!.groups.length);
    });
  });

  it('tokenizes link segments fine-grained (not one whole-line token)', () => {
    const tokens = tokensFor('-> Bribe the guard => hall ? coins >= 10 { coins -= 10 }');
    expect(tokens.get('string')).toBe('Bribe the guard');
    expect(tokens.get('type.identifier')).toBe('hall');
    expect(tokens.get('annotation')).toContain('coins >= 10');
    expect(tokens.get('attribute')).toContain('coins -= 10');
    expect([...tokens.keys()].filter((t) => t !== 'white').length).toBeGreaterThan(3);
  });

  it('separates situation id from tags', () => {
    const tokens = tokensFor(':: start [start, dark]');
    expect(tokens.get('type.identifier')).toBe('start');
    expect(tokens.get('tag')).toContain('[start, dark]');
  });

  it('tokenizes quality declarations by part', () => {
    const tokens = tokensFor('quality courage number = 5 min 0 max 10');
    expect(tokens.get('keyword')).toBe('quality');
    expect(tokens.get('variable')).toBe('courage');
    expect(tokens.get('type')).toBe('number');
  });

  it('tokenizes hud and theme directives', () => {
    const hud = tokensFor('hud courage meter "Courage"');
    expect(hud.get('keyword')).toBe('hud');
    expect(hud.get('type')).toBe('meter');
    expect(hud.get('string')).toContain('"Courage"');

    const theme = tokensFor('theme dark when sanity < 30');
    expect(theme.get('keyword')).toBe('themewhen');
    expect(theme.get('annotation')).toBe('sanity < 30');
  });

  it('tokenizes entry-effect lines with brace operators', () => {
    const tokens = tokensFor('{ sanity -= 10, clarity += 15 }');
    expect(tokens.get('operators')).toBe('{}');
    expect(tokens.get('attribute')).toContain('sanity -= 10');
  });
});

describe('prose rules', () => {
  const proseMatches = (text: string): string[] =>
    PROSE_RULES.filter(([regex]) => regex.test(text)).map(([, token]) => token);

  it('highlights adaptive spans, interpolation, and markdown markers', () => {
    expect(proseMatches('[oneOf: a | b]')).toContain('annotation');
    expect(proseMatches('[rarely: something shifts]')).toContain('annotation');
    expect(proseMatches('worth {courage} points')).toContain('variable');
    expect(proseMatches('**bold** words')).toContain('strong');
    expect(proseMatches('*soft* words')).toContain('emphasis');
    expect(proseMatches('some `code` here')).toContain('string.code');
  });

  it('ignores plain prose', () => {
    expect(proseMatches('Just an ordinary sentence.')).toEqual([]);
  });
});

describe('language & themes', () => {
  it('exposes the combined tokenizer with line rules before prose rules', () => {
    expect(dslMonarchLanguage.tokenizer.root.length).toBe(LINE_RULES.length + PROSE_RULES.length);
  });

  it('both themes style every custom token used by the grammar', () => {
    const usedTokens = new Set<string>();
    LINE_RULES.forEach(([, tokens]) => tokens.forEach((t) => t !== 'white' && t !== '' && usedTokens.add(t)));
    PROSE_RULES.forEach(([, token]) => usedTokens.add(token));

    (['textplus-light', 'textplus-dark'] as const).forEach((name) => {
      const themed = new Set(dslThemes[name].rules.map((rule) => rule.token));
      usedTokens.forEach((token) => {
        expect(themed.has(token), `${name} missing token style: ${token}`).toBe(true);
      });
    });
  });
});
