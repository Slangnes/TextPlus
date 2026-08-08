import { describe, it, expect } from 'vitest';
import { layoutGraph, graphFromConfig, autoLayout } from '../../src';
import type { StoryGraph } from '../../src';
import type { GameConfig } from '@textplus/core';

function graph(partial: Partial<StoryGraph>): StoryGraph {
  return { nodes: [], edges: [], startId: null, ...partial };
}

function node(id: string) {
  return { id, title: id };
}

describe('layoutGraph', () => {
  it('positions a single room at the origin', () => {
    const layout = layoutGraph(graph({ nodes: [node('start')], startId: 'start' }));
    expect(layout.nodes).toHaveLength(1);
    expect(layout.nodes[0]).toMatchObject({ x: 0, y: 0, depth: 0, reachable: true, terminal: true });
  });

  it('returns an empty layout for an empty graph', () => {
    const layout = layoutGraph(graph({}));
    expect(layout.nodes).toHaveLength(0);
    expect(layout.width).toBe(0);
    expect(layout.height).toBe(0);
  });

  it('lays out a linear chain in successive columns', () => {
    const layout = layoutGraph(
      graph({
        nodes: [node('a'), node('b'), node('c')],
        edges: [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'c' },
        ],
        startId: 'a',
      }),
    );
    const depths = Object.fromEntries(layout.nodes.map((n) => [n.id, n.depth]));
    expect(depths).toEqual({ a: 0, b: 1, c: 2 });
  });

  it('stacks branches that share a depth into rows of the same column', () => {
    const layout = layoutGraph(
      graph({
        nodes: [node('start'), node('left'), node('right')],
        edges: [
          { from: 'start', to: 'left' },
          { from: 'start', to: 'right' },
        ],
        startId: 'start',
      }),
    );
    const left = layout.nodes.find((n) => n.id === 'left')!;
    const right = layout.nodes.find((n) => n.id === 'right')!;
    expect(left.x).toBe(right.x);
    expect(left.y).not.toBe(right.y);
  });

  it('never assigns two nodes the same cell', () => {
    const nodes = ['a', 'b', 'c', 'd', 'e', 'f'].map(node);
    const layout = layoutGraph(
      graph({
        nodes,
        edges: [
          { from: 'a', to: 'b' },
          { from: 'a', to: 'c' },
          { from: 'b', to: 'd' },
          { from: 'c', to: 'd' },
          { from: 'd', to: 'e' },
          { from: 'd', to: 'f' },
        ],
        startId: 'a',
      }),
    );
    const cells = layout.nodes.map((n) => `${n.x},${n.y}`);
    expect(new Set(cells).size).toBe(cells.length);
  });

  it('uses shortest-path depth when multiple routes exist', () => {
    const layout = layoutGraph(
      graph({
        nodes: [node('a'), node('b'), node('c')],
        edges: [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'c' },
          { from: 'a', to: 'c' },
        ],
        startId: 'a',
      }),
    );
    expect(layout.nodes.find((n) => n.id === 'c')?.depth).toBe(1);
  });

  it('handles cycles without looping forever', () => {
    const layout = layoutGraph(
      graph({
        nodes: [node('a'), node('b')],
        edges: [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'a' },
        ],
        startId: 'a',
      }),
    );
    expect(layout.nodes.find((n) => n.id === 'b')?.depth).toBe(1);
  });

  it('parks unreachable nodes in a trailing column, flagged unreachable', () => {
    const layout = layoutGraph(
      graph({
        nodes: [node('start'), node('next'), node('island')],
        edges: [{ from: 'start', to: 'next' }],
        startId: 'start',
      }),
    );
    const island = layout.nodes.find((n) => n.id === 'island')!;
    expect(island.reachable).toBe(false);
    expect(island.depth).toBe(2);
    expect(layout.nodes.filter((n) => n.reachable).every((n) => n.depth < island.depth)).toBe(true);
  });

  it('marks nodes without outgoing edges as terminal', () => {
    const layout = layoutGraph(
      graph({
        nodes: [node('start'), node('end')],
        edges: [{ from: 'start', to: 'end' }],
        startId: 'start',
      }),
    );
    expect(layout.nodes.find((n) => n.id === 'start')?.terminal).toBe(false);
    expect(layout.nodes.find((n) => n.id === 'end')?.terminal).toBe(true);
  });

  it('drops edges that reference unknown nodes', () => {
    const layout = layoutGraph(
      graph({
        nodes: [node('a')],
        edges: [{ from: 'a', to: 'ghost' }],
        startId: 'a',
      }),
    );
    expect(layout.edges).toHaveLength(0);
  });

  it('falls back to the first node when startId is null', () => {
    const layout = layoutGraph(
      graph({
        nodes: [node('first'), node('second')],
        edges: [{ from: 'first', to: 'second' }],
      }),
    );
    expect(layout.nodes.find((n) => n.id === 'first')?.depth).toBe(0);
  });

  it('honors custom cell sizing and reports the bounding box', () => {
    const layout = layoutGraph(
      graph({
        nodes: [node('a'), node('b')],
        edges: [{ from: 'a', to: 'b' }],
        startId: 'a',
      }),
      { columnWidth: 100, rowHeight: 40 },
    );
    expect(layout.nodes.find((n) => n.id === 'b')?.x).toBe(100);
    expect(layout.width).toBe(200);
    expect(layout.height).toBe(40);
  });
});

describe('graphFromConfig', () => {
  const config: GameConfig = {
    title: 'T',
    initialSituation: 'start',
    qualities: {},
    situations: {
      start: {
        id: 'start',
        title: 'Start',
        content: 'x',
        links: [
          { text: 'go', target: 'end' },
          { text: 'go again', target: 'end' },
        ],
      },
      end: { id: 'end', title: 'End', content: 'y', links: [] },
    },
  };

  it('maps situations to nodes and start to startId', () => {
    const g = graphFromConfig(config);
    expect(g.nodes.map((n) => n.id).sort()).toEqual(['end', 'start']);
    expect(g.startId).toBe('start');
  });

  it('deduplicates parallel links between the same pair', () => {
    const g = graphFromConfig(config);
    expect(g.edges).toEqual([{ from: 'start', to: 'end' }]);
  });
});

describe('autoLayout (legacy room surface)', () => {
  it('positions rooms and returns their connections', () => {
    const result = autoLayout([
      { id: 'hall', name: 'Hall', connections: { north: 'study' } },
      { id: 'study', name: 'Study' },
    ]);
    expect(result.rooms.get('hall')).toEqual({ x: 0, y: 0 });
    expect(result.rooms.get('study')?.x).toBeGreaterThan(0);
    expect(result.connections).toEqual([['hall', 'study']]);
  });
});
