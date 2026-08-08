import { defineConfig } from '@playwright/test';

/**
 * Workbench E2E suite. Traces are always recorded ("trace: 'on'") so every
 * run produces a trace.zip per test — the release QA artifact. Inspect with:
 *   npx playwright show-trace test-results/<test>/trace.zip
 * or browse the HTML report: npx playwright show-report
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5175',
    trace: 'on',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5175',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
