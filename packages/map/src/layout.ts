/**
 * TextPlus Map - Story Graph Auto-Layout
 *
 * Two placement modes, chosen automatically:
 *
 * - **Compass** (Trizbort-style): when most edges carry compass directions
 *   (from ZIL exits, transcript commands, or "Go north" link labels), rooms
 *   are placed on a grid honoring those directions — north is up, east is
 *   right. Collisions stretch along the exit's direction so the geometry
 *   stays truthful. Rooms connected only by up/down/in/out (no compass
 *   vector) sit in the nearest free cell beside their neighbor.
 *
 * - **Flow** (layered BFS): without direction data, each node's column is
 *   its shortest link-distance from the start and nodes sharing a column
 *   stack into rows.
 *
 * In both modes unreachable nodes park in a trailing block so authors can
 * spot orphans at a glance, and every node gets a unique cell.
 */

export type Direction =
  | 'north'
  | 'south'
  | 'east'
  | 'west'
  | 'ne'
  | 'nw'
  | 'se'
  | 'sw'
  | 'up'
  | 'down'
  | 'in'
  | 'out';

export interface GraphNode {
  id: string;
  title: string;
  tags?: string[];
}

export interface GraphEdge {
  from: string;
  to: string;
  /** Compass/spatial direction of the exit, when known. */
  direction?: Direction;
}

export interface StoryGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Node the layout radiates from; null falls back to the first node. */
  startId: string | null;
}

export interface PositionedNode extends GraphNode {
  x: number;
  y: number;
  /** 0-based BFS depth from start (orphans go after the last column). */
  depth: number;
  reachable: boolean;
  /** True when no edges leave this node (story endings). */
  terminal: boolean;
}

export interface GraphLayout {
  nodes: PositionedNode[];
  edges: GraphEdge[];
  /** Bounding box including one trailing cell of padding. */
  width: number;
  height: number;
  columnWidth: number;
  rowHeight: number;
  /** Which placement strategy produced this layout. */
  mode: 'compass' | 'flow';
}

export interface LayoutOptions {
  columnWidth?: number;
  rowHeight?: number;
  /** 'auto' (default) picks compass when most edges carry compass vectors. */
  mode?: 'auto' | 'compass' | 'flow';
}

const DEFAULT_COLUMN_WIDTH = 200;
const DEFAULT_ROW_HEIGHT = 72;

/** Grid vector per compass direction; up/down/in/out have no vector. */
const DIRECTION_VECTORS: Partial<Record<Direction, { dx: number; dy: number }>> = {
  north: { dx: 0, dy: -1 },
  south: { dx: 0, dy: 1 },
  east: { dx: 1, dy: 0 },
  west: { dx: -1, dy: 0 },
  ne: { dx: 1, dy: -1 },
  nw: { dx: -1, dy: -1 },
  se: { dx: 1, dy: 1 },
  sw: { dx: -1, dy: 1 },
};

/** Breadth-first depth (shortest link distance) for every node reachable from start. */
function bfsDepths(graph: StoryGraph, startId: string): Map<string, number> {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const out = new Map<string, string[]>();
  graph.edges.forEach((edge) => {
    if (!out.has(edge.from)) {
      out.set(edge.from, []);
    }
    out.get(edge.from)!.push(edge.to);
  });

  const depths = new Map<string, number>();
  if (!byId.has(startId)) {
    return depths;
  }

  const queue: Array<{ id: string; depth: number }> = [{ id: startId, depth: 0 }];
  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (depths.has(id)) {
      continue;
    }
    depths.set(id, depth);
    (out.get(id) ?? []).forEach((target) => {
      if (byId.has(target) && !depths.has(target)) {
        queue.push({ id: target, depth: depth + 1 });
      }
    });
  }

  return depths;
}

interface Cell {
  cx: number;
  cy: number;
}

/** Compass placement: honor direction vectors, stretch on collision. */
function placeCompass(graph: StoryGraph, startId: string): Map<string, Cell> {
  const placed = new Map<string, Cell>();
  const occupied = new Map<string, string>();
  const key = (cx: number, cy: number): string => `${cx},${cy}`;

  const claim = (id: string, cell: Cell): void => {
    placed.set(id, cell);
    occupied.set(key(cell.cx, cell.cy), id);
  };

  /** First free cell at desired, else stretched along v, else spiraling out. */
  const findFree = (desired: Cell, v: { dx: number; dy: number } | null): Cell => {
    if (!occupied.has(key(desired.cx, desired.cy))) {
      return desired;
    }
    if (v && (v.dx !== 0 || v.dy !== 0)) {
      for (let step = 1; step <= 8; step += 1) {
        const cell = { cx: desired.cx + v.dx * step, cy: desired.cy + v.dy * step };
        if (!occupied.has(key(cell.cx, cell.cy))) {
          return cell;
        }
      }
    }
    for (let radius = 1; radius < 64; radius += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        for (let dy = -radius; dy <= radius; dy += 1) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) {
            continue;
          }
          const cell = { cx: desired.cx + dx, cy: desired.cy + dy };
          if (!occupied.has(key(cell.cx, cell.cy))) {
            return cell;
          }
        }
      }
    }
    throw new Error('Compass layout could not find a free cell');
  };

  claim(startId, { cx: 0, cy: 0 });

  // Multi-pass relaxation: place any unplaced endpoint of an edge whose
  // other endpoint is placed, honoring the direction vector when present.
  const knownIds = new Set(graph.nodes.map((node) => node.id));
  let progress = true;
  while (progress) {
    progress = false;
    // Vectored edges first so compass truth wins over incidental adjacency.
    const ordered = [...graph.edges].sort((a, b) => {
      const av = a.direction && DIRECTION_VECTORS[a.direction] ? 0 : 1;
      const bv = b.direction && DIRECTION_VECTORS[b.direction] ? 0 : 1;
      return av - bv;
    });
    for (const edge of ordered) {
      if (!knownIds.has(edge.from) || !knownIds.has(edge.to)) {
        continue;
      }
      const vector = edge.direction ? DIRECTION_VECTORS[edge.direction] ?? null : null;
      const fromCell = placed.get(edge.from);
      const toCell = placed.get(edge.to);
      if (fromCell && !toCell) {
        const desired = vector
          ? { cx: fromCell.cx + vector.dx, cy: fromCell.cy + vector.dy }
          : { cx: fromCell.cx + 1, cy: fromCell.cy };
        claim(edge.to, findFree(desired, vector));
        progress = true;
      } else if (!fromCell && toCell) {
        const desired = vector
          ? { cx: toCell.cx - vector.dx, cy: toCell.cy - vector.dy }
          : { cx: toCell.cx - 1, cy: toCell.cy };
        claim(edge.from, findFree(desired, vector ? { dx: -vector.dx, dy: -vector.dy } : null));
        progress = true;
      }
    }
  }

  return placed;
}

/** Lay out a story graph on a grid. Every node gets a unique (x, y) cell. */
export function layoutGraph(graph: StoryGraph, options: LayoutOptions = {}): GraphLayout {
  const columnWidth = options.columnWidth ?? DEFAULT_COLUMN_WIDTH;
  const rowHeight = options.rowHeight ?? DEFAULT_ROW_HEIGHT;

  if (graph.nodes.length === 0) {
    return { nodes: [], edges: [], width: 0, height: 0, columnWidth, rowHeight, mode: 'flow' };
  }

  const startId = graph.startId ?? graph.nodes[0].id;
  const depths = bfsDepths(graph, startId);

  const vectored = graph.edges.filter(
    (edge) => edge.direction && DIRECTION_VECTORS[edge.direction],
  ).length;
  const wantCompass =
    options.mode === 'compass' ||
    (options.mode !== 'flow' &&
      graph.edges.length > 0 &&
      vectored >= Math.max(1, Math.ceil(graph.edges.length / 2)));

  const outDegree = new Map<string, number>();
  graph.edges.forEach((edge) => {
    outDegree.set(edge.from, (outDegree.get(edge.from) ?? 0) + 1);
  });

  const knownIds = new Set(graph.nodes.map((node) => node.id));
  const edges = graph.edges.filter((edge) => knownIds.has(edge.from) && knownIds.has(edge.to));

  let nodes: PositionedNode[];

  if (wantCompass) {
    const cells = placeCompass(graph, startId);
    const placedNodes = graph.nodes.filter((node) => cells.has(node.id));
    const minCx = Math.min(...placedNodes.map((node) => cells.get(node.id)!.cx));
    const minCy = Math.min(...placedNodes.map((node) => cells.get(node.id)!.cy));
    const maxCx = Math.max(...placedNodes.map((node) => cells.get(node.id)!.cx));

    // Unplaced nodes (no edge chain to start at all) park in a block on the right.
    let orphanRow = 0;
    const orphanCx = maxCx + 2;

    nodes = graph.nodes.map((node) => {
      const reachable = depths.has(node.id);
      const cell = cells.get(node.id);
      const cx = cell ? cell.cx - minCx : orphanCx - minCx;
      const cy = cell ? cell.cy - minCy : orphanRow++;
      return {
        ...node,
        depth: reachable ? depths.get(node.id)! : 0,
        reachable: cell !== undefined && reachable,
        terminal: (outDegree.get(node.id) ?? 0) === 0,
        x: cx * columnWidth,
        y: cy * rowHeight,
      };
    });
  } else {
    const maxReachableDepth = depths.size > 0 ? Math.max(...depths.values()) : -1;
    const orphanDepth = maxReachableDepth + 1;
    const rowsUsed = new Map<number, number>();
    nodes = graph.nodes.map((node) => {
      const reachable = depths.has(node.id);
      const depth = reachable ? depths.get(node.id)! : orphanDepth;
      const row = rowsUsed.get(depth) ?? 0;
      rowsUsed.set(depth, row + 1);

      return {
        ...node,
        depth,
        reachable,
        terminal: (outDegree.get(node.id) ?? 0) === 0,
        x: depth * columnWidth,
        y: row * rowHeight,
      };
    });
  }

  const width = Math.max(...nodes.map((n) => n.x)) + columnWidth;
  const height = Math.max(...nodes.map((n) => n.y)) + rowHeight;

  return { nodes, edges, width, height, columnWidth, rowHeight, mode: wantCompass ? 'compass' : 'flow' };
}
