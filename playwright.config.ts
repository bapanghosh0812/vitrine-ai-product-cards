import { defineConfig, devices, type ReporterDescription } from '@playwright/test';

/**
 * End-to-end tests run against the production build (dist/) served by scripts/serve-dist.ts,
 * which mounts the real Hono API with the deterministic mock AI provider (no keys, no network).
 * Build first: `npm run build`, then `npm run e2e`.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: process.env['CI'] ? 2 : 4,
  timeout: 45_000,
  // On CI, stop cleanly (with a report) before the job's own time limit kills everything.
  globalTimeout: process.env['CI'] ? 15 * 60_000 : 0,
  expect: { timeout: 8_000 },
  reporter: [
    // On CI, failures also become GitHub annotations (visible on the run page without opening logs).
    ...(process.env['CI'] ? [['github'] as ReporterDescription] : []),
    ['list'],
    ['json', { outputFile: 'reports/raw/e2e.json' }],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
  ],
  webServer: {
    command: 'npx tsx scripts/serve-dist.ts',
    url: 'http://localhost:4173/api/health',
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000,
    env: { PORT: '4173' },
  },
});
