/**
 * The diagnostics pipeline beyond the single error path: warning severity,
 * line-numbered errors jumping the editor, expression-language safety, and
 * the empty state.
 */

import { test, expect } from '@playwright/test';
import { setSource } from './helpers';

test.describe('diagnostics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#status')).toContainText('✓');
  });

  test('orphans and unused qualities warn without blocking play', async ({ page }) => {
    await setSource(
      page,
      `title: Warning Draft

quality spectral number = 0

:: start [start]
The Beginning
Nothing much here yet.

-> Onward => middle

:: middle
Middle
A quiet middle.

:: island
Island
Nobody can reach here.
`,
    );
    await expect(page.locator('#status')).toHaveClass(/status--warning/);
    await expect(page.locator('#status')).toContainText('⚠ Warning Draft');
    await expect(page.locator('#status')).toContainText('warnings');

    await expect(
      page.locator('.diag--warning', { hasText: 'Situation "island" is not reachable' }),
    ).toBeVisible();
    await expect(
      page.locator('.diag--warning', { hasText: 'Quality "spectral" is defined but never used' }),
    ).toBeVisible();
    await expect(page.locator('.diag--error')).toHaveCount(0);

    // Warnings never block: the story still mounts and the map marks the orphan.
    await expect(page.locator('.tp-title')).toHaveText('The Beginning');
    await expect(page.locator('.map-node.is-orphan[data-situation-id="island"]')).toHaveCount(1);
  });

  test('line-numbered diagnostics jump the editor to the offending line', async ({ page }) => {
    await setSource(
      page,
      `title: Bad Expr

quality courage number = 5 min 0 max 10

:: start [start]
The Gate
Courage steels you.

-> Go => start ? courage >>= 6
`,
    );
    const diagnostic = page.locator('.diag--error', { hasText: 'invalid condition' }).first();
    await expect(diagnostic).toBeVisible();

    const text = (await diagnostic.textContent()) ?? '';
    const line = /Line (\d+):/.exec(text)?.[1];
    expect(line).toBeTruthy();

    await diagnostic.click();
    await expect(page.locator('#status-cursor')).toHaveText(new RegExp(`^Ln ${line}, Col \\d+$`));
  });

  test('unknown qualities in conditions warn and stay safely falsy', async ({ page }) => {
    await setSource(
      page,
      `title: Safety Gate

quality courage number = 5 min 0 max 10

:: start [start]
The Gate
Courage steels you.

-> Hidden by unknown => other ? ghost >= 1
-> Shown by inequality => other ? ghost != 5
-> Needs six => other ? courage >= 6
-> Boolean logic => other ? courage < 6 and not ghost
-> Steel yourself => start { courage += 1 }

:: other
Beyond
Arrived.
`,
    );
    await expect(
      page.locator('.diag--warning', { hasText: 'undeclared quality "ghost"' }).first(),
    ).toBeVisible();

    // Unknown quality reads as undefined: comparisons are false except !=.
    await expect(page.locator('.tp-link', { hasText: 'Hidden by unknown' })).toHaveCount(0);
    await expect(page.locator('.tp-link', { hasText: 'Shown by inequality' })).toBeVisible();
    await expect(page.locator('.tp-link', { hasText: 'Needs six' })).toHaveCount(0);
    await expect(page.locator('.tp-link', { hasText: 'Boolean logic' })).toBeVisible();

    // An effect flips the numeric comparisons live.
    await page.locator('.tp-link', { hasText: 'Steel yourself' }).click();
    await expect(page.locator('.tp-link', { hasText: 'Needs six' })).toBeVisible();
    await expect(page.locator('.tp-link', { hasText: 'Boolean logic' })).toHaveCount(0);
  });

  test('type mismatches error on assignment and warn on ordered comparison', async ({ page }) => {
    await setSource(
      page,
      `title: Type Check

quality lantern boolean = false

:: start [start]
The Door
The lantern waits.

-> Force it => start ? lantern >= 1
-> Break it => start { lantern = 5 }
`,
    );
    await expect(
      page.locator('.diag--error', {
        hasText: 'cannot assign number value to boolean quality "lantern"',
      }),
    ).toBeVisible();
    await expect(
      page.locator('.diag--warning', {
        hasText: 'condition compares non-number quality "lantern" with ">="',
      }),
    ).toBeVisible();
    await expect(page.locator('#status')).toContainText('✗');
  });

  test('effect parse errors and unknown-quality references in effects and hud all surface', async ({ page }) => {
    await setSource(
      page,
      `title: Rule Trio

quality courage number = 5 min 0 max 10

hud ghost meter "Ghost"

:: start [start]
The Hall
Courage hums here.

-> Fumble => start { courage + 1 }
-> Haunt => start { ghost += 1 }
`,
    );
    await expect(
      page.locator('.diag--error', { hasText: 'invalid effects "{ courage + 1 }"' }),
    ).toBeVisible();
    await expect(
      page.locator('.diag--warning', { hasText: 'effect references undeclared quality "ghost"' }),
    ).toBeVisible();
    await expect(
      page.locator('.diag--warning', { hasText: 'hud references undeclared quality "ghost"' }),
    ).toBeVisible();
    await expect(page.locator('#status')).toContainText('✗');
  });

  test('preamble directives inside a situation warn instead of silently reading as prose', async ({ page }) => {
    await setSource(
      page,
      `title: Lost Declarations

:: start [start]
world cams "Security Cameras"
The room hums.
world peace felt a room away.
task evidence "The evidence"

-> Look again => start
`,
    );
    // Only full directive shapes flag: two hits, not the prose on line 6.
    await expect(
      page.locator('.diag--warning', { hasText: 'only parses before the first ":: " header' }),
    ).toHaveCount(2);
    await expect(
      page.locator('.diag--warning', { hasText: 'Line 4: "world" only parses' }),
    ).toContainText('reads as the title of situation "start"');
    await expect(
      page.locator('.diag--warning', { hasText: 'Line 7: "task" only parses' }),
    ).toContainText('reads as prose in situation "start"');

    // Warnings never block — the story mounts, swallowed directive and all.
    await expect(page.locator('#status')).toHaveClass(/status--warning/);
    await expect(page.locator('.tp-title')).toHaveText('world cams "Security Cameras"');
  });

  test("a typo'd world prefix warns instead of silently minting a phantom world", async ({ page }) => {
    await setSource(
      page,
      `title: Typo World

world comm "Communications"

:: comm:hub [start]
The Hub
Signals hum.

-> Cross => comn:feed

:: comn:feed
The Feed
Static.

-> Back => comm:hub
`,
    );
    await expect(
      page.locator('.diag--warning', { hasText: 'creates undeclared world "comn"' }),
    ).toBeVisible();
    await expect(page.locator('#status')).toHaveClass(/status--warning/);
  });

  test('blank source shows the empty state, not an error', async ({ page }) => {
    await setSource(page, '');
    await expect(page.locator('#status')).toHaveClass(/status--empty/);
    await expect(page.locator('#status')).toHaveText('Start typing your story');
    await expect(page.locator('#diagnostics')).toContainText(
      'The diagnostics panel reports problems as you type.',
    );
  });
});
