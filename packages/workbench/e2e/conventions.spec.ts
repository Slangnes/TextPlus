/**
 * Project convention guards, enforced through the E2E suite so every release
 * trace.zip carries the proof.
 *
 * 1. No native browser popups anywhere in workbench sources — the app must use
 *    the shared modal utilities (src/modal.ts). Static source scan.
 * 2. Every example in the examples menu compiles with zero errors and zero
 *    warnings, verified through the real app: load it, watch the status bar
 *    and diagnostics panel.
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
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
});
