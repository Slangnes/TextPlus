/**
 * TextPlus Map - Direction vocabulary
 *
 * Maps the many ways IF expresses movement — ZIL exit keywords, player
 * commands ("go north", "ne", "u"), and link labels ("Go northeast",
 * "Enter") — onto the canonical Direction set, so every import path can
 * feed the compass layout.
 */

import type { Direction } from './layout';

const WORDS: Record<string, Direction> = {
  north: 'north',
  n: 'north',
  south: 'south',
  s: 'south',
  east: 'east',
  e: 'east',
  west: 'west',
  w: 'west',
  northeast: 'ne',
  ne: 'ne',
  northwest: 'nw',
  nw: 'nw',
  southeast: 'se',
  se: 'se',
  southwest: 'sw',
  sw: 'sw',
  up: 'up',
  u: 'up',
  down: 'down',
  d: 'down',
  in: 'in',
  enter: 'in',
  inside: 'in',
  out: 'out',
  exit: 'out',
  outside: 'out',
  leave: 'out',
};

/** Human-facing label for a direction ("Go northeast", "Enter"). */
export function directionLabel(direction: Direction): string {
  switch (direction) {
    case 'in':
      return 'Enter';
    case 'out':
      return 'Exit';
    case 'ne':
      return 'Go northeast';
    case 'nw':
      return 'Go northwest';
    case 'se':
      return 'Go southeast';
    case 'sw':
      return 'Go southwest';
    default:
      return `Go ${direction}`;
  }
}

/**
 * Recover a direction from free text — a typed command or a link label.
 * Only leading movement phrasing counts ("go north", "North", "Enter");
 * prose that merely mentions a direction ("The north wall...") does not.
 */
export function directionFromText(text: string): Direction | undefined {
  const normalized = text.trim().toLowerCase();
  const match = /^(?:go|walk|head|move)?\s*([a-z]+)\b/.exec(normalized);
  if (!match) {
    return undefined;
  }
  return WORDS[match[1]];
}
