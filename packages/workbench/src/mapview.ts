/**
 * TextPlus Workbench - Story Map View
 *
 * Renders a @textplus/map GraphLayout as an interactive SVG: situations as
 * room boxes, links as arrows. Highlights the situation the preview is
 * currently playing and jumps there when a box is clicked.
 */

import type { GraphLayout, PositionedNode } from '@textplus/map';

export interface MapViewOptions {
  currentId: string | null;
  onNodeClick?: (situationId: string) => void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const NODE_W = 150;
const NODE_H = 44;
const MARGIN = 24;
const LABEL_MAX = 20;

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, tag);
}

function truncate(text: string): string {
  return text.length > LABEL_MAX ? `${text.slice(0, LABEL_MAX - 1)}…` : text;
}

/** Point on the boundary of a node's box along the line toward (px, py). */
function boundaryPoint(node: PositionedNode, px: number, py: number): { x: number; y: number } {
  const cx = node.x + NODE_W / 2;
  const cy = node.y + NODE_H / 2;
  const dx = px - cx;
  const dy = py - cy;
  const scale = Math.max(Math.abs(dx) / (NODE_W / 2 + 6), Math.abs(dy) / (NODE_H / 2 + 6), 1e-6);
  return { x: cx + dx / scale, y: cy + dy / scale };
}

function center(node: PositionedNode): { x: number; y: number } {
  return { x: node.x + NODE_W / 2, y: node.y + NODE_H / 2 };
}

export function renderMap(layout: GraphLayout, options: MapViewOptions, target: HTMLElement): void {
  target.replaceChildren();

  if (layout.nodes.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'map-empty';
    empty.textContent = 'Compile a story to see its map.';
    target.appendChild(empty);
    return;
  }

  const width = layout.width + MARGIN * 2;
  const height = layout.height + NODE_H + MARGIN * 2;

  const svg = svgEl('svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.setAttribute('class', 'map-svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Story map');

  const defs = svgEl('defs');
  const marker = svgEl('marker');
  marker.setAttribute('id', 'map-arrow');
  marker.setAttribute('viewBox', '0 0 10 10');
  marker.setAttribute('refX', '9');
  marker.setAttribute('refY', '5');
  marker.setAttribute('markerWidth', '7');
  marker.setAttribute('markerHeight', '7');
  marker.setAttribute('orient', 'auto-start-reverse');
  const arrowPath = svgEl('path');
  arrowPath.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
  arrowPath.setAttribute('class', 'map-arrowhead');
  marker.appendChild(arrowPath);
  defs.appendChild(marker);
  svg.appendChild(defs);

  const root = svgEl('g');
  root.setAttribute('transform', `translate(${MARGIN}, ${MARGIN})`);
  svg.appendChild(root);

  const byId = new Map(layout.nodes.map((node) => [node.id, node]));

  // Edges first so boxes paint over the line ends.
  layout.edges.forEach((edge) => {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to || edge.from === edge.to) {
      return;
    }
    const toCenter = center(to);
    const fromCenter = center(from);
    const start = boundaryPoint(from, toCenter.x, toCenter.y);
    const end = boundaryPoint(to, fromCenter.x, fromCenter.y);

    const line = svgEl('line');
    line.setAttribute('x1', String(start.x));
    line.setAttribute('y1', String(start.y));
    line.setAttribute('x2', String(end.x));
    line.setAttribute('y2', String(end.y));
    line.setAttribute('class', 'map-edge');
    line.setAttribute('marker-end', 'url(#map-arrow)');
    root.appendChild(line);
  });

  layout.nodes.forEach((node) => {
    const group = svgEl('g');
    let cls = 'map-node';
    if (node.id === options.currentId) {
      cls += ' is-current';
    }
    if (!node.reachable) {
      cls += ' is-orphan';
    }
    if (node.terminal) {
      cls += ' is-terminal';
    }
    group.setAttribute('class', cls);
    group.setAttribute('data-situation-id', node.id);

    const rect = svgEl('rect');
    rect.setAttribute('x', String(node.x));
    rect.setAttribute('y', String(node.y));
    rect.setAttribute('width', String(NODE_W));
    rect.setAttribute('height', String(NODE_H));
    rect.setAttribute('rx', '6');
    group.appendChild(rect);

    const label = svgEl('text');
    label.setAttribute('x', String(node.x + NODE_W / 2));
    label.setAttribute('y', String(node.y + NODE_H / 2 + 4));
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('class', 'map-label');
    label.textContent = truncate(node.title || node.id);
    group.appendChild(label);

    const tooltip = svgEl('title');
    tooltip.textContent = `${node.title || node.id} (${node.id})${node.reachable ? '' : ' — unreachable'}`;
    group.appendChild(tooltip);

    if (options.onNodeClick) {
      group.addEventListener('click', () => options.onNodeClick!(node.id));
    }

    root.appendChild(group);
  });

  target.appendChild(svg);
}
