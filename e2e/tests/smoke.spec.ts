import { test, expect } from '@playwright/test';

/**
 * Smoke Tests
 * Quick sanity checks that the web app loads and renders correctly
 */

test.describe('Smoke Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');

    // Wait for the app to hydrate
    await page.waitForLoadState('networkidle');

    // App should render without crashing
    await expect(page.locator('body')).toBeVisible();

    // Take a screenshot for visual verification
    await page.screenshot({ path: 'test-results/screenshots/smoke-homepage.png' });
  });

  test('no console errors on load', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out known benign errors (e.g., extension-related)
    const criticalErrors = consoleErrors.filter(
      (error) =>
        !error.includes('extension') &&
        !error.includes('favicon') &&
        !error.includes('ResizeObserver')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('page has correct title', async ({ page }) => {
    await page.goto('/');

    // Check for app title
    await expect(page).toHaveTitle(/ishkul|Ishkul|Learning/i);
  });

  test('sign in button is visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for sign in / get started button
    const signInButton = page.getByRole('button', { name: /sign|google|continue|get started/i });
    await expect(signInButton.first()).toBeVisible({ timeout: 10000 });
  });
});
