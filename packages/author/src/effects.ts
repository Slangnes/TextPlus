/**
 * TextPlus Author - Effects Language
 *
 * Parses the brace-block effect syntax that appears on links
 * (`-> text => target { courage += 2, hasKey = true }`) and on
 * situation-entry lines (`{ sanity -= 10 }`), and compiles it to engine
 * callbacks. The compiled closure guards itself: DomRenderer's click path
 * calls onChoose unguarded, so a bad effect must never take down the UI.
 *
 *   effects := effect (',' effect)*
 *   effect  := quality-id ('+=' | '-=') number
 *            | quality-id '=' (number | 'true' | 'false' | string)
 */

import type { GameEngine } from '@textplus/core';

export class EffectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EffectError';
  }
}

export type EffectNode =
  | { kind: 'mutate'; qualityId: string; delta: number }
  | { kind: 'set'; qualityId: string; value: number | boolean | string };

const EFFECT_PATTERN = /^([a-zA-Z][\w-]*)\s*(\+=|-=|=)\s*(.+)$/;

function parseScalar(raw: string): number | boolean | string {
  if (raw === 'true') {
    return true;
  }
  if (raw === 'false') {
    return false;
  }
  const quoted = /^(['"])(.*)\1$/.exec(raw);
  if (quoted) {
    return quoted[2];
  }
  const numeric = Number(raw);
  if (!Number.isNaN(numeric) && raw !== '') {
    return numeric;
  }
  throw new EffectError(`Invalid effect value "${raw}" (use a number, true/false, or a 'quoted string')`);
}

/** Parse a comma-separated effects string (the inside of the braces). */
export function parseEffects(source: string): EffectNode[] {
  const trimmed = source.trim();
  if (!trimmed) {
    throw new EffectError('Empty effect block');
  }

  return trimmed.split(',').map((part) => {
    const effect = part.trim();
    const match = EFFECT_PATTERN.exec(effect);
    if (!match) {
      throw new EffectError(`Invalid effect "${effect}" (expected "id += n", "id -= n", or "id = value")`);
    }
    const [, qualityId, operator, rawValue] = match;
    const value = parseScalar(rawValue.trim());

    if (operator === '=') {
      return { kind: 'set', qualityId, value };
    }
    if (typeof value !== 'number') {
      throw new EffectError(`"${effect}": ${operator} requires a number`);
    }
    return { kind: 'mutate', qualityId, delta: operator === '+=' ? value : -value };
  });
}

/**
 * Compile effect nodes into an engine callback (used for both link onChoose
 * and situation onEnter). Failures are logged, never thrown.
 */
export function compileEffects(nodes: EffectNode[]): (game: GameEngine) => void {
  return (game) => {
    nodes.forEach((node) => {
      try {
        if (node.kind === 'mutate') {
          game.mutateQuality(node.qualityId, node.delta);
        } else {
          game.setQuality(node.qualityId, node.value);
        }
      } catch (error) {
        console.error(`TextPlus effect failed for quality "${node.qualityId}":`, error);
      }
    });
  };
}

/** All quality ids referenced by the effects (for linting). */
export function collectEffectRefs(nodes: EffectNode[]): string[] {
  return [...new Set(nodes.map((node) => node.qualityId))];
}
