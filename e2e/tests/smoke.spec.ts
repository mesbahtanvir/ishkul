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

    // Filter out known benign errors (e.g., extension-related, auth-related for unauthenticated tests)
    const criticalErrors = consoleErrors.filter(
      (error) =>
        !error.includes('extension') &&
        !error.includes('favicon') &&
        !error.includes('ResizeObserver') &&
        !error.includes('401') &&  // Expected for unauthenticated users
        !error.includes('403') &&  // Expected for unauthenticated users
        !error.includes('Provider') &&  // Auth provider messages
        !error.includes('accounts list is empty') &&  // Expected when not logged in
        !error.includes('GSI_LOGGER') &&  // Google Sign-In logger messages
        !error.includes('FedCM')  // Federated Credential Management errors in automated browsers
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('page has correct title', async ({ page }) => {
    await page.goto('/');

    // Check for app title (includes Login page title from Vercel deployment)
    await expect(page).toHaveTitle(/ishkul|Ishkul|Learning|Login/i);
  });

  test('sign in button is visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for sign in / get started button (React Native Web may not use button role)
    // Try multiple selectors for compatibility
    const signInButton = page.locator('text=/Sign In/i').or(
      page.getByRole('button', { name: /sign in|google|continue|get started/i })
    ).or(
      page.locator('[data-testid*="sign"], [data-testid*="login"]')
    );
    await expect(signInButton.first()).toBeVisible({ timeout: 10000 });
  });
});
