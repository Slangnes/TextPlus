/**
 * TextPlus Map - DSL Code Generation (M3)
 *
 * Emits a TextPlus Author DSL skeleton from a StoryGraph, closing the
 * round-trip: DSL → GameConfig → graphFromConfig → graphToDsl → DSL. Room
 * prose is a placeholder (a graph carries structure, not content); titles,
 * tags, links, and the start situation survive the trip.
 */

import type { StoryGraph } from './layout';

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
  const byFrom = new Map<string, string[]>();
  graph.edges.forEach((edge) => {
    const targets = byFrom.get(edge.from) ?? [];
    targets.push(edge.to);
    byFrom.set(edge.from, targets);
  });
  const titles = new Map(graph.nodes.map((node) => [node.id, node.title]));

  const title = options.title ?? titles.get(startId) ?? 'Story Map';

  const sections = graph.nodes.map((node) => {
    const tags = node.id === startId ? ['start', ...(node.tags ?? [])] : (node.tags ?? []);
    const uniqueTags = [...new Set(tags)];
    const header = uniqueTags.length > 0 ? `:: ${node.id} [${uniqueTags.join(' ')}]` : `:: ${node.id}`;
    const lines = [header, node.title || node.id, '', '...'];
    (byFrom.get(node.id) ?? []).forEach((target) => {
      lines.push('', `-> To ${titles.get(target) ?? target} => ${target}`);
    });
    return lines.join('\n');
  });

  return `title: ${title}\n\n${sections.join('\n\n')}\n`;
}
