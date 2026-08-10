/**
 * Worlds/Modes (Scene Machinery 1a) — named sub-graphs sharing one player
 * state, with per-world resume, mode skins (data-world), a world readout in
 * the status bar, and world tabs on the map. The generic machinery behind
 * mode-switching games (facility/simulation, day/night, ship/planet...).
 */

import { test, expect } from '@playwright/test';
import { setSource } from './helpers';

const FACILITY = `title: Facility

world prism "PRISM Facility"
world comm "Communications"

quality clearance number = 0 min 0 max 5

:: prism:control [start]
Control Center
The hum of the mainframe. Clearance level {clearance}.

-> Study the console => prism:office { clearance += 1 }
-> Enter Communications => comm:feed-a

:: prism:office
The Office
Quiet, apart from the ventilation.

-> Back to Control => prism:control

:: comm:feed-a
Feed A — Stadium
Crowds surge below the camera.

-> Switch to Feed B => comm:feed-b
-> Return to the facility => prism:control

:: comm:feed-b
Feed B — River
The waters run brown and slow.

-> Return to the facility => prism:control
`;

async function getWorld(page: import('@playwright/test').Page): Promise<string | undefined> {
  return page.evaluate(() => (window as any).__workbench.getWorld());
}

async function setWorld(page: import('@playwright/test').Page, worldId: string): Promise<void> {
  await page.evaluate((id) => (window as any).__workbench.setWorld(id), worldId);
}

test.describe('worlds', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#status')).toContainText('✓');
    await setSource(page, FACILITY);
    await expect(page.locator('#status')).toContainText('✓ Facility');
  });

  test('a worlds game announces its world in the status bar and skins by data-world', async ({ page }) => {
    await expect(page.locator('#status-world')).toHaveText('⬒ PRISM Facility');
    await expect(page.locator('#preview-game')).toHaveAttribute('data-world', 'prism');
    expect(await getWorld(page)).toBe('prism');

    // Map tabs appear for worlds games: All + one per world.
    await expect(page.locator('.map-world-tab')).toHaveCount(3);
    await expect(page.locator('.map-world-tab[data-world-id="*"]')).toHaveClass(/is-active/);
  });

  test('cross-world links switch modes like any other transition', async ({ page }) => {
    await page.locator('.tp-link', { hasText: 'Enter Communications' }).click();
    await expect(page.locator('.tp-title')).toHaveText('Feed A — Stadium');
    await expect(page.locator('#status-world')).toHaveText('⬒ Communications');
    await expect(page.locator('#preview-game')).toHaveAttribute('data-world', 'comm');
    expect(await getWorld(page)).toBe('comm');
  });

  test('switching worlds resumes each world at its last-visited situation', async ({ page }) => {
    // Leave prism standing in the office, not at its initial situation.
    await page.locator('.tp-link', { hasText: 'Study the console' }).click();
    await expect(page.locator('.tp-title')).toHaveText('The Office');

    await setWorld(page, 'comm');
    await expect(page.locator('.tp-title')).toHaveText('Feed A — Stadium');
    await page.locator('.tp-link', { hasText: 'Switch to Feed B' }).click();

    await setWorld(page, 'prism');
    await expect(page.locator('.tp-title')).toHaveText('The Office'); // resumed, not reset

    await setWorld(page, 'comm');
    await expect(page.locator('.tp-title')).toHaveText('Feed B — River'); // and comm resumed too
  });

  test('map tabs filter per world and follow the player between worlds', async ({ page }) => {
    await expect(page.locator('.map-node')).toHaveCount(4); // All view

    await page.locator('.map-world-tab[data-world-id="prism"]').click();
    await expect(page.locator('.map-node')).toHaveCount(2);
    await expect(page.locator('.map-node[data-situation-id="prism:control"]')).toHaveCount(1);

    // Travelling to another world drags the filtered map along.
    await page.locator('.tp-link', { hasText: 'Enter Communications' }).click();
    await expect(page.locator('.map-world-tab[data-world-id="comm"]')).toHaveClass(/is-active/);
    await expect(page.locator('.map-node')).toHaveCount(2);
    await expect(
      page.locator('.map-node.is-current[data-situation-id="comm:feed-a"]'),
    ).toHaveCount(1);
  });

  test('entry effects see the world being entered — a capture records the new world', async ({ page }) => {
    await setSource(
      page,
      `title: Mirror Order

world office "The Office"
world cams "The Cameras"

quality world string = nowhere

task scene "First glimpse"

:: office:desk [start]
The Desk
Quiet here.

-> Jack in => cams:feed

:: cams:feed
The Feed
{ capture scene }
Watching from {world}.

-> Unplug => office:desk
`,
    );
    await page.locator('.tp-link', { hasText: 'Jack in' }).click();
    // The capture ran during onEnter; its frozen snapshot must name the world
    // being entered, matching the entry's own world field — not the one left.
    await page.locator('#panel-picker-3').selectOption('journal');
    await expect(page.locator('.journal-entry__content')).toContainText('Watching from cams.');
    await expect(page.locator('.journal-entry__meta')).toContainText('cams');
  });

  test('world resume points survive a recompile', async ({ page }) => {
    await page.locator('.tp-link', { hasText: 'Study the console' }).click();
    await setWorld(page, 'comm');
    await page.locator('.tp-link', { hasText: 'Switch to Feed B' }).click();
    await expect(page.locator('.tp-title')).toHaveText('Feed B — River');

    await setSource(page, FACILITY.replace('Crowds surge', 'A crowd surges'));
    await expect(page.locator('.tp-title')).toHaveText('Feed B — River'); // playthrough held

    await setWorld(page, 'prism');
    await expect(page.locator('.tp-title')).toHaveText('The Office'); // resume survived too
  });
});
