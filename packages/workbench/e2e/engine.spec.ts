/**
 * Core engine behaviors verified through the Play panel: sanitization,
 * clamping, state preservation across recompiles, reset, HUD fallback,
 * adaptive text cycling, and entry effects.
 */

import { test, expect } from '@playwright/test';
import { getSource, setSource, trackNativeDialogs } from './helpers';

test.describe('engine via the Play panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#status')).toContainText('✓');
  });

  test('raw HTML in prose is escaped, never executed', async ({ page }) => {
    const nativeDialogs = trackNativeDialogs(page);
    await setSource(
      page,
      `title: Injection Test

:: start [start]
A Trap
<script>alert(1)</script> and <img src=x onerror="alert(2)"> and Tom & "Huck".
`,
    );
    await expect(page.locator('#status')).toContainText('Injection Test');
    await expect(page.locator('#preview-game script')).toHaveCount(0);
    await expect(page.locator('#preview-game img')).toHaveCount(0);
    await expect(page.locator('.tp-body')).toContainText('<script>alert(1)</script>');
    await expect(page.locator('.tp-body')).toContainText('Tom & "Huck"');
    expect(nativeDialogs()).toBe(0);
  });

  test('rendered content carries the ARIA contract and situation tags as classes', async ({ page }) => {
    await setSource(
      page,
      `title: Aria Test

:: start [start]
Open Field
Prose here.

-> Rest => fin

:: fin [ending]
The End
It ends.
`,
    );
    await expect(page.locator('.tp-content[role="main"][aria-live="polite"]')).toBeVisible();
    await expect(page.locator('.tp-links[aria-label="Choices"]')).toBeVisible();

    await page.locator('.tp-link', { hasText: 'Rest' }).click();
    await expect(page.locator('.tp-content')).toHaveClass(/ending/);
    // A linkless ending renders no nav element at all.
    await expect(page.locator('.tp-links')).toHaveCount(0);
  });

  test('effects clamp to declared min/max in the engine, not just the HUD', async ({ page }) => {
    await setSource(
      page,
      `title: Clamp Test

quality grip number = 3 min 0 max 5

:: start [start]
The Ledge
Grip: {grip}.

-> Slip badly => start { grip -= 10 }
-> Grab hold => start { grip += 10 }
`,
    );
    // Interpolation reads the engine value directly, so this cannot be
    // masked by the HUD's own display clamping.
    await expect(page.locator('.tp-body')).toContainText('Grip: 3.');
    await page.locator('.tp-link', { hasText: 'Slip badly' }).click();
    await expect(page.locator('.tp-body')).toContainText('Grip: 0.');
    await page.locator('.tp-link', { hasText: 'Grab hold' }).click();
    await expect(page.locator('.tp-body')).toContainText('Grip: 5.');
  });

  test('editing the source mid-playthrough keeps the player in place', async ({ page }) => {
    await page.locator('.tp-link', { hasText: 'Take the lantern and descend' }).click();
    await expect(page.locator('.tp-title')).toHaveText('The Lower Stacks');
    const meter = page.locator('.tp-hud__meter[data-quality-id="curiosity"] [role="progressbar"]');
    await expect(meter).toHaveAttribute('aria-valuenow', '2');

    // A cosmetic edit recompiles; the playthrough must survive.
    const edited = (await getSource(page)).replace('card catalogue', 'card catalog');
    await setSource(page, edited);
    await expect(page.locator('.tp-title')).toHaveText('The Lower Stacks');
    await expect(meter).toHaveAttribute('aria-valuenow', '2');
    await expect(page.locator('.tp-hud__badge')).toHaveText('Lantern lit');
    await expect(page.locator('#status-situation')).toHaveText('@ stacks');

    // Reshaping the story so the current room vanishes falls back gracefully.
    await setSource(
      page,
      `title: Rewritten

:: start [start]
A Different Opening
The stacks are gone.
`,
    );
    await expect(page.locator('.tp-title')).toHaveText('A Different Opening');
    await expect(page.locator('#status-situation')).toHaveText('@ start');
  });

  test('Restart returns to the initial situation with default qualities', async ({ page }) => {
    await page.locator('.tp-link', { hasText: 'Take the lantern and descend' }).click();
    const meter = page.locator('.tp-hud__meter[data-quality-id="curiosity"] [role="progressbar"]');
    await expect(meter).toHaveAttribute('aria-valuenow', '2');
    await expect(page.locator('.tp-hud__badge')).toHaveCount(1);

    await page.locator('#btn-restart').click();
    await expect(page.locator('.tp-title')).toHaveText('The Reading Room');
    await expect(meter).toHaveAttribute('aria-valuenow', '1');
    await expect(page.locator('.tp-hud__badge')).toHaveCount(0);
    await expect(page.locator('#status-situation')).toHaveText('@ start');
  });

  test('a story without a HUD falls back to the qualities panel', async ({ page }) => {
    await setSource(
      page,
      `title: Fallback Test

quality coins number = 7

:: start [start]
The Market
Coins jingle in your pocket.

-> Earn a few => start { coins += 3 }
`,
    );
    await expect(page.locator('.tp-hud')).toHaveCount(0);
    const value = page.locator('.tp-quality[data-quality-id="coins"] .tp-quality__value');
    await expect(value).toHaveText('7');
    await page.locator('.tp-link', { hasText: 'Earn a few' }).click();
    await expect(value).toHaveText('10');
    await expect(page.locator('.tp-qualities')).toHaveCount(1);
  });

  test('[oneOf] spans cycle in declaration order and wrap independently', async ({ page }) => {
    await setSource(
      page,
      `title: Cycle Test

:: a [start]
Ping
[oneOf: FIRST | SECOND | THIRD] and [oneOf: alpha | beta].

-> Go => b

:: b
Pong
Rest here.

-> Back => a
`,
    );
    const body = page.locator('.tp-body');
    await expect(body).toContainText('FIRST');
    await expect(body).toContainText('alpha');

    const roundTrip = async (): Promise<void> => {
      await page.locator('.tp-link', { hasText: 'Go' }).click();
      await page.locator('.tp-link', { hasText: 'Back' }).click();
    };

    await roundTrip();
    await expect(body).toContainText('SECOND');
    await expect(body).toContainText('beta');

    await roundTrip();
    await expect(body).toContainText('THIRD');
    await expect(body).toContainText('alpha'); // 2-item span wrapped first

    await roundTrip();
    await expect(body).toContainText('FIRST'); // 3-item span wrapped
    await expect(body).toContainText('beta');
  });

  test('the last matching theme rule wins, and the theme clears above thresholds', async ({ page }) => {
    await setSource(
      page,
      `title: Precedence

quality sanity number = 100 min 0 max 100

hud sanity meter "Sanity"

theme dim when sanity < 70
theme dark when sanity < 40

:: start [start]
The Edge
Your sanity holds at {sanity}.

-> Slip => start { sanity -= 35 }
-> Recover => start { sanity += 35 }
`,
    );
    const preview = page.locator('#preview-game');
    await expect(preview).not.toHaveAttribute('data-theme', /./);

    await page.locator('.tp-link', { hasText: 'Slip' }).click(); // 65: only dim matches
    await expect(preview).toHaveAttribute('data-theme', 'dim');

    await page.locator('.tp-link', { hasText: 'Slip' }).click(); // 30: both match, last wins
    await expect(preview).toHaveAttribute('data-theme', 'dark');

    await page.locator('.tp-link', { hasText: 'Recover' }).click(); // 65: back to dim
    await expect(preview).toHaveAttribute('data-theme', 'dim');

    await page.locator('.tp-link', { hasText: 'Recover' }).click(); // 100: cleared
    await expect(preview).not.toHaveAttribute('data-theme', /./);
  });

  test('HUD readouts render label and live value for string qualities', async ({ page }) => {
    await setSource(
      page,
      `title: Readout Test

quality mood string = calm

hud mood readout "Mood"

:: start [start]
The Room
The mood is {mood}.

-> Stir the air => start { mood = 'restless' }
`,
    );
    const readout = page.locator('.tp-hud__readout[data-quality-id="mood"]');
    await expect(readout.locator('.tp-hud__label')).toHaveText('Mood');
    await expect(readout.locator('.tp-hud__value')).toHaveText('calm');
    await expect(page.locator('.tp-body')).toContainText('The mood is calm');

    await page.locator('.tp-link', { hasText: 'Stir the air' }).click();
    await expect(readout.locator('.tp-hud__value')).toHaveText('restless');
  });

  test('entry effects fire on every arrival', async ({ page }) => {
    await setSource(
      page,
      `title: Entry Test

quality energy number = 10 min 0 max 10

hud energy meter "Energy"

:: start [start]
Base
Energy hums through the floor.

-> Descend => cave

:: cave
The Cave
{ energy -= 3 }
Cold drains you.

-> Return => start
`,
    );
    const meter = page.locator('.tp-hud__meter[data-quality-id="energy"] [role="progressbar"]');
    await expect(meter).toHaveAttribute('aria-valuenow', '10');
    await page.locator('.tp-link', { hasText: 'Descend' }).click();
    await expect(meter).toHaveAttribute('aria-valuenow', '7');
    await page.locator('.tp-link', { hasText: 'Return' }).click();
    await page.locator('.tp-link', { hasText: 'Descend' }).click();
    await expect(meter).toHaveAttribute('aria-valuenow', '4');
  });
});
