/**
 * TextPlus Map - Extending Trizbort.io
 *
 * Main entry point for TextPlus Map library.
 *
 * Implemented (M3):
 * - Auto-layout algorithm for room/situation positioning (layered BFS grid)
 * - GameConfig → StoryGraph adapter for graph visualization
 * - Transcript importer: play transcript → StoryGraph (rooms + connections)
 * - ZIL importer: original Infocom source → exact StoryGraph, no playthrough
 * - DSL code generation: StoryGraph → compiling TextPlus Author skeleton
 *   (round-trip with graphFromConfig)
 *
 * Still to come in Milestone 3:
 * - Code generation for Inform 7 and Ink; Trizbort-format export
 * - Batch room renaming and find-replace
 */

export const VERSION = '0.0.1';

export { layoutGraph } from './layout';
export type {
  Direction,
  GraphNode,
  GraphEdge,
  StoryGraph,
  PositionedNode,
  GraphLayout,
  LayoutOptions,
} from './layout';
export { directionFromText, directionLabel } from './directions';
export { graphToTrizbort } from './trizbort';
export type { TrizbortOptions } from './trizbort';
export { renderGameMap } from './gamemap';
export type { GameMapOptions } from './gamemap';
export { graphFromConfig } from './adapter';
export { importTranscript } from './importer';
export { importZilRooms } from './zil';
export { graphToDsl } from './codegen';
export type { GraphToDslOptions } from './codegen';

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

