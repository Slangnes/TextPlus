/**
 * The Living Map (Pillar 2) — two POVs of the same structure:
 * dev view marks gated links dashed; the in-game dungeon map ("map dungeon")
 * gives players fog-of-war reveal, a you-are-here marker, and fast-travel
 * to rooms already visited. Positions stay stable as the fog lifts.
 */

import { test, expect } from '@playwright/test';
import { setSource } from './helpers';

const DELVE = `title: The Delve

map dungeon

quality lamp boolean = false

:: entrance [start]
The Entrance
Torchlight flickers on wet stone. A lamp hangs on a hook.

-> Go north => hall { lamp = true }

:: hall
The Long Hall
Pillars march into the dark.

-> Go north => shrine
-> Go east => vault ? lamp

:: shrine
The Shrine
Cold candles, old prayers.

-> Go south => hall

:: vault
The Vault
Gold dust and silence.

-> Go west => hall
`;

test.describe('living map', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#status')).toContainText('✓');
    await setSource(page, DELVE);
    await expect(page.locator('#status')).toContainText('✓ The Delve');
  });

  test('gated links draw dashed on the developer map', async ({ page }) => {
    await expect(page.locator('.map-edge--gated')).toHaveCount(1); // hall→vault ? lamp
    await expect(page.locator('.map-edge')).toHaveCount(5);
  });

  test('the in-game map reveals with the fog of war and marks the current room', async ({ page }) => {
    const rooms = page.locator('.tp-gamemap__room');
    await expect(rooms).toHaveCount(1); // only the entrance is known
    await expect(page.locator('.tp-gamemap__room.is-here')).toHaveAttribute(
      'data-situation-id',
      'entrance',
    );

    await page.locator('.tp-link', { hasText: 'Go north' }).click(); // → hall
    await expect(rooms).toHaveCount(2);
    await expect(page.locator('.tp-gamemap__path')).toHaveCount(1);
    await expect(page.locator('.tp-gamemap__room.is-here')).toHaveAttribute(
      'data-situation-id',
      'hall',
    );

    // The vault stays fogged until actually visited.
    await expect(page.locator('.tp-gamemap__room[data-situation-id="vault"]')).toHaveCount(0);
  });

  test('fast-travel: clicking a visited room on the player map goes there', async ({ page }) => {
    await page.locator('.tp-link', { hasText: 'Go north' }).click(); // hall
    await page.locator('.tp-link', { hasText: 'Go north' }).click(); // shrine
    await expect(page.locator('.tp-title')).toHaveText('The Shrine');

    await page.locator('.tp-gamemap__room[data-situation-id="entrance"]').click();
    await expect(page.locator('.tp-title')).toHaveText('The Entrance');
    await expect(page.locator('.tp-gamemap__room')).toHaveCount(3);
  });

  test('room positions stay stable as the fog lifts', async ({ page }) => {
    const xOf = async (id: string): Promise<number> =>
      Number(
        await page
          .locator(`.tp-gamemap__room[data-situation-id="${id}"] rect`)
          .getAttribute('x'),
      );

    await page.locator('.tp-link', { hasText: 'Go north' }).click(); // hall
    const hallX = await xOf('hall');
    await page.locator('.tp-link', { hasText: 'Go north' }).click(); // shrine
    expect(await xOf('hall')).toBe(hallX); // discovering the shrine didn't move the hall
  });
});
