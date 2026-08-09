/**
 * Turn scheduler (Scene Machinery 1b) — the game clock: every transition is
 * a turn, `every`/`at` directives fire effects and messages on it, entries
 * can be world-scoped (a missed moment stays missed), and wait() lets time
 * pass in place. The generic machinery behind timed worlds (NPC schedules,
 * deadlines, news cycles).
 */

import { test, expect } from '@playwright/test';
import { setSource } from './helpers';

const CLOCKWORK = `title: Clockwork

world lab "The Lab"
world hall "The Hall"

quality turn number = 0
quality pressure number = 0 min 0 max 10

hud turn readout "Turn"
hud pressure meter "Pressure"

every 2 { pressure += 1 }
at 3 say "The intercom crackles: report to the director."
at 2 in hall say "A guard taps your shoulder."

:: lab:bench [start]
The Bench
Vials bubble at turn {turn}.

-> Pace => lab:bench
-> Step into the hall => hall:door

:: hall:door
The Hall Door
Cold air seeps under the frame.

-> Wait by the door => hall:door
-> Back to the bench => lab:bench
`;

async function pace(page: import('@playwright/test').Page, times: number): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await page.locator('.tp-link', { hasText: 'Pace' }).click();
  }
}

test.describe('schedule', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#status')).toContainText('✓');
    await setSource(page, CLOCKWORK);
    await expect(page.locator('#status')).toContainText('✓ Clockwork');
  });

  test('every transition ticks the clock; every-N effects fire on schedule', async ({ page }) => {
    const turnReadout = page.locator('.tp-hud__readout[data-quality-id="turn"] .tp-hud__value');
    const pressure = page.locator('.tp-hud__meter[data-quality-id="pressure"] [role="progressbar"]');
    await expect(page.locator('#status-turn')).toHaveText('⏱ 0');
    await expect(turnReadout).toHaveText('0');
    await expect(page.locator('.tp-body')).toContainText('at turn 0');

    await pace(page, 1);
    await expect(page.locator('#status-turn')).toHaveText('⏱ 1');
    await expect(pressure).toHaveAttribute('aria-valuenow', '0');

    await pace(page, 1); // turn 2: every-2 fires
    await expect(turnReadout).toHaveText('2');
    await expect(pressure).toHaveAttribute('aria-valuenow', '1');
    await expect(page.locator('.tp-body')).toContainText('at turn 2');

    await pace(page, 2); // turn 4: fires again
    await expect(pressure).toHaveAttribute('aria-valuenow', '2');
  });

  test('at-N messages fire exactly once, into the play-panel log', async ({ page }) => {
    await pace(page, 3);
    const intercom = page.locator('.tp-message', { hasText: 'intercom crackles' });
    await expect(intercom).toHaveCount(1);
    await expect(intercom.locator('.tp-message__turn')).toHaveText('turn 3');

    await pace(page, 3); // well past turn 3 — still exactly one
    await expect(intercom).toHaveCount(1);
  });

  test('world-scoped entries fire only when the player is there — missed moments stay missed', async ({ page }) => {
    // In the hall at turn 2: the guard shows up.
    await page.locator('.tp-link', { hasText: 'Step into the hall' }).click(); // turn 1, hall
    await page.locator('.tp-link', { hasText: 'Wait by the door' }).click(); // turn 2, hall
    await expect(page.locator('.tp-message', { hasText: 'guard taps' })).toHaveCount(1);

    // Fresh run staying in the lab through turn 2: no guard, then or ever.
    await setSource(page, CLOCKWORK.replace('Vials bubble', 'Beakers bubble'));
    await page.locator('#btn-restart').click();
    await pace(page, 4);
    await expect(page.locator('.tp-message', { hasText: 'guard taps' })).toHaveCount(0);
  });

  test('wait() lets time pass in place, ticking the schedule', async ({ page }) => {
    await page.evaluate(() => (window as any).__workbench.wait(2));
    await expect(page.locator('#status-turn')).toHaveText('⏱ 2');
    await expect(
      page.locator('.tp-hud__meter[data-quality-id="pressure"] [role="progressbar"]'),
    ).toHaveAttribute('aria-valuenow', '1'); // every-2 fired during the wait
    await expect(page.locator('.tp-title')).toHaveText('The Bench'); // never moved

    await page.evaluate(() => (window as any).__workbench.wait(1));
    await expect(page.locator('.tp-message', { hasText: 'intercom crackles' })).toHaveCount(1);
  });

  test('the clock survives a recompile with the playthrough', async ({ page }) => {
    await pace(page, 2);
    await setSource(page, CLOCKWORK.replace('Vials bubble', 'Flasks bubble'));
    await expect(page.locator('#status-turn')).toHaveText('⏱ 2');
    await expect(page.locator('.tp-body')).toContainText('at turn 2');
  });
});
