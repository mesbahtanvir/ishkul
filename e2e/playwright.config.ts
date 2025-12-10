import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright Configuration for Ishkul Web E2E Tests
 * @see https://playwright.dev/docs/test-configuration
 *
 * AUTHENTICATION STRATEGY:
 * Google OAuth cannot be automated reliably (Google blocks bots).
 * Instead, we use token injection - see auth.setup.ts for details.
 */

// Path to store authenticated browser state
const authFile = path.join(__dirname, '.auth/user.json');

export default defineConfig({
  testDir: './tests',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use */
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL for navigation */
    baseURL: process.env.STAGING_URL || 'http://localhost:8081',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Always record video */
    video: 'on',
  },

  /* Configure projects for major browsers */
  projects: [
    // Setup project - runs auth.setup.ts to authenticate
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },

    // Desktop browsers - depend on setup for auth state
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use saved auth state from setup
        storageState: authFile,
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: authFile,
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: authFile,
      },
      dependencies: ['setup'],
    },

    // Mobile viewports
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: authFile,
      },
      dependencies: ['setup'],
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
        storageState: authFile,
      },
      dependencies: ['setup'],
    },

    // Unauthenticated tests (for login page, public pages)
    {
      name: 'chromium-unauthenticated',
      testMatch: /smoke\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run local dev server before starting the tests */
  webServer: process.env.CI ? undefined : {
    command: 'cd ../frontend && npm run web',
    url: 'http://localhost:8081',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  /* Global timeout for each test */
  timeout: 30000,

  /* Expect timeout */
  expect: {
    timeout: 10000,
  },
});
