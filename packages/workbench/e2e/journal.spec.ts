/**
 * Capture/Journal/Tasks (Scene Machinery 1c) — declared tasks, the `capture`
 * effect verb, and the Journal panel: a checklist plus recordings whose
 * content is frozen exactly as it read at capture time (the AMFV recording
 * buffer, generalized).
 */

import { test, expect } from '@playwright/test';
import { setSource } from './helpers';

const FIELD_NOTES = `title: Field Notes

quality courage number = 1 min 0 max 5

task forests "The dying forests"
task raid "The apartment raid"

:: start [start]
The Overlook
Courage {courage}. The forests below are turning grey.

-> Record the forests => start { capture forests, courage += 1 }
-> Walk to the plaza => plaza

:: plaza
The Plaza
Sirens in the distance.

-> Record the raid => plaza { capture raid }
-> Back to the overlook => start
`;

test.describe('journal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#status')).toContainText('✓');
    await setSource(page, FIELD_NOTES);
    await expect(page.locator('#status')).toContainText('✓ Field Notes');
    // Host the journal in panel 3 (swaps diagnostics out).
    await page.locator('#panel-picker-3').selectOption('journal');
  });

  test('declared tasks render as a pending checklist', async ({ page }) => {
    await expect(page.locator('.journal-task')).toHaveCount(2);
    await expect(page.locator('.journal-task[data-task-id="forests"]')).toHaveAttribute(
      'data-task-state',
      'pending',
    );
    await expect(page.locator('.journal-task[data-task-id="forests"]')).toContainText(
      'The dying forests',
    );
  });

  test('capture completes the task and freezes the content as it read', async ({ page }) => {
    await page.locator('.tp-link', { hasText: 'Record the forests' }).click();

    await expect(page.locator('.journal-task[data-task-id="forests"]')).toHaveAttribute(
      'data-task-state',
      'done',
    );
    const entry = page.locator('.journal-entry');
    await expect(entry).toHaveCount(1);
    await expect(entry.locator('.journal-entry__meta')).toContainText('turn 0');
    await expect(entry.locator('.journal-entry__meta')).toContainText('The dying forests');

    // The capture ran before the courage bump: the recording reads Courage 1
    // forever, while the live situation has moved on to Courage 2.
    await expect(entry.locator('.journal-entry__content')).toContainText('Courage 1.');
    await expect(page.locator('.tp-body')).toContainText('Courage 2.');
  });

  test('journal entries link back to their situation in the editor', async ({ page }) => {
    await page.locator('.tp-link', { hasText: 'Walk to the plaza' }).click();
    await page.locator('.tp-link', { hasText: 'Record the raid' }).click();

    await page.locator('.journal-entry').click();
    const source = FIELD_NOTES.split('\n');
    const line = source.findIndex((l) => l.startsWith(':: plaza')) + 1;
    await expect(page.locator('#status-cursor')).toHaveText(new RegExp(`^Ln ${line}, `));
  });

  test('the journal survives recompiles and clears on Restart', async ({ page }) => {
    await page.locator('.tp-link', { hasText: 'Record the forests' }).click();
    await setSource(page, FIELD_NOTES.replace('Sirens in the distance', 'Sirens far away'));
    await page.locator('#panel-picker-3').selectOption('journal');
    await expect(page.locator('.journal-entry')).toHaveCount(1);

    await page.locator('#btn-restart').click();
    await expect(page.locator('.journal-entry')).toHaveCount(0);
    await expect(page.locator('.journal-task[data-task-id="forests"]')).toHaveAttribute(
      'data-task-state',
      'pending',
    );
  });

  test('capture lint: unknown tasks warn, never-captured tasks warn', async ({ page }) => {
    await page.locator('#panel-picker-3').selectOption('diagnostics'); // journal swapped it out
    await setSource(
      page,
      `title: Task Lint

task ghost-scene "Never captured"

:: start [start]
Start
Nothing here.

-> Snap => start { capture phantom }
`,
    );
    await expect(
      page.locator('.diag--warning', { hasText: 'capture references undeclared task "phantom"' }),
    ).toBeVisible();
    await expect(
      page.locator('.diag--warning', { hasText: 'task "ghost-scene" is declared but never captured' }),
    ).toBeVisible();
  });

  test('a parse-failing effects block still counts its captures — no bogus unused-task', async ({ page }) => {
    await page.locator('#panel-picker-3').selectOption('diagnostics'); // journal swapped it out
    await setSource(
      page,
      `title: Broken Capture

task forests "The dying forests"

:: start [start]
Start
Nothing here.

-> Snap => start { capture forests, courage ++ 1 }
`,
    );
    await expect(page.locator('.diag--error', { hasText: '[effect-parse-error]' })).toBeVisible();
    await expect(page.locator('.diag--warning', { hasText: 'never captured' })).toHaveCount(0);
  });
});
