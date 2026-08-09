/**
 * TextPlus Map - Trizbort Export (M3)
 *
 * Serializes a GraphLayout to Trizbort's XML map format: one <room> per
 * node (positioned from the layout), one <line> per connection, docked to
 * compass ports when the edge carries a direction. Opposite one-way edges
 * between the same pair merge into a single two-way line.
 *
 * Generated against the published Trizbort schema; not yet validated
 * inside trizbort.io itself — treat as a starting map, not gospel.
 */

import type { Direction, GraphLayout } from './layout';

const PORTS: Partial<Record<Direction, string>> = {
  north: 'n',
  south: 's',
  east: 'e',
  west: 'w',
  ne: 'ne',
  nw: 'nw',
  se: 'se',
  sw: 'sw',
};

const OPPOSITE: Partial<Record<Direction, string>> = {
  north: 's',
  south: 'n',
  east: 'w',
  west: 'e',
  ne: 'sw',
  nw: 'se',
  se: 'nw',
  sw: 'ne',
};

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface TrizbortOptions {
  title?: string;
}

/** Serialize a laid-out story graph as a Trizbort XML document. */
export function graphToTrizbort(layout: GraphLayout, options: TrizbortOptions = {}): string {
  const roomIds = new Map<string, number>();
  layout.nodes.forEach((node, index) => roomIds.set(node.id, index + 1));

  const rooms = layout.nodes.map((node) => {
    const attrs = [
      `id="${roomIds.get(node.id)}"`,
      `name="${escapeXml(node.title || node.id)}"`,
      `subtitle="${escapeXml(node.id)}"`,
      `x="${node.x}"`,
      `y="${node.y}"`,
      `w="160"`,
      `h="64"`,
    ];
    if (node.depth === 0 && node.reachable) {
      attrs.push('isStartRoom="yes"');
    }
    return `    <room ${attrs.join(' ')} />`;
  });

  // Merge opposite one-way edges into single two-way lines.
  const byPair = new Map<string, { from: string; to: string; direction?: Direction; twoWay: boolean }>();
  layout.edges.forEach((edge) => {
    const reverseKey = `${edge.to}|${edge.from}`;
    const reverse = byPair.get(reverseKey);
    if (reverse) {
      reverse.twoWay = true;
      return;
    }
    byPair.set(`${edge.from}|${edge.to}`, { ...edge, twoWay: false });
  });

  let lineId = layout.nodes.length;
  const lines = [...byPair.values()].map((edge) => {
    lineId += 1;
    const port = edge.direction ? PORTS[edge.direction] : undefined;
    const backPort = edge.direction ? OPPOSITE[edge.direction] : undefined;
    const flow = edge.twoWay ? '' : ' flow="oneWay"';
    return [
      `    <line id="${lineId}"${flow}>`,
      `      <dock index="0" id="${roomIds.get(edge.from)}"${port ? ` port="${port}"` : ''} />`,
      `      <dock index="1" id="${roomIds.get(edge.to)}"${backPort ? ` port="${backPort}"` : ''} />`,
      '    </line>',
    ].join('\n');
  });

  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<trizbort version="1.7.2">',
    '  <info>',
    `    <title>${escapeXml(options.title ?? 'TextPlus Story Map')}</title>`,
    '    <author>TextPlus Map export</author>',
    '  </info>',
    '  <map>',
    ...rooms,
    ...lines,
    '  </map>',
    '</trizbort>',
    '',
  ].join('\n');
}
