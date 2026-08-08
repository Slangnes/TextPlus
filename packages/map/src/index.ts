/**
 * TextPlus Map - Extending Trizbort.io
 *
 * Main entry point for TextPlus Map library.
 *
 * Implemented (M3 first slice):
 * - Auto-layout algorithm for room/situation positioning (layered BFS grid)
 * - GameConfig → StoryGraph adapter for graph visualization
 *
 * Still to come in Milestone 3:
 * - Import transcripts and auto-populate map
 * - Code generation for Inform 7, Ink, TextPlus Author DSL
 * - Batch room renaming and find-replace
 * - Round-trip conversion between formats
 */

export const VERSION = '0.0.1';

export { layoutGraph } from './layout';
export type {
  GraphNode,
  GraphEdge,
  StoryGraph,
  PositionedNode,
  GraphLayout,
  LayoutOptions,
} from './layout';
export { graphFromConfig } from './adapter';

import { layoutGraph } from './layout';

export interface RoomDefinition {
  id: string;
  name: string;
  description?: string;
  connections?: Record<string, string>;
}

export interface MapLayout {
  rooms: Map<string, { x: number; y: number }>;
  connections: Array<[string, string]>;
}

/** Legacy room-list surface, now backed by the real layout engine. */
export function autoLayout(rooms: RoomDefinition[]): MapLayout {
  const layout = layoutGraph({
    nodes: rooms.map((room) => ({ id: room.id, title: room.name })),
    edges: rooms.flatMap((room) =>
      Object.values(room.connections ?? {}).map((target) => ({ from: room.id, to: target })),
    ),
    startId: rooms[0]?.id ?? null,
  });

  const positioned = new Map<string, { x: number; y: number }>();
  layout.nodes.forEach((node) => positioned.set(node.id, { x: node.x, y: node.y }));

  return {
    rooms: positioned,
    connections: layout.edges.map((edge): [string, string] => [edge.from, edge.to]),
  };
}

export function importTranscript(_transcriptData: unknown): RoomDefinition[] {
  throw new Error('Not yet implemented - placeholder for M3');
}
