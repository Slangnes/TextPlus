/**
 * Map layout geometry and classification, verified through the rendered SVG:
 * depth columns, unique cells, orphan parking, terminal flags, edge dedup.
 */

import { test, expect } from '@playwright/test';
import { setSource } from './helpers';

interface NodePos {
  id: string | null;
  x: number;
  y: number;
}

async function nodePositions(page: import('@playwright/test').Page): Promise<NodePos[]> {
  return page.locator('.map-node').evaluateAll((nodes) =>
    nodes.map((node) => ({
      id: node.getAttribute('data-situation-id'),
      x: Number(node.querySelector('rect')?.getAttribute('x')),
      y: Number(node.querySelector('rect')?.getAttribute('y')),
    })),
  );
}

test.describe('story map', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#status')).toContainText('✓');
  });

  test('endings are flagged terminal on the sample story', async ({ page }) => {
    await expect(page.locator('.map-node.is-terminal')).toHaveCount(3);
    await expect(page.locator('.map-node[data-situation-id="start"]')).not.toHaveClass(
      /is-terminal/,
    );
    await expect(page.locator('.map-node.is-orphan')).toHaveCount(0);
  });

  test('columns follow shortest-path depth and every room gets a unique cell', async ({ page }) => {
    await setSource(
      page,
      `title: Geometry

:: a [start]
Alpha
Prose a.

-> To b => b
-> Straight to c => c

:: b
Beta
Prose b.

-> Onward => c

:: c
Gamma
Prose c.
`,
    );
    await expect(page.locator('.map-node')).toHaveCount(3);
    const nodes = await nodePositions(page);
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const a = byId.get('a')!;
    const b = byId.get('b')!;
    const c = byId.get('c')!;

    // c is reachable in one hop, so it shares b's column despite the a→b→c route.
    expect(b.x).toBeGreaterThan(a.x);
    expect(c.x).toBe(b.x);
    expect(c.y).not.toBe(b.y);

    // No two rooms share a cell.
    expect(new Set(nodes.map((n) => `${n.x},${n.y}`)).size).toBe(nodes.length);
  });

  test('parallel links collapse to one edge and self-loops draw nothing', async ({ page }) => {
    await setSource(
      page,
      `title: Edges

:: start [start]
Hub
Choose a door.

-> First door => end
-> Second door => end
-> Loop back => start

:: end
End
Done.
`,
    );
    await expect(page.locator('.map-node')).toHaveCount(2);
    await expect(page.locator('.map-edge')).toHaveCount(1);
  });

  test('unreachable rooms park in a trailing column, flagged unreachable', async ({ page }) => {
    await setSource(
      page,
      `title: Orphan Map

:: start [start]
Start
Onward lies the hall.

-> Onward => hall

:: hall
Hall
A dead end.

:: attic
Attic
Dust gathers.
`,
    );
    const orphan = page.locator('.map-node.is-orphan[data-situation-id="attic"]');
    await expect(orphan).toHaveCount(1);
    await expect(orphan.locator('title')).toContainText('— unreachable');

    const nodes = await nodePositions(page);
    const byId = new Map(nodes.map((n) => [n.id, n]));
    expect(byId.get('attic')!.x).toBeGreaterThan(byId.get('hall')!.x);
    await expect(page.locator('.map-node.is-terminal[data-situation-id="hall"]')).toHaveCount(1);
  });
});
