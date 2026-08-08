// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderMap } from '../../src/mapview';
import { analyzeSource } from '../../src/controller';
import { SAMPLE_STORY } from '../../src/examples';
import { graphFromConfig, layoutGraph } from '@textplus/map';
import type { GraphLayout } from '@textplus/map';

function sampleLayout(): GraphLayout {
  const config = analyzeSource(SAMPLE_STORY).config!;
  return layoutGraph(graphFromConfig(config));
}

describe('renderMap', () => {
  let target: HTMLElement;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
  });

  it('draws one box per situation and arrows for the links', () => {
    const layout = sampleLayout();
    renderMap(layout, { currentId: null }, target);
    expect(target.querySelectorAll('.map-node').length).toBe(layout.nodes.length);
    expect(target.querySelectorAll('.map-edge').length).toBe(layout.edges.length);
  });

  it('highlights the current situation', () => {
    renderMap(sampleLayout(), { currentId: 'stacks' }, target);
    const current = target.querySelector('.map-node.is-current');
    expect(current?.getAttribute('data-situation-id')).toBe('stacks');
  });

  it('marks endings as terminal', () => {
    renderMap(sampleLayout(), { currentId: null }, target);
    const terminalIds = Array.from(target.querySelectorAll('.map-node.is-terminal')).map((el) =>
      el.getAttribute('data-situation-id'),
    );
    expect(terminalIds).toContain('ending-sleep');
    expect(terminalIds).toContain('ending-shelved');
  });

  it('invokes the click callback with the situation id', () => {
    const onNodeClick = vi.fn();
    renderMap(sampleLayout(), { currentId: null, onNodeClick }, target);
    const node = target.querySelector<SVGGElement>('.map-node[data-situation-id="vault"]');
    node?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onNodeClick).toHaveBeenCalledWith('vault');
  });

  it('renders a hint instead of an svg for an empty layout', () => {
    renderMap(layoutGraph({ nodes: [], edges: [], startId: null }), { currentId: null }, target);
    expect(target.querySelector('svg')).toBeNull();
    expect(target.querySelector('.map-empty')).not.toBeNull();
  });

  it('re-rendering replaces the previous svg', () => {
    renderMap(sampleLayout(), { currentId: null }, target);
    renderMap(sampleLayout(), { currentId: null }, target);
    expect(target.querySelectorAll('svg').length).toBe(1);
  });
});
