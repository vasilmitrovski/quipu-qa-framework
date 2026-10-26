import { defineConfig, devices } from '@playwright/test';
import { config as region } from './config';

const isCI = !!process.env.CI;

export default defineConfig({
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: isCI,
  // The public ParaBank is shared and occasionally slow; retry in CI only, so local runs surface flakiness.
  retries: isCI ? 2 : 0,
  // Parallelism is a property of the target deployment (rate limits), not of the machine running the tests.
  workers: process.env.WORKERS ? Number(process.env.WORKERS) : region.throttling.workers,
  outputDir: `test-results/${region.name}`,
  reporter: [
    ['list'],
    ['html', { outputFolder: `playwright-report/${region.name}`, open: 'never' }],
    ['junit', { outputFile: `reports/${region.name}/junit.xml` }],
  ],
  metadata: { region: region.name, baseUrl: region.baseUrl, locale: region.locale, currency: region.currency },

  use: {
    // Trailing slash so page.goto('overview.htm') resolves under /parabank/.
    baseURL: `${region.baseUrl}/`,
    locale: region.locale,
    timezoneId: region.timezone,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'api',
      testDir: './tests/api',
      // No browser is launched for API tests.
    },
    {
      name: 'web-chromium',
      testDir: './tests/web',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'web-firefox',
      testDir: './tests/web',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
});
