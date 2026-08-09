/**
 * Toolbar flows not covered elsewhere: New (blank template through the confirm
 * modal), Export (source download named from the title), and modal dismissal.
 */

import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { getSource, setSource, trackNativeDialogs } from './helpers';

test.describe('toolbar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#status')).toContainText('✓');
  });

  test('New replaces the story with the blank template through the in-app modal', async ({ page }) => {
    const nativeDialogs = trackNativeDialogs(page);

    // Cancel keeps the story.
    await page.locator('#btn-new').click();
    await expect(page.locator('.modal__title')).toHaveText('Are you sure?');
    await expect(page.locator('.modal__body p')).toHaveText(
      'Replace the current story with a blank template?',
    );
    await page.locator('.modal__button--plain').click();
    expect(await getSource(page)).toContain('The Dusty Archive');

    // Confirm swaps in the blank template, which must compile clean.
    await page.locator('#btn-new').click();
    await page.locator('.modal__button--primary').click();
    await expect(page.locator('#status')).toContainText('✓ Untitled Story');
    await expect(page.locator('#status')).toContainText('2 situations · 0 qualities');
    await expect(page.locator('#diagnostics')).toContainText('No issues detected');
    await expect(page.locator('.tp-title')).toHaveText('An Opening');
    expect(nativeDialogs()).toBe(0);

    // The new draft persists.
    await page.reload();
    await expect(page.locator('#status')).toContainText('Untitled Story');
  });

  test('Export downloads the DSL source named from the title line', async ({ page }) => {
    const first = page.waitForEvent('download');
    await page.locator('#btn-export').click();
    const download = await first;
    expect(download.suggestedFilename()).toBe('the-dusty-archive.tp.txt');
    const path = await download.path();
    expect(readFileSync(path, 'utf8')).toContain('title: The Dusty Archive');

    await setSource(
      page,
      `title: Wild / Name!! 2

:: start [start]
A
B.
`,
    );
    const second = page.waitForEvent('download');
    await page.locator('#btn-export').click();
    expect((await second).suggestedFilename()).toBe('wild-name-2.tp.txt');
  });

  test('Restart says so instead of doing nothing when no story ever compiled', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'textplus-workbench-draft',
        'title: Broken\n\n:: start [start]\nStart\nOops.\n\n-> Go => missing',
      );
    });
    await page.goto('/');
    await expect(page.locator('#status')).toContainText('✗');

    await page.locator('#btn-restart').click();
    await expect(page.locator('#status')).toContainText('Nothing to restart');
  });

  test('Escape and backdrop clicks dismiss the confirm without replacing', async ({ page }) => {
    await page.locator('#btn-new').click();
    await expect(page.locator('.modal')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.modal-backdrop')).toHaveCount(0);
    expect(await getSource(page)).toContain('The Dusty Archive');

    await page.locator('#btn-new').click();
    await page.locator('.modal-backdrop').click({ position: { x: 8, y: 8 } });
    await expect(page.locator('.modal-backdrop')).toHaveCount(0);
    expect(await getSource(page)).toContain('The Dusty Archive');
  });
});
