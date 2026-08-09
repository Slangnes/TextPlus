/**
 * TextPlus Map - Transcript Importer (M3)
 *
 * Auto-populates a StoryGraph from a plain-text play transcript: room
 * headers become nodes (unified by name, so revisits and alternate walks
 * converge), typed commands become the edges between consecutive rooms.
 * Headerless command responses become linear step nodes.
 *
 * Deliberately independent of @textplus/convert (sibling packages do not
 * import each other): this importer extracts only the graph — rooms and
 * connections — while convert owns full prose-preserving DSL conversion.
 */

import type { StoryGraph, GraphNode, GraphEdge } from './layout';

const MAX_ROOM_HEADER_LENGTH = 50;

function isNoise(line: string): boolean {
  const trimmed = line.trim();
  return /^\[.*\]$/.test(trimmed) || /^\*\*\*.*\*\*\*$/.test(trimmed);
}

function isRoomHeader(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > MAX_ROOM_HEADER_LENGTH) {
    return false;
  }
  if (/[.!?:,]$/.test(trimmed)) {
    return false;
  }
  if (trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
    return true;
  }
  const words = trimmed.split(/\s+/);
  return (
    words.length <= 6 &&
    words.every((word) => /^[A-Z0-9'&-]/.test(word) || word.length < 4) &&
    /^[A-Z]/.test(trimmed)
  );
}

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return /^[a-z]/.test(slug) ? slug : `room-${slug || 'x'}`;
}

function sentenceCase(command: string): string {
  const trimmed = command.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/** Build a story graph from a plain-text transcript. Throws on empty input. */
export function importTranscript(text: string): StoryGraph {
  const lines = text.replace(/\r\n/g, '\n').split('\n');

  const nodes: GraphNode[] = [];
  const nodeIds = new Set<string>();
  const edges: GraphEdge[] = [];
  const edgeSeen = new Set<string>();

  let currentId: string | null = null;
  let pendingCommand: string | null = null;
  let sawHeaderForPending = false;
  let stepCount = 0;

  const ensureNode = (id: string, title: string): void => {
    if (!nodeIds.has(id)) {
      nodeIds.add(id);
      nodes.push({ id, title });
    }
  };

  const connect = (from: string, to: string): void => {
    const key = `${from} > ${to}`;
    if (!edgeSeen.has(key)) {
      edgeSeen.add(key);
      edges.push({ from, to });
    }
  };

  const arriveAt = (id: string, title: string): void => {
    ensureNode(id, title);
    if (currentId !== null && currentId !== id) {
      connect(currentId, id);
    }
    currentId = id;
    pendingCommand = null;
  };

  lines.forEach((line) => {
    if (isNoise(line)) {
      return;
    }
    const commandMatch = /^\s*>\s*(.*)$/.exec(line);
    if (commandMatch) {
      // A command whose response never named a room becomes a step node.
      if (pendingCommand !== null && !sawHeaderForPending) {
        stepCount += 1;
        arriveAt(`step-${stepCount}`, sentenceCase(pendingCommand));
      }
      pendingCommand = commandMatch[1].trim() || 'wait';
      sawHeaderForPending = false;
      return;
    }
    if (isRoomHeader(line)) {
      arriveAt(slugify(line.trim()), line.trim());
      sawHeaderForPending = true;
    }
  });

  if (pendingCommand !== null && !sawHeaderForPending) {
    stepCount += 1;
    arriveAt(`step-${stepCount}`, sentenceCase(pendingCommand));
  }

  if (nodes.length === 0) {
    throw new Error('Transcript contains no rooms or commands');
  }

  return { nodes, edges, startId: nodes[0].id };
}
