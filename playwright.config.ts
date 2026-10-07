import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// The repo is served under /words-learning-game/ (Vite base), both in dev and preview.
const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}/words-learning-game/`;

// The container ships Chromium at this path; a Playwright version mismatch would otherwise
// try to download a browser. Fall back to Playwright's own browser elsewhere.
const PRESET_CHROMIUM = '/opt/pw-browsers/chromium';
const launchOptions = existsSync(PRESET_CHROMIUM) ? { executablePath: PRESET_CHROMIUM } : {};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 150_000,
  expect: { timeout: 10_000 },
  outputDir: 'test-results',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions,
  },
  projects: [
    {
      // Primary target: Xiaomi 11 Lite in Chrome, ~393×873 CSS px, touch.
      name: 'phone',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 393, height: 873 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        defaultBrowserType: 'chromium',
      },
    },
    {
      name: 'phone-small',
      testIgnore: /learning\.spec\.ts/,
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 360, height: 800 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        defaultBrowserType: 'chromium',
      },
    },
    {
      name: 'desktop',
      testIgnore: /learning\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    // e2e runs against a production-like preview build with dev tools compiled in.
    command: 'npm run build:e2e && npm run preview -- --port 4173 --strictPort',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
