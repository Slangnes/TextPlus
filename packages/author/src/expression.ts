/**
 * TextPlus Author - Condition Expression Language
 *
 * A small, safe expression language for DSL link conditions and theme rules:
 *
 *   expr  := or
 *   or    := and ( ('or'  | '||') and )*
 *   and   := not ( ('and' | '&&') not )*
 *   not   := ('not' | '!') not | cmp
 *   cmp   := term ( ('==' | '!=' | '>=' | '<=' | '>' | '<') term )?
 *   term  := number | 'true' | 'false' | string | quality-id | '(' expr ')'
 *
 * Expressions compile to pure, throw-free closures over the qualities Record
 * that core's getAvailableLinks passes on its FIRST dispatch attempt
 * (see packages/core/src/situation.ts) — never eval/new Function. An unknown
 * quality reads as undefined, which makes every comparison and truthiness
 * test false rather than throwing.
 */

import type { QualityValue } from '@textplus/core';

export type QualitiesRecord = Record<string, QualityValue>;

export class ExpressionError extends Error {
  readonly column: number;

  constructor(message: string, column: number) {
    super(message);
    this.name = 'ExpressionError';
    this.column = column;
  }
}

// --- Tokenizer ---------------------------------------------------------------

type TokenKind = 'ident' | 'number' | 'string' | 'op' | 'lparen' | 'rparen' | 'keyword';

interface Token {
  kind: TokenKind;
  value: string;
  column: number;
}

const KEYWORDS = new Set(['and', 'or', 'not', 'true', 'false']);
const MULTI_OPS = ['==', '!=', '>=', '<=', '&&', '||'];
const SINGLE_OPS = ['>', '<', '!'];

export function tokenizeExpression(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < source.length) {
    const ch = source[i];
    const column = i + 1;

    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    if (ch === '(') {
      tokens.push({ kind: 'lparen', value: '(', column });
      i += 1;
      continue;
    }
    if (ch === ')') {
      tokens.push({ kind: 'rparen', value: ')', column });
      i += 1;
      continue;
    }

    const two = source.slice(i, i + 2);
    if (MULTI_OPS.includes(two)) {
      tokens.push({ kind: 'op', value: two, column });
      i += 2;
      continue;
    }
    if (SINGLE_OPS.includes(ch)) {
      tokens.push({ kind: 'op', value: ch, column });
      i += 1;
      continue;
    }
    if (ch === '=') {
      throw new ExpressionError(`Use '==' for comparison, not '='`, column);
    }

    if (ch === "'" || ch === '"') {
      const close = source.indexOf(ch, i + 1);
      if (close === -1) {
        throw new ExpressionError('Unterminated string literal', column);
      }
      tokens.push({ kind: 'string', value: source.slice(i + 1, close), column });
      i = close + 1;
      continue;
    }

    const numberMatch = /^-?\d+(\.\d+)?/.exec(source.slice(i));
    if (numberMatch && (ch !== '-' || /\d/.test(source[i + 1] ?? ''))) {
      tokens.push({ kind: 'number', value: numberMatch[0], column });
      i += numberMatch[0].length;
      continue;
    }

    const identMatch = /^[a-zA-Z][\w-]*/.exec(source.slice(i));
    if (identMatch) {
      const word = identMatch[0];
      tokens.push({ kind: KEYWORDS.has(word) ? 'keyword' : 'ident', value: word, column });
      i += word.length;
      continue;
    }

    throw new ExpressionError(`Unexpected character "${ch}"`, column);
  }

  return tokens;
}

// --- AST & parser ------------------------------------------------------------

export type ExprNode =
  | { kind: 'binary'; op: string; left: ExprNode; right: ExprNode }
  | { kind: 'unary'; op: 'not'; operand: ExprNode }
  | { kind: 'ref'; qualityId: string }
  | { kind: 'literal'; value: number | boolean | string };

class Parser {
  private readonly tokens: Token[];
  private readonly source: string;
  private index = 0;

  constructor(tokens: Token[], source: string) {
    this.tokens = tokens;
    this.source = source;
  }

  parse(): ExprNode {
    const node = this.parseOr();
    const trailing = this.peek();
    if (trailing) {
      throw new ExpressionError(`Unexpected "${trailing.value}"`, trailing.column);
    }
    return node;
  }

  private peek(): Token | undefined {
    return this.tokens[this.index];
  }

  private next(): Token {
    const token = this.tokens[this.index];
    if (!token) {
      throw new ExpressionError('Unexpected end of expression', this.source.length + 1);
    }
    this.index += 1;
    return token;
  }

  private matches(kind: TokenKind, ...values: string[]): boolean {
    const token = this.peek();
    return !!token && token.kind === kind && values.includes(token.value);
  }

  private parseOr(): ExprNode {
    let left = this.parseAnd();
    while (this.matches('keyword', 'or') || this.matches('op', '||')) {
      this.next();
      left = { kind: 'binary', op: 'or', left, right: this.parseAnd() };
    }
    return left;
  }

  private parseAnd(): ExprNode {
    let left = this.parseNot();
    while (this.matches('keyword', 'and') || this.matches('op', '&&')) {
      this.next();
      left = { kind: 'binary', op: 'and', left, right: this.parseNot() };
    }
    return left;
  }

  private parseNot(): ExprNode {
    if (this.matches('keyword', 'not') || this.matches('op', '!')) {
      this.next();
      return { kind: 'unary', op: 'not', operand: this.parseNot() };
    }
    return this.parseComparison();
  }

  private parseComparison(): ExprNode {
    const left = this.parseTerm();
    if (this.matches('op', '==', '!=', '>=', '<=', '>', '<')) {
      const op = this.next().value;
      return { kind: 'binary', op, left, right: this.parseTerm() };
    }
    return left;
  }

  private parseTerm(): ExprNode {
    const token = this.next();
    switch (token.kind) {
      case 'number':
        return { kind: 'literal', value: Number(token.value) };
      case 'string':
        return { kind: 'literal', value: token.value };
      case 'keyword':
        if (token.value === 'true' || token.value === 'false') {
          return { kind: 'literal', value: token.value === 'true' };
        }
        throw new ExpressionError(`Unexpected keyword "${token.value}"`, token.column);
      case 'ident':
        return { kind: 'ref', qualityId: token.value };
      case 'lparen': {
        const inner = this.parseOr();
        const close = this.peek();
        if (!close || close.kind !== 'rparen') {
          throw new ExpressionError('Missing closing parenthesis', token.column);
        }
        this.next();
        return inner;
      }
      default:
        throw new ExpressionError(`Unexpected "${token.value}"`, token.column);
    }
  }
}

export function parseExpression(source: string): ExprNode {
  const trimmed = source.trim();
  if (!trimmed) {
    throw new ExpressionError('Empty expression', 1);
  }
  return new Parser(tokenizeExpression(trimmed), trimmed).parse();
}

// --- Compilation -------------------------------------------------------------

type ValueGetter = (q: QualitiesRecord) => number | boolean | string | undefined;

function compileValue(node: ExprNode): ValueGetter {
  switch (node.kind) {
    case 'literal': {
      const { value } = node;
      return () => value;
    }
    case 'ref': {
      const id = node.qualityId;
      return (q) => q[id]?.value;
    }
    default: {
      const bool = compileBoolean(node);
      return (q) => bool(q);
    }
  }
}

function compileBoolean(node: ExprNode): (q: QualitiesRecord) => boolean {
  switch (node.kind) {
    case 'literal':
      return () => Boolean(node.value);
    case 'ref': {
      const id = node.qualityId;
      return (q) => Boolean(q[id]?.value);
    }
    case 'unary': {
      const operand = compileBoolean(node.operand);
      return (q) => !operand(q);
    }
    case 'binary': {
      if (node.op === 'and' || node.op === 'or') {
        const left = compileBoolean(node.left);
        const right = compileBoolean(node.right);
        return node.op === 'and' ? (q) => left(q) && right(q) : (q) => left(q) || right(q);
      }
      const left = compileValue(node.left);
      const right = compileValue(node.right);
      const op = node.op;
      return (q) => {
        const a = left(q);
        const b = right(q);
        if (a === undefined || b === undefined) {
          // Unknown quality: only inequality against a defined value is true.
          return op === '!=' ? a !== b : false;
        }
        switch (op) {
          case '==':
            return a === b;
          case '!=':
            return a !== b;
          case '>=':
            return a >= b;
          case '<=':
            return a <= b;
          case '>':
            return a > b;
          case '<':
            return a < b;
          default:
            return false;
        }
      };
    }
  }
}

/**
 * Compile an expression AST into a pure, throw-free condition closure over the
 * qualities Record (core's first-attempt condition dispatch shape).
 */
export function compileConditionExpr(node: ExprNode): (q: QualitiesRecord) => boolean {
  const compiled = compileBoolean(node);
  return (q) => {
    try {
      return compiled(q ?? {});
    } catch {
      return false;
    }
  };
}

/** All quality ids referenced anywhere in the expression (for linting). */
export function collectQualityRefs(node: ExprNode): string[] {
  const refs = new Set<string>();
  const walk = (n: ExprNode): void => {
    switch (n.kind) {
      case 'ref':
        refs.add(n.qualityId);
        break;
      case 'unary':
        walk(n.operand);
        break;
      case 'binary':
        walk(n.left);
        walk(n.right);
        break;
      case 'literal':
        break;
    }
  };
  walk(node);
  return [...refs];
}
