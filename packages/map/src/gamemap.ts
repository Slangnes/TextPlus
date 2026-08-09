/**
 * TextPlus Map - In-Game Dungeon Map
 *
 * The player-facing map, distinct from the developer's structural view:
 * fog-of-war reveal (only visited rooms appear), the current room marked,
 * and optional fast-travel to rooms already visited. Positions come from
 * laying out the FULL world graph, so rooms don't rearrange as the fog
 * lifts — the map grows into a stable picture.
 *
 * Worlds-aware: shows the current world's layer only (or the whole graph
 * for games without worlds).
 */

import type { GameEngine } from '@textplus/core';
import { graphFromConfig } from './adapter';
import { layoutGraph } from './layout';
import type { PositionedNode } from './layout';

const SVG_NS = 'http://www.w3.org/2000/svg';
const ROOM_W = 120;
const ROOM_H = 34;
const MARGIN = 16;

export interface GameMapOptions {
  /** Clicking a visited room travels there (engine.goToSituation). Default true. */
  travel?: boolean;
}

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, tag);
}

/** Render the player's map of where they have been. */
export function renderGameMap(
  engine: GameEngine,
  target: HTMLElement,
  options: GameMapOptions = {},
): void {
  target.replaceChildren();

  const travel = options.travel ?? true;
  const currentWorld = engine.getCurrentWorld?.();

  // Lay out the whole current-world graph for stable positions...
  const fullGraph = graphFromConfig(engine.config);
  const worldNodes = fullGraph.nodes.filter((node) => node.world === currentWorld);
  const worldIds = new Set(worldNodes.map((node) => node.id));
  const layout = layoutGraph({
    nodes: worldNodes,
    edges: fullGraph.edges.filter((edge) => worldIds.has(edge.from) && worldIds.has(edge.to)),
    startId: worldIds.has(fullGraph.startId ?? '') ? fullGraph.startId : worldNodes[0]?.id ?? null,
  });

  // ...but reveal only what the player has actually seen.
  const visible = layout.nodes.filter((node) => engine.hasSituationBeenVisited(node.id));
  if (visible.length === 0) {
    return;
  }
  const visibleIds = new Set(visible.map((node) => node.id));

  const minX = Math.min(...visible.map((node) => node.x));
  const minY = Math.min(...visible.map((node) => node.y));
  const maxX = Math.max(...visible.map((node) => node.x));
  const maxY = Math.max(...visible.map((node) => node.y));
  const width = maxX - minX + ROOM_W + MARGIN * 2;
  const height = maxY - minY + ROOM_H + MARGIN * 2;

  const svg = svgEl('svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('class', 'tp-gamemap');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Map of visited locations');

  const root = svgEl('g');
  root.setAttribute('transform', `translate(${MARGIN - minX}, ${MARGIN - minY})`);
  svg.appendChild(root);

  const byId = new Map<string, PositionedNode>(layout.nodes.map((node) => [node.id, node]));
  const scale = ROOM_W / layout.columnWidth; // shrink layout coords to room grid
  const cx = (node: PositionedNode): number => node.x * scale + ROOM_W / 2;
  const cy = (node: PositionedNode): number =>
    node.y * (ROOM_H + 18) / layout.rowHeight + ROOM_H / 2;

  // Paths between rooms the player has seen both ends of.
  layout.edges.forEach((edge) => {
    if (!visibleIds.has(edge.from) || !visibleIds.has(edge.to) || edge.from === edge.to) {
      return;
    }
    const from = byId.get(edge.from)!;
    const to = byId.get(edge.to)!;
    const line = svgEl('line');
    line.setAttribute('x1', String(cx(from)));
    line.setAttribute('y1', String(cy(from)));
    line.setAttribute('x2', String(cx(to)));
    line.setAttribute('y2', String(cy(to)));
    line.setAttribute('class', 'tp-gamemap__path');
    root.appendChild(line);
  });

  visible.forEach((node) => {
    const group = svgEl('g');
    const here = engine.currentSituation === node.id;
    group.setAttribute('class', here ? 'tp-gamemap__room is-here' : 'tp-gamemap__room');
    group.setAttribute('data-situation-id', node.id);

    const rect = svgEl('rect');
    rect.setAttribute('x', String(cx(node) - ROOM_W / 2));
    rect.setAttribute('y', String(cy(node) - ROOM_H / 2));
    rect.setAttribute('width', String(ROOM_W));
    rect.setAttribute('height', String(ROOM_H));
    rect.setAttribute('rx', '5');
    group.appendChild(rect);

    const label = svgEl('text');
    label.setAttribute('x', String(cx(node)));
    label.setAttribute('y', String(cy(node) + 4));
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('class', 'tp-gamemap__label');
    const title = node.title || node.id;
    label.textContent = title.length > 16 ? `${title.slice(0, 15)}…` : title;
    group.appendChild(label);

    if (travel && !here) {
      group.addEventListener('click', () => engine.goToSituation(node.id));
    }

    root.appendChild(group);
  });

  target.appendChild(svg);
}
