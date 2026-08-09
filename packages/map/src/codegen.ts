/**
 * TextPlus Map - DSL Code Generation (M3)
 *
 * Emits a TextPlus Author DSL skeleton from a StoryGraph, closing the
 * round-trip: DSL → GameConfig → graphFromConfig → graphToDsl → DSL. Room
 * prose is a placeholder (a graph carries structure, not content); titles,
 * tags, links, and the start situation survive the trip.
 */

import type { StoryGraph, GraphEdge } from './layout';
import { directionLabel } from './directions';

export interface GraphToDslOptions {
  /** Story title; defaults to the start node's title or "Story Map". */
  title?: string;
}

/** Generate a compiling DSL skeleton from a story graph. */
export function graphToDsl(graph: StoryGraph, options: GraphToDslOptions = {}): string {
  if (graph.nodes.length === 0) {
    throw new Error('Graph contains no nodes');
  }

  const startId = graph.startId ?? graph.nodes[0].id;
  const byFrom = new Map<string, GraphEdge[]>();
  graph.edges.forEach((edge) => {
    const targets = byFrom.get(edge.from) ?? [];
    targets.push(edge);
    byFrom.set(edge.from, targets);
  });
  const titles = new Map(graph.nodes.map((node) => [node.id, node.title]));

  const title = options.title ?? titles.get(startId) ?? 'Story Map';

  const sections = graph.nodes.map((node) => {
    const tags = node.id === startId ? ['start', ...(node.tags ?? [])] : (node.tags ?? []);
    const uniqueTags = [...new Set(tags)];
    // The author parser splits tags on commas — a space join would mangle
    // multi-tag headers and silently lose the [start] tag.
    const header = uniqueTags.length > 0 ? `:: ${node.id} [${uniqueTags.join(', ')}]` : `:: ${node.id}`;
    const lines = [header, node.title || node.id, '', '...'];
    (byFrom.get(node.id) ?? []).forEach((edge) => {
      // Directional labels ("Go north") round-trip: the adapter recovers the
      // direction from the label, so compass layouts survive DSL form.
      const label = edge.direction
        ? directionLabel(edge.direction)
        : `To ${titles.get(edge.to) ?? edge.to}`;
      lines.push('', `-> ${label} => ${edge.to}`);
    });
    return lines.join('\n');
  });

  return `title: ${title}\n\n${sections.join('\n\n')}\n`;
}
