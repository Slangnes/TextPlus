/** Shared helpers for the workbench E2E suite. */

import type { Page } from '@playwright/test';

export function getSource(page: Page): Promise<string> {
  return page.evaluate(() => (window as any).__workbench.getSource());
}

export function setSource(page: Page, source: string): Promise<void> {
  return page.evaluate((s) => (window as any).__workbench.setSource(s), source);
}

/** Mini ZIL source used by the deconstruction scenarios (CLI + Import). */
export const ZIL_FIXTURE = `"Chapel area"

<ROOM CHAPEL-GARDEN
      (LOC ROOMS)
      (DESC "Chapel Garden")
      (LDESC "Roses climb the low stone wall. The chapel door stands open to
the north.")
      (NORTH TO OLD-CHAPEL)
      (EAST SORRY "The gate is rusted shut.")>

<ROOM OLD-CHAPEL
      (LOC ROOMS)
      (DESC "Old Chapel")
      (ACTION OLD-CHAPEL-F)
      (SOUTH TO CHAPEL-GARDEN)>

<ROUTINE OLD-CHAPEL-F (RARG)
\t <COND (<EQUAL? .RARG ,M-LOOK>
\t\t<TELL "Candlelight pools beneath the stone arches." CR>)
\t       (<EQUAL? .RARG ,M-ENTER>
\t\t<TELL "A hush falls." CR>)>>
`;

/** Counts native browser dialogs (banned project-wide); returns a getter. */
export function trackNativeDialogs(page: Page): () => number {
  let count = 0;
  page.on('dialog', (dialog) => {
    count += 1;
    void dialog.dismiss();
  });
  return () => count;
}
