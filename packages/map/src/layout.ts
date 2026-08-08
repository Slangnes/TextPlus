/**
 * TextPlus Map - Story Graph Auto-Layout
 *
 * Positions story situations as rooms on a 2D grid using layered BFS:
 * each node's column is its shortest link-distance from the start, and
 * nodes sharing a column stack into rows. Unreachable nodes park in a
 * trailing column so authors can spot orphans at a glance.
 */

export interface GraphNode {
  id: string;
  title: string;
  tags?: string[];
}

export interface GraphEdge {
  from: string;
  to: string;
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
  /** 0-based column (BFS depth from start; orphans go after the last column). */
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
}

export interface LayoutOptions {
  columnWidth?: number;
  rowHeight?: number;
}

const DEFAULT_COLUMN_WIDTH = 200;
const DEFAULT_ROW_HEIGHT = 72;

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

/** Lay out a story graph on a grid. Every node gets a unique (x, y) cell. */
export function layoutGraph(graph: StoryGraph, options: LayoutOptions = {}): GraphLayout {
  const columnWidth = options.columnWidth ?? DEFAULT_COLUMN_WIDTH;
  const rowHeight = options.rowHeight ?? DEFAULT_ROW_HEIGHT;

  if (graph.nodes.length === 0) {
    return { nodes: [], edges: [], width: 0, height: 0, columnWidth, rowHeight };
  }

  const startId = graph.startId ?? graph.nodes[0].id;
  const depths = bfsDepths(graph, startId);
  const maxReachableDepth = depths.size > 0 ? Math.max(...depths.values()) : -1;
  const orphanDepth = maxReachableDepth + 1;

  const outDegree = new Map<string, number>();
  graph.edges.forEach((edge) => {
    outDegree.set(edge.from, (outDegree.get(edge.from) ?? 0) + 1);
  });

  const rowsUsed = new Map<number, number>();
  const nodes: PositionedNode[] = graph.nodes.map((node) => {
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

  const knownIds = new Set(graph.nodes.map((node) => node.id));
  const edges = graph.edges.filter((edge) => knownIds.has(edge.from) && knownIds.has(edge.to));

  const width = (Math.max(...nodes.map((n) => n.depth)) + 1) * columnWidth;
  const height = Math.max(...rowsUsed.values()) * rowHeight;

  return { nodes, edges, width, height, columnWidth, rowHeight };
}
