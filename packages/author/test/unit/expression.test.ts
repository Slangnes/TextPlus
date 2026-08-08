import { describe, it, expect } from 'vitest';
import {
  tokenizeExpression,
  parseExpression,
  compileConditionExpr,
  collectQualityRefs,
  ExpressionError,
} from '../../src/expression';
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

function evaluate(source: string, values: Record<string, number | boolean | string> = {}): boolean {
  return compileConditionExpr(parseExpression(source))(qualities(values));
}

describe('tokenizeExpression', () => {
  it('tokenizes idents, numbers, strings, and operators', () => {
    const kinds = tokenizeExpression(`courage >= 6 and name == 'Ada'`).map((t) => t.kind);
    expect(kinds).toEqual(['ident', 'op', 'number', 'keyword', 'ident', 'op', 'string']);
  });

  it('prefers multi-character operators', () => {
    expect(tokenizeExpression('a>=b').map((t) => t.value)).toEqual(['a', '>=', 'b']);
    expect(tokenizeExpression('a!=b').map((t) => t.value)).toEqual(['a', '!=', 'b']);
  });

  it('supports kebab-case quality ids', () => {
    expect(tokenizeExpression('has-key')[0]).toMatchObject({ kind: 'ident', value: 'has-key' });
  });

  it('rejects single = with a helpful message', () => {
    expect(() => tokenizeExpression('courage = 5')).toThrow(/'=='/);
  });

  it('rejects unterminated strings and stray characters with columns', () => {
    try {
      tokenizeExpression("name == 'oops");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ExpressionError);
      expect((error as ExpressionError).column).toBe(9);
    }
    expect(() => tokenizeExpression('a @ b')).toThrow(ExpressionError);
  });
});

describe('parseExpression', () => {
  it('honors precedence: not > comparison > and > or', () => {
    const node = parseExpression('a or b and not c');
    expect(node).toMatchObject({ kind: 'binary', op: 'or' });
    const right = (node as { right: unknown }).right;
    expect(right).toMatchObject({ kind: 'binary', op: 'and' });
  });

  it('parses parentheses to override precedence', () => {
    expect(evaluate('(true or false) and false')).toBe(false);
    expect(evaluate('true or (false and false)')).toBe(true);
  });

  it('rejects empty and trailing-garbage expressions', () => {
    expect(() => parseExpression('   ')).toThrow(/Empty/);
    expect(() => parseExpression('a == 1 b')).toThrow(/Unexpected "b"/);
    expect(() => parseExpression('(a == 1')).toThrow(/parenthesis/);
    expect(() => parseExpression('a ==')).toThrow(/end of expression/);
  });
});

describe('compiled conditions', () => {
  it('compares numbers', () => {
    expect(evaluate('courage >= 6', { courage: 6 })).toBe(true);
    expect(evaluate('courage >= 6', { courage: 5 })).toBe(false);
    expect(evaluate('courage < 3', { courage: 2 })).toBe(true);
    expect(evaluate('courage == 2.5', { courage: 2.5 })).toBe(true);
  });

  it('supports negative number literals', () => {
    expect(evaluate('depth <= -2', { depth: -3 })).toBe(true);
  });

  it('compares strings and booleans', () => {
    expect(evaluate(`mood == 'grim'`, { mood: 'grim' })).toBe(true);
    expect(evaluate('hasKey == true', { hasKey: true })).toBe(true);
    expect(evaluate('hasKey != true', { hasKey: false })).toBe(true);
  });

  it('treats a bare quality ref as truthiness', () => {
    expect(evaluate('hasKey', { hasKey: true })).toBe(true);
    expect(evaluate('hasKey', { hasKey: false })).toBe(false);
    expect(evaluate('courage', { courage: 0 })).toBe(false);
    expect(evaluate('courage', { courage: 3 })).toBe(true);
  });

  it('supports not/!, and/&&, or/||', () => {
    expect(evaluate('not hasKey', { hasKey: false })).toBe(true);
    expect(evaluate('!hasKey', { hasKey: false })).toBe(true);
    expect(evaluate('a && b', { a: true, b: true })).toBe(true);
    expect(evaluate('a || b', { a: false, b: true })).toBe(true);
    expect(evaluate('a and not b', { a: true, b: false })).toBe(true);
  });

  it('yields false (never throws) for unknown qualities', () => {
    expect(evaluate('ghost >= 1')).toBe(false);
    expect(evaluate('ghost == 0')).toBe(false);
    expect(evaluate('ghost')).toBe(false);
    expect(evaluate('not ghost')).toBe(true);
  });

  it('inequality against an unknown quality is true for defined values', () => {
    expect(evaluate('ghost != 5')).toBe(true);
  });

  it('never throws, even on a null record', () => {
    const condition = compileConditionExpr(parseExpression('courage >= 6'));
    expect(condition(undefined as unknown as QualitiesRecord)).toBe(false);
  });

  it('is pure: repeated evaluation gives identical results', () => {
    const condition = compileConditionExpr(parseExpression('courage >= 6 and hasKey'));
    const q = qualities({ courage: 7, hasKey: true });
    expect(condition(q)).toBe(true);
    expect(condition(q)).toBe(true);
  });
});

describe('collectQualityRefs', () => {
  it('collects unique refs from nested expressions', () => {
    const refs = collectQualityRefs(parseExpression('courage >= 6 and (hasKey or not courage)'));
    expect(refs.sort()).toEqual(['courage', 'hasKey']);
  });

  it('ignores literals and keywords', () => {
    expect(collectQualityRefs(parseExpression(`true and 5 == 5 and 'x' == 'x'`))).toEqual([]);
  });
});
