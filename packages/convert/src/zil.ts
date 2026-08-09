/**
 * TextPlus Convert - ZIL Deconstruction (M4)
 *
 * The Transmatte flow without a transcript: feed the actual program. Every
 * top-level `<ROOM ...>` in the ZIL source becomes a situation with its
 * real prose — `(LDESC "...")` when present, otherwise the string literals
 * of the room ACTION routine's M-LOOK branch (best effort) — and every
 * plain or conditional directional exit becomes a movement-labeled link
 * ("Go north"), so the compiled story lays out compass-true on the map.
 *
 * Blocked (SORRY) and scripted (PER) exits carry no target and are
 * skipped, as are exits to rooms outside the given source. Deconstructing
 * compiled story files (.z5/.dat) remains out of scope.
 */

import { sanitizeProse } from './transcript';

const EXITS =
  /\((NORTH|SOUTH|EAST|WEST|NE|NW|SE|SW|UP|DOWN|IN|OUT|LAND)\s+TO\s+([A-Z0-9][A-Z0-9-]*)/g;

const DIRECTION_LABELS: Record<string, string> = {
  NORTH: 'Go north',
  SOUTH: 'Go south',
  EAST: 'Go east',
  WEST: 'Go west',
  NE: 'Go northeast',
  NW: 'Go northwest',
  SE: 'Go southeast',
  SW: 'Go southwest',
  UP: 'Go up',
  DOWN: 'Go down',
  IN: 'Enter',
  OUT: 'Exit',
  LAND: 'Land',
};

const MAX_PROSE = 900;

function slugify(zilId: string): string {
  const slug = zilId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return /^[a-z]/.test(slug) ? slug : `room-${slug || 'x'}`;
}

function titleFromId(zilId: string): string {
  return zilId
    .toLowerCase()
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function normalizeProse(raw: string): string {
  const collapsed = raw.replace(/\s+/g, ' ').trim();
  return collapsed.length > MAX_PROSE ? `${collapsed.slice(0, MAX_PROSE).trimEnd()}…` : collapsed;
}

/** String literals of a routine's M-LOOK branch, joined (best effort). */
function proseFromAction(routineChunk: string): string {
  const lookIndex = routineChunk.indexOf('M-LOOK');
  if (lookIndex === -1) {
    return '';
  }
  const branch = routineChunk.slice(lookIndex);
  const nextBranch = branch.slice(6).search(/,M-[A-Z]/);
  const scope = nextBranch === -1 ? branch : branch.slice(0, nextBranch + 6);
  const strings = [...scope.matchAll(/"([^"]*)"/g)].map((match) => match[1]);
  return strings.join(' ');
}

export interface ZilToDslOptions {
  /** Story title; defaults to the first room's DESC. */
  title?: string;
}

/** Deconstruct ZIL source into a compiling DSL story. Throws when no rooms. */
export function zilToDsl(source: string, options: ZilToDslOptions = {}): string {
  const chunks = source.split(/^(?=<)/m);

  // Index ACTION routines so rooms can pull their M-LOOK prose.
  const routines = new Map<string, string>();
  chunks.forEach((chunk) => {
    const header = /^<ROUTINE\s+([A-Z0-9?-]+)/.exec(chunk);
    if (header) {
      routines.set(header[1], chunk);
    }
  });

  interface Room {
    slug: string;
    title: string;
    prose: string;
    exits: Array<{ label: string; target: string }>;
  }

  const rooms: Room[] = [];
  const slugs = new Map<string, string>();
  const pendingExits: Array<{ from: string; label: string; to: string }> = [];

  chunks.forEach((chunk) => {
    const header = /^<ROOM\s+([A-Z0-9][A-Z0-9-]*)/.exec(chunk);
    if (!header || slugs.has(header[1])) {
      return;
    }
    const zilId = header[1];
    const slug = slugify(zilId);
    slugs.set(zilId, slug);

    const desc = /\(DESC\s+"([^"]*)"/.exec(chunk);
    const ldesc = /\(LDESC\s+"([^"]*)"/.exec(chunk);
    const action = /\(ACTION\s+([A-Z0-9?-]+)\)/.exec(chunk);

    let prose = ldesc ? ldesc[1] : '';
    if (!prose && action && routines.has(action[1])) {
      prose = proseFromAction(routines.get(action[1])!);
    }

    rooms.push({
      slug,
      title: desc?.[1] || titleFromId(zilId),
      prose: normalizeProse(prose),
      exits: [],
    });

    for (const exit of chunk.matchAll(EXITS)) {
      pendingExits.push({ from: zilId, label: DIRECTION_LABELS[exit[1]], to: exit[2] });
    }
  });

  if (rooms.length === 0) {
    throw new Error('No <ROOM ...> definitions found in the ZIL source');
  }

  const bySlug = new Map(rooms.map((room) => [room.slug, room]));
  const linkSeen = new Set<string>();
  pendingExits.forEach(({ from, label, to }) => {
    const fromSlug = slugs.get(from);
    const toSlug = slugs.get(to);
    if (!fromSlug || !toSlug || fromSlug === toSlug) {
      return;
    }
    const key = `${fromSlug} > ${toSlug}`;
    if (!linkSeen.has(key)) {
      linkSeen.add(key);
      bySlug.get(fromSlug)!.exits.push({ label, target: toSlug });
    }
  });

  const title = options.title ?? rooms[0].title;
  const sections = rooms.map((room, index) => {
    const lines = [
      index === 0 ? `:: ${room.slug} [start]` : `:: ${room.slug}`,
      room.title,
      '',
      sanitizeProse(room.prose) || '...',
    ];
    room.exits.forEach((exit) => {
      lines.push('', `-> ${exit.label} => ${exit.target}`);
    });
    return lines.join('\n');
  });

  return `title: ${title}\n\n${sections.join('\n\n')}\n`;
}
