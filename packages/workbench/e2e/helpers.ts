/** Shared helpers for the workbench E2E suite. */

import type { Page } from '@playwright/test';

export function getSource(page: Page): Promise<string> {
  return page.evaluate(() => (window as any).__workbench.getSource());
}

export function setSource(page: Page, source: string): Promise<void> {
  return page.evaluate((s) => (window as any).__workbench.setSource(s), source);
}

/** Counts native browser dialogs (banned project-wide); returns a getter. */
export function trackNativeDialogs(page: Page): () => number {
  let count = 0;
  page.on('dialog', (dialog) => {
    count += 1;
    void dialog.dismiss();
  });
  return () => count;
}
