/**
 * Project convention guards, enforced through the E2E suite.
 *
 * 1. No native browser popups anywhere in workbench sources — the app must use
 *    the shared modal utilities (src/modal.ts). Static source scan (Node
 *    context: its trace records the assertion, not a visual). The runtime
 *    complement is trackNativeDialogs, asserted across the browser specs.
 * 2. Every example in the examples menu compiles with zero errors and zero
 *    warnings, verified through the real app: load it, watch the status bar
 *    and diagnostics panel.
 * 3. The shell stays semantic: one h1, labelled landmarks and live regions,
 *    real dialogs, and panels that name the module they host.
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { setSource } from './helpers';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SRC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const NATIVE_POPUP = /\b(?:window\s*\.\s*)?(?:alert|confirm|prompt)\s*\(/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(full);
    }
    return entry.name.endsWith('.ts') ? [full] : [];
  });
}

async function expectCompiledClean(page: Page): Promise<void> {
  await expect(page.locator('#status')).toContainText('✓');
  await expect(page.locator('#diagnostics')).toContainText('No issues detected');
  await expect(page.locator('.diag--error')).toHaveCount(0);
  await expect(page.locator('.diag--warning')).toHaveCount(0);
}

test.describe('conventions', () => {
  test('workbench sources never call alert/confirm/prompt', async () => {
    const files = sourceFiles(SRC_DIR);
    expect(files.length).toBeGreaterThan(0);

    const offenders = files.flatMap((file) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .map((line, index) => ({ file, line: index + 1, text: line.trim() }))
        .filter(({ text }) => NATIVE_POPUP.test(text)),
    );
    expect(offenders).toEqual([]);
  });

  test('every example in the menu compiles with zero errors and zero warnings', async ({ page }) => {
    await page.goto('/');
    await expectCompiledClean(page);

    const ids = await page
      .locator('#example-select option')
      .evaluateAll((options) =>
        options.map((option) => (option as HTMLOptionElement).value).filter(Boolean),
      );
    expect(ids.length).toBeGreaterThanOrEqual(4);

    // First load confirms via the in-app modal and suppresses later confirms
    // so the loop below swaps examples directly.
    await page.locator('#example-select').selectOption(ids[0]);
    await page.locator('.modal__suppress input').check();
    await page.locator('.modal__button--primary').click();
    await expectCompiledClean(page);

    for (const id of ids.slice(1)) {
      await page.locator('#example-select').selectOption(id);
      await expectCompiledClean(page);
    }
  });

  test('the shell is semantic: landmarks, live regions, and real dialogs', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#status')).toContainText('✓');

    // One heading names the app; the action cluster is a labelled toolbar.
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toContainText('TextPlus');
    await expect(page.locator('header [role="toolbar"]')).toHaveAttribute('aria-label', 'Story actions');

    // The status bar announces compile results; the message feed is a log.
    await expect(page.locator('#status')).toHaveAttribute('role', 'status');
    await expect(page.locator('#preview-messages')).toHaveAttribute('role', 'log');

    // Diagnostics render as a list of findings (a broken link is reported by
    // both the linter and the compiler — two rows, both inside the list).
    await setSource(page, 'title: Broken\n\n:: start [start]\nStart\n\n-> Go => nowhere\n');
    await expect(page.locator('.diag-list li .diag--error')).toHaveCount(2);
    await expect(page.locator('.diag--error')).toHaveCount(2); // none render outside the list

    // Modals are real dialogs, named by their title.
    await page.locator('#btn-import').click();
    const dialog = page.locator('.modal');
    await expect(dialog).toHaveAttribute('role', 'dialog');
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAttribute('aria-label', 'Import Transcript');
    await page.keyboard.press('Escape');
    await expect(page.locator('.modal-backdrop')).toHaveCount(0);
  });

  test('panels advertise the module they host in their accessible name', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#status')).toContainText('✓');
    await expect(page.locator('#panel-0')).toHaveAttribute('aria-label', 'Panel 1 — Editor');
    await expect(page.locator('#panel-3')).toHaveAttribute('aria-label', 'Panel 4 — Diagnostics');

    await page.locator('#panel-picker-3').selectOption('journal');
    await expect(page.locator('#panel-3')).toHaveAttribute('aria-label', 'Panel 4 — Journal');
    await expect(page.locator('#panel-3')).toHaveAttribute('data-module', 'journal');
  });
});
