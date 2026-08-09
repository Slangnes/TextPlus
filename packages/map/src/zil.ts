/**
 * TextPlus Map - ZIL Room Importer (M3)
 *
 * Extracts a StoryGraph straight from Infocom ZIL source: every top-level
 * `<ROOM ...>` form becomes a node (titled by its DESC), and every plain
 * directional exit `(NORTH TO OTHER-ROOM)` becomes an edge. Conditional
 * exits keep their target (`(EAST TO X IF ...)` still links to X); blocked
 * (`SORRY`) and scripted (`PER routine`) exits carry no target and are
 * skipped, as are exits to rooms not defined in the given source.
 *
 * This goes a step beyond Trizbort's transcript import: with the original
 * source in hand, the whole map is recovered exactly, no playthrough needed.
 */

import type { StoryGraph, GraphNode, GraphEdge } from './layout';

const DIRECTIONS =
  /\((?:NORTH|SOUTH|EAST|WEST|NE|NW|SE|SW|UP|DOWN|IN|OUT|LAND)\s+TO\s+([A-Z0-9][A-Z0-9-]*)/g;

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

/** Build a story graph from ZIL source. Throws when no rooms are found. */
export function importZilRooms(source: string): StoryGraph {
  // Top-level forms start at column 0; a room's body is everything up to
  // the next top-level form.
  const chunks = source.split(/^(?=<)/m);

  const nodes: GraphNode[] = [];
  const ids = new Map<string, string>(); // ZIL id -> slug
  const rawEdges: Array<{ from: string; to: string }> = [];

  chunks.forEach((chunk) => {
    const header = /^<ROOM\s+([A-Z0-9][A-Z0-9-]*)/.exec(chunk);
    if (!header) {
      return;
    }
    const zilId = header[1];
    const slug = slugify(zilId);
    if (ids.has(zilId)) {
      return;
    }
    ids.set(zilId, slug);

    const desc = /\(DESC\s+"([^"]*)"/.exec(chunk);
    nodes.push({ id: slug, title: desc?.[1] || titleFromId(zilId) });

    for (const exit of chunk.matchAll(DIRECTIONS)) {
      rawEdges.push({ from: zilId, to: exit[1] });
    }
  });

  if (nodes.length === 0) {
    throw new Error('No <ROOM ...> definitions found in the ZIL source');
  }

  const edges: GraphEdge[] = [];
  const seen = new Set<string>();
  rawEdges.forEach(({ from, to }) => {
    const fromSlug = ids.get(from);
    const toSlug = ids.get(to);
    if (!fromSlug || !toSlug || fromSlug === toSlug) {
      return; // exit to a room outside this source (or a self-reference)
    }
    const key = `${fromSlug} > ${toSlug}`;
    if (!seen.has(key)) {
      seen.add(key);
      edges.push({ from: fromSlug, to: toSlug });
    }
  });

  return { nodes, edges, startId: nodes[0].id };
}
