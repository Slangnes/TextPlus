/**
 * TextPlus Workbench E2E suite.
 *
 * Every test records a Playwright trace (see playwright.config.ts) so releases
 * can be visually verified from trace.zip artifacts — a second QA vector
 * alongside the vitest unit/integration suites.
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const BROKEN_SOURCE = `title: Broken Draft

:: start [start]
Start
This link goes nowhere real.

-> Step into the void => missing-room
`;

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
    await expect(page.locator('#editor')).toHaveValue(/The Dusty Archive/);
    await expect(page.locator('#status')).toContainText('The Dusty Archive');

    for (const panel of ['#panel-0', '#panel-1', '#panel-2', '#panel-3']) {
      await expect(page.locator(panel)).toBeVisible();
    }
    await expect(page.locator('#editor')).toBeVisible();
    await expect(page.locator('.tp-title')).toHaveText('The Reading Room');
    await expect(page.locator('.map-svg')).toBeVisible();
    await expect(page.locator('#diagnostics')).toContainText('No issues detected');
  });

  test('playing the story updates the preview and the map highlight', async ({ page }) => {
    await page.locator('.tp-link', { hasText: 'Take the lantern and descend' }).click();
    await expect(page.locator('.tp-title')).toHaveText('The Lower Stacks');
    await expect(page.locator('.map-node.is-current')).toHaveAttribute('data-situation-id', 'stacks');
  });

  test('clicking a map room jumps the preview there', async ({ page }) => {
    await page.locator('.map-node[data-situation-id="vault"]').click();
    await expect(page.locator('.tp-title')).toHaveText('The Vault of Returns');
    await expect(page.locator('.map-node.is-current')).toHaveAttribute('data-situation-id', 'vault');
  });

  test('broken links surface in diagnostics and click focuses the editor', async ({ page }) => {
    await page.locator('#editor').fill(BROKEN_SOURCE);
    await expect(page.locator('#status')).toContainText('✗');
    const diagnostic = page.locator('.diag--error', { hasText: 'missing-room' }).first();
    await expect(diagnostic).toBeVisible();
    await diagnostic.click();
    await expect(page.locator('#editor')).toBeFocused();
  });

  test('examples load through the in-app modal — never a native popup', async ({ page }) => {
    const nativeDialogs = trackNativeDialogs(page);

    await page.locator('#example-select').selectOption('detective-case');
    await expect(page.locator('.modal')).toBeVisible();
    await page.locator('.modal__button--primary').click();

    await expect(page.locator('#editor')).toHaveValue(/The Detective's Case/);
    await expect(page.locator('#status')).toContainText("The Detective's Case");
    expect(nativeDialogs()).toBe(0);
  });

  test("'don't ask again' suppresses the confirm, settings re-enable it", async ({ page }) => {
    await page.locator('#example-select').selectOption('hello-world');
    await page.locator('.modal__suppress input').check();
    await page.locator('.modal__button--primary').click();
    await expect(page.locator('#editor')).toHaveValue(/Hello World/);

    // Now suppressed: loading another example swaps immediately, no modal.
    await page.locator('#example-select').selectOption('memory-keeper');
    await expect(page.locator('#editor')).toHaveValue(/The Memory Keeper/);
    await expect(page.locator('.modal-backdrop')).toHaveCount(0);

    // Re-enable via the settings dialog.
    await page.locator('#btn-settings').click();
    await page.locator('.modal__setting input').check();
    await page.locator('.modal__button--primary').click();

    await page.locator('#example-select').selectOption('dusty-archive');
    await expect(page.locator('.modal')).toBeVisible();
    await page.locator('.modal__button--plain').click();
    await expect(page.locator('#editor')).toHaveValue(/The Memory Keeper/);
  });

  test('panel layout scales from four segments down to one and back', async ({ page }) => {
    await page.locator('#layout-select').selectOption('2');
    await expect(page.locator('#panel-0')).toBeVisible();
    await expect(page.locator('#panel-1')).toBeVisible();
    await expect(page.locator('#panel-2')).toBeHidden();
    await expect(page.locator('#panel-3')).toBeHidden();

    await page.locator('#layout-select').selectOption('1');
    await expect(page.locator('#editor')).toBeVisible();
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
    await expect(page.locator('#editor')).toBeHidden();
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
    const editor = page.locator('#editor');
    await editor.fill(BROKEN_SOURCE.replace('missing-room', 'start'));
    await expect(page.locator('#status')).toContainText('Broken Draft');
    await page.reload();
    await expect(editor).toHaveValue(/Broken Draft/);
  });
});
