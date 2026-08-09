/**
 * TextPlus Workbench E2E suite.
 *
 * Every test records a Playwright trace (see playwright.config.ts). All
 * scenarios in this file are browser-driven, so their traces carry both
 * verification vectors at once: the visual film-strip/DOM snapshots and the
 * code-level log of actions, console, and network.
 *
 * The Monaco editor is driven through the window.__workbench test hook
 * (getSource/setSource) rather than DOM typing, keeping tests fast and exact.
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const BROKEN_SOURCE = `title: Broken Draft

:: start [start]
Start
This link goes nowhere real.

-> Step into the void => missing-room
`;

function getSource(page: Page): Promise<string> {
  return page.evaluate(() => (window as any).__workbench.getSource());
}

function setSource(page: Page, source: string): Promise<void> {
  return page.evaluate((s) => (window as any).__workbench.setSource(s), source);
}

function trackNativeDialogs(page: Page): () => number {
  let count = 0;
  page.on('dialog', (dialog) => {
    count += 1;
    void dialog.dismiss();
  });
  return () => count;
}

test.describe('workbench', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#status')).toContainText('✓');
  });

  test('loads the sample story compiled, with all four panels visible', async ({ page }) => {
    expect(await getSource(page)).toContain('The Dusty Archive');
    await expect(page.locator('#status')).toContainText('The Dusty Archive');

    for (const panel of ['#panel-0', '#panel-1', '#panel-2', '#panel-3']) {
      await expect(page.locator(panel)).toBeVisible();
    }
    await expect(page.locator('.monaco-editor')).toBeVisible();
    await expect(page.locator('.tp-title')).toHaveText('The Reading Room');
    await expect(page.locator('.map-svg')).toBeVisible();
    await expect(page.locator('#diagnostics')).toContainText('No issues detected');
  });

  test('playing the story updates the preview, map highlight, and status bar', async ({ page }) => {
    await page.locator('.tp-link', { hasText: 'Take the lantern and descend' }).click();
    await expect(page.locator('.tp-title')).toHaveText('The Lower Stacks');
    await expect(page.locator('.map-node.is-current')).toHaveAttribute('data-situation-id', 'stacks');
    await expect(page.locator('#status-situation')).toHaveText('@ stacks');
  });

  test('clicking a map room jumps the preview there', async ({ page }) => {
    await page.locator('.map-node[data-situation-id="vault"]').click();
    await expect(page.locator('.tp-title')).toHaveText('The Vault of Returns');
    await expect(page.locator('.map-node.is-current')).toHaveAttribute('data-situation-id', 'vault');
  });

  test('broken links surface in diagnostics and click focuses the editor', async ({ page }) => {
    await setSource(page, BROKEN_SOURCE);
    await expect(page.locator('#status')).toContainText('✗');
    const diagnostic = page.locator('.diag--error', { hasText: 'missing-room' }).first();
    await expect(diagnostic).toBeVisible();
    await diagnostic.click();
    await expect(page.locator('.monaco-editor').first()).toHaveClass(/focused/);
  });

  test('examples load through the in-app modal — never a native popup', async ({ page }) => {
    const nativeDialogs = trackNativeDialogs(page);

    await page.locator('#example-select').selectOption('detective-case');
    await expect(page.locator('.modal')).toBeVisible();
    await page.locator('.modal__button--primary').click();

    await expect(page.locator('#status')).toContainText("The Detective's Case");
    expect(await getSource(page)).toContain("The Detective's Case");
    expect(nativeDialogs()).toBe(0);
  });

  test("'don't ask again' suppresses the confirm, settings re-enable it", async ({ page }) => {
    await page.locator('#example-select').selectOption('hello-world');
    await page.locator('.modal__suppress input').check();
    await page.locator('.modal__button--primary').click();
    await expect(page.locator('#status')).toContainText('Hello World');

    // Now suppressed: loading another example swaps immediately, no modal.
    await page.locator('#example-select').selectOption('memory-keeper');
    await expect(page.locator('#status')).toContainText('The Memory Keeper');
    await expect(page.locator('.modal-backdrop')).toHaveCount(0);

    // Re-enable via the settings dialog.
    await page.locator('#btn-settings').click();
    await page.locator('.modal__setting--confirm input').check();
    await page.locator('.modal__button--primary').click();

    await page.locator('#example-select').selectOption('dusty-archive');
    await expect(page.locator('.modal')).toBeVisible();
    await page.locator('.modal__button--plain').click();
    expect(await getSource(page)).toContain('The Memory Keeper');
  });

  test('panel layout scales from four segments down to one and back', async ({ page }) => {
    await page.locator('#layout-select').selectOption('2');
    await expect(page.locator('#panel-0')).toBeVisible();
    await expect(page.locator('#panel-1')).toBeVisible();
    await expect(page.locator('#panel-2')).toBeHidden();
    await expect(page.locator('#panel-3')).toBeHidden();

    await page.locator('#layout-select').selectOption('1');
    await expect(page.locator('.monaco-editor')).toBeVisible();
    await expect(page.locator('#preview-game')).toBeHidden();

    await page.locator('#layout-select').selectOption('4');
    await expect(page.locator('.map-svg')).toBeVisible();
    await expect(page.locator('#diagnostics')).toBeVisible();
  });

  test('a panel can switch modules, swapping with the panel that held it', async ({ page }) => {
    await page.locator('#layout-select').selectOption('2');
    // Panels now show editor | play. Ask panel 1 to show the map instead.
    await page.locator('#panel-picker-0').selectOption('map');
    await expect(page.locator('#panel-body-0 .map-svg')).toBeVisible();
    // The editor swapped into the map's old (hidden) slot; play stays put.
    await expect(page.locator('#panel-body-1 #preview-game')).toBeVisible();
    await expect(page.locator('.monaco-editor')).toBeHidden();
  });

  test('a panel can host nothing', async ({ page }) => {
    await page.locator('#panel-picker-1').selectOption('none');
    await expect(page.locator('#panel-empty-1')).toBeVisible();
    await expect(page.locator('#preview-game')).toBeHidden();
    // And the module comes back when re-selected.
    await page.locator('#panel-picker-1').selectOption('play');
    await expect(page.locator('#preview-game')).toBeVisible();
  });

  test('panels resize by dragging the splitter and the size persists', async ({ page }) => {
    const before = (await page.locator('#panel-0').boundingBox())!;
    const splitter = (await page.locator('#split-top').boundingBox())!;
    const x = splitter.x + splitter.width / 2;
    const y = splitter.y + splitter.height / 2;

    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 150, y, { steps: 5 });
    await page.mouse.up();

    const after = (await page.locator('#panel-0').boundingBox())!;
    expect(after.width).toBeGreaterThan(before.width + 100);

    await page.reload();
    await expect(page.locator('#status')).toContainText('✓');
    const reloaded = (await page.locator('#panel-0').boundingBox())!;
    expect(Math.abs(reloaded.width - after.width)).toBeLessThan(20);
  });

  test('editor word-wraps by default; settings can turn it off', async ({ page }) => {
    expect(await page.evaluate(() => (window as any).__workbench.wordWrapOn())).toBe(true);
    // Monaco keeps real line numbers even while wrapping.
    await expect(page.locator('.monaco-editor .margin').first()).toBeVisible();

    await page.locator('#btn-settings').click();
    await page.locator('.modal__setting--wrap input').uncheck();
    await page.locator('.modal__button--primary').click();

    expect(await page.evaluate(() => (window as any).__workbench.wordWrapOn())).toBe(false);
  });

  test('3-panel mode can put the large panel on any edge', async ({ page }) => {
    await page.locator('#layout-select').selectOption('3');
    const solo = page.locator('#panel-2');
    const pairPanel = page.locator('#panel-0');

    // Default: solo along the bottom.
    await expect(page.locator('#btn-solo-position')).toBeVisible();
    let soloBox = (await solo.boundingBox())!;
    let pairBox = (await pairPanel.boundingBox())!;
    expect(soloBox.y).toBeGreaterThan(pairBox.y);

    // Cycle: bottom → left.
    await page.locator('#btn-solo-position').click();
    soloBox = (await solo.boundingBox())!;
    pairBox = (await pairPanel.boundingBox())!;
    expect(soloBox.x).toBeLessThan(pairBox.x);

    // Cycle: left → top.
    await page.locator('#btn-solo-position').click();
    soloBox = (await solo.boundingBox())!;
    pairBox = (await pairPanel.boundingBox())!;
    expect(soloBox.y).toBeLessThan(pairBox.y);

    // Cycle: top → right, and it persists across reload.
    await page.locator('#btn-solo-position').click();
    await page.reload();
    await expect(page.locator('#status')).toContainText('✓');
    soloBox = (await page.locator('#panel-2').boundingBox())!;
    pairBox = (await page.locator('#panel-0').boundingBox())!;
    expect(soloBox.x).toBeGreaterThan(pairBox.x);

    // The button hides outside 3-panel mode.
    await page.locator('#layout-select').selectOption('4');
    await expect(page.locator('#btn-solo-position')).toBeHidden();
  });

  test('4-panel mode resizes from the center handle, aligning both columns', async ({ page }) => {
    // Desynchronize the two column splits first via the bottom splitter.
    const bottomSplit = (await page.locator('#split-bottom').boundingBox())!;
    await page.mouse.move(bottomSplit.x + 3, bottomSplit.y + bottomSplit.height / 2);
    await page.mouse.down();
    await page.mouse.move(bottomSplit.x - 120, bottomSplit.y + bottomSplit.height / 2, { steps: 4 });
    await page.mouse.up();

    const handle = page.locator('#center-handle');
    await expect(handle).toBeVisible();
    const box = (await handle.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 120, box.y + 90, { steps: 5 });
    await page.mouse.up();

    const p0 = (await page.locator('#panel-0').boundingBox())!;
    const p2 = (await page.locator('#panel-2').boundingBox())!;
    // Center drag aligns top and bottom columns to the same axis.
    expect(Math.abs(p0.width - p2.width)).toBeLessThan(10);
    expect(p0.height).not.toBe(p2.height);
  });

  test('conditions gate links until effects open them', async ({ page }) => {
    // Teleport straight to the vault via the map — the lantern was never
    // taken, so the gated link must be hidden.
    await page.locator('.map-node[data-situation-id="vault"]').click();
    await expect(page.locator('.tp-title')).toHaveText('The Vault of Returns');
    await expect(page.locator('.tp-link', { hasText: 'Read awhile by lantern light' })).toHaveCount(0);

    // Restart and walk the lantern route: the link effect sets lantern = true.
    await page.locator('#btn-restart').click();
    await page.locator('.tp-link', { hasText: 'Take the lantern and descend' }).click();
    await page.locator('.tp-link', { hasText: 'Follow the sound of turning pages' }).click();
    await expect(page.locator('.tp-title')).toHaveText('The Vault of Returns');
    await expect(page.locator('.tp-link', { hasText: 'Read awhile by lantern light' })).toBeVisible();
  });

  test('adaptive text and interpolation render live values', async ({ page }) => {
    await page.locator('.tp-link', { hasText: 'Take the lantern and descend' }).click();
    await expect(page.locator('.tp-body')).toContainText(
      /(page turns by itself|dark between the shelves breathes|settles with a sound like a sigh)/,
    );
    // curiosity starts at 1; the lantern link's effect raised it to 2.
    await expect(page.locator('.tp-body')).toContainText('Your curiosity stands at 2');
  });

  test('syntax highlighting tokenizes link lines fine-grained', async ({ page }) => {
    const linkLine = page.locator('.view-line', { hasText: '=>' }).first();
    await expect(linkLine).toBeVisible();
    const distinctClasses = await linkLine
      .locator('span span')
      .evaluateAll((spans) => [...new Set(spans.map((span) => span.className))].filter(Boolean));
    expect(distinctClasses.length).toBeGreaterThan(3);
  });

  test('HUD meter tracks effects and the badge appears when earned', async ({ page }) => {
    const meter = page.locator('.tp-hud__meter[data-quality-id="curiosity"] [role="progressbar"]');
    await expect(meter).toHaveAttribute('aria-valuenow', '1');
    await expect(page.locator('.tp-hud__badge')).toHaveCount(0);

    // The lantern link's effects: lantern = true, curiosity += 1.
    await page.locator('.tp-link', { hasText: 'Take the lantern and descend' }).click();
    await expect(meter).toHaveAttribute('aria-valuenow', '2');
    await expect(page.locator('.tp-hud__badge')).toHaveText('Lantern lit');
  });

  test('theme rules re-skin the preview when state crosses the threshold', async ({ page }) => {
    await setSource(
      page,
      `title: Theme Test

quality sanity number = 100 min 0 max 100

hud sanity meter "Sanity"
theme dark when sanity < 50

:: start [start]
The Edge
Your sanity holds, for now.

-> Stare into the void => start { sanity -= 60 }
`,
    );
    await expect(page.locator('#status')).toContainText('Theme Test');
    await expect(page.locator('#preview-game')).not.toHaveAttribute('data-theme', 'dark');

    await page.locator('.tp-link', { hasText: 'Stare into the void' }).click();
    await expect(page.locator('#preview-game')).toHaveAttribute('data-theme', 'dark');
  });

  test('status bar reports cursor position', async ({ page }) => {
    await page.locator('.monaco-editor .view-lines').click();
    await expect(page.locator('#status-cursor')).toHaveText(/Ln \d+, Col \d+/);
  });

  test('layout choices survive a reload', async ({ page }) => {
    await page.locator('#layout-select').selectOption('3');
    await page.reload();
    await expect(page.locator('#status')).toContainText('✓');
    await expect(page.locator('#layout-select')).toHaveValue('3');
    await expect(page.locator('#panel-2')).toBeVisible();
    await expect(page.locator('#panel-3')).toBeHidden();
  });

  test('draft edits survive a reload', async ({ page }) => {
    await setSource(page, BROKEN_SOURCE.replace('missing-room', 'start'));
    await expect(page.locator('#status')).toContainText('Broken Draft');
    await page.reload();
    await expect(page.locator('#status')).toContainText('Broken Draft');
    expect(await getSource(page)).toContain('Broken Draft');
  });
});
