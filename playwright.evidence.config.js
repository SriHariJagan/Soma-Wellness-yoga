// ============================================================
// playwright.evidence.config.js
//
// Dedicated config for the full-application E2E evidence run.
// The repo's default playwright.config.js enables video + trace and runs
// fully parallel; on this host that exhausted memory and Playwright killed
// browsers mid-test (reported as "Target page, context or browser has been
// closed" / evaluate timeouts), which produced FALSE failures.
//
// This config keeps the SAME app-under-test and the SAME baseURL, but runs
// serially with video/trace off so every screenshot is real evidence of the
// application rather than of an out-of-resources browser crash.
// ============================================================
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90 * 1000,
  expect: { timeout: 10 * 1000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  reporter: [['line'], ['html', { open: 'never', outputFolder: 'reports/evidence/playwright-report' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 20 * 1000,
    navigationTimeout: 45 * 1000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  ],
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev -- --port 5173 --host 127.0.0.1',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60 * 1000,
  },
});