/**
 * Import Transcript feature — the E2E surface for @textplus/convert.
 *
 * Recreates the convert round-trip acceptance through the real app: a pasted
 * Z-machine-style transcript becomes a compiling, playable, mapped story.
 */

import { test, expect } from '@playwright/test';
import { getSource, setSource, trackNativeDialogs, ZIL_FIXTURE } from './helpers';

const FIXTURE = `WEST OF HOUSE
You are standing in an open field west of a white house, with a boarded
front door. There is a small mailbox here.

[Score: 0  Moves: 0]

> open mailbox
Opening the small mailbox reveals a leaflet.

> read leaflet
WELCOME TO THE ARCHIVE!
This leaflet explains nothing, which is traditional. A path leads north
toward a dusty library.

> go north
The Reading Room
Dust motes drift through amber light. Shelves tower over you, and a brass
lantern rests on the desk.
-> this arrow starts a line of prose, not a link
:: this also looks like a directive

> take lantern
Taken. The lantern is surprisingly warm.

*** You are carrying a lantern ***

> down
The Lower Stacks
Lantern light sways across leaning shelves. Somewhere below, a page turns
by itself.
`;

test.describe('import transcript', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#status')).toContainText('✓');
  });

  test('a pasted transcript becomes a compiling, playable, mapped story', async ({ page }) => {
    const nativeDialogs = trackNativeDialogs(page);

    await page.locator('#btn-import').click();
    await expect(page.locator('.modal--wide')).toBeVisible();
    await page.locator('.modal__textarea').fill(FIXTURE);
    await page.locator('.modal__button--primary').click();

    // Replacing the story goes through the standard confirm modal.
    await expect(page.locator('.modal__body p').first()).toContainText('imported transcript');
    await page.locator('.modal__button--primary').click();

    // Round-trip acceptance, through the app: compiles with zero issues.
    await expect(page.locator('#status')).toContainText('✓');
    await expect(page.locator('#status')).toContainText('WEST OF HOUSE');
    await expect(page.locator('#status')).toContainText('6 situations');
    await expect(page.locator('#diagnostics')).toContainText('No issues detected');

    const source = await getSource(page);
    expect(source).toContain('title: WEST OF HOUSE');
    expect(source).toContain(':: west-of-house [start]');

    // Playable: walk the transcript's own command path.
    await expect(page.locator('.tp-title')).toHaveText('WEST OF HOUSE');
    await expect(page.locator('.tp-body')).toContainText('open field west of a white house');
    await page.locator('.tp-link', { hasText: 'Open mailbox' }).click();
    await page.locator('.tp-link', { hasText: 'Read leaflet' }).click();
    await page.locator('.tp-link', { hasText: 'Go north' }).click();
    await expect(page.locator('.tp-title')).toHaveText('The Reading Room');
    await expect(page.locator('#status-situation')).toHaveText('@ the-reading-room');

    // Directive-lookalike prose was neutralized, not parsed.
    await expect(page.locator('.tp-body')).toContainText('→ this arrow starts a line of prose');
    await expect(page.locator('.tp-body')).toContainText('∷ this also looks like a directive');

    // Mapped: one room per move, single ending at the last move.
    await expect(page.locator('.map-node')).toHaveCount(6);
    await expect(page.locator('.map-node.is-terminal')).toHaveCount(1);
    await expect(
      page.locator('.map-node.is-terminal[data-situation-id="the-lower-stacks"]'),
    ).toHaveCount(1);

    expect(nativeDialogs()).toBe(0);
  });

  test('ZIL source imports via the file picker as a deconstructed story with a compass map', async ({ page }) => {
    await page.locator('#btn-import').click();
    await page
      .locator('.modal__file input')
      .setInputFiles({ name: 'chapel.zil', mimeType: 'text/plain', buffer: Buffer.from(ZIL_FIXTURE) });
    await expect(page.locator('.modal__textarea')).toHaveValue(/CHAPEL-GARDEN/);
    await page.locator('.modal__button--primary').click();

    await expect(page.locator('.modal__body p').first()).toContainText('imported transcript');
    await page.locator('.modal__button--primary').click();

    await expect(page.locator('#status')).toContainText('✓ Chapel Garden');
    await expect(page.locator('.tp-body')).toContainText('Roses climb the low stone wall');

    await page.locator('.tp-link', { hasText: 'Go north' }).click();
    await expect(page.locator('.tp-body')).toContainText('Candlelight pools beneath the stone arches');

    // The recovered exits lay the map out compass-true: chapel due north.
    const positions = await page.locator('.map-node').evaluateAll((nodes) =>
      nodes.map((node) => ({
        id: node.getAttribute('data-situation-id'),
        x: Number(node.querySelector('rect')?.getAttribute('x')),
        y: Number(node.querySelector('rect')?.getAttribute('y')),
      })),
    );
    const garden = positions.find((p) => p.id === 'chapel-garden')!;
    const chapel = positions.find((p) => p.id === 'old-chapel')!;
    expect(chapel.x).toBe(garden.x);
    expect(chapel.y).toBeLessThan(garden.y);
  });

  test('an empty transcript shows an inline error and keeps the dialog open', async ({ page }) => {
    const nativeDialogs = trackNativeDialogs(page);

    await page.locator('#btn-import').click();
    await page.locator('.modal__textarea').fill('   \n\n  ');
    await page.locator('.modal__button--primary').click();

    await expect(page.locator('.modal__error')).toBeVisible();
    await expect(page.locator('.modal__error')).toHaveText('Transcript contains no content');
    await expect(page.locator('.modal--wide')).toBeVisible();

    await page.locator('.modal__button--plain').click();
    expect(await getSource(page)).toContain('The Dusty Archive');
    expect(nativeDialogs()).toBe(0);
  });

  test('cancelling the import leaves the story untouched', async ({ page }) => {
    await page.locator('#btn-import').click();
    await page.locator('.modal__textarea').fill(FIXTURE);
    await page.keyboard.press('Escape');
    await expect(page.locator('.modal-backdrop')).toHaveCount(0);
    expect(await getSource(page)).toContain('The Dusty Archive');
    await setSource(page, await getSource(page));
    await expect(page.locator('#status')).toContainText('The Dusty Archive');
  });
});
