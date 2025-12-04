import { test, expect, Page } from '@playwright/test';

/**
 * Authentication Tests
 * Tests for login, logout, and authenticated state
 */

test.describe('Authentication', () => {
  test.describe('Login Page', () => {
    test('displays login options', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Should see Google sign-in option
      const googleButton = page.getByRole('button', { name: /google/i });
      await expect(googleButton.first()).toBeVisible();

      await page.screenshot({ path: 'test-results/screenshots/auth-login-page.png' });
    });

    test('Google sign-in button is clickable', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const googleButton = page.getByRole('button', { name: /google|sign in/i }).first();
      await expect(googleButton).toBeEnabled();

      // Click should trigger OAuth flow (we don't complete it in automated tests)
      // Just verify the button works
      await googleButton.click();

      // Should either redirect to Google or show OAuth popup/modal
      await page.waitForTimeout(1000);

      await page.screenshot({ path: 'test-results/screenshots/auth-google-click.png' });
    });
  });

  test.describe('Authenticated State', () => {
    // These tests require a valid auth token
    // Skip if no test credentials available
    test.skip(!process.env.TEST_AUTH_TOKEN, 'Requires TEST_AUTH_TOKEN');

    test.beforeEach(async ({ page }) => {
      // Set auth token in storage
      await page.goto('/');
      await page.evaluate((token) => {
        localStorage.setItem('authToken', token);
      }, process.env.TEST_AUTH_TOKEN as string);
      await page.reload();
    });

    test('shows user dashboard when authenticated', async ({ page }) => {
      await page.waitForLoadState('networkidle');

      // Should see dashboard/home content
      await expect(
        page.getByText(/learning|path|dashboard|welcome/i).first()
      ).toBeVisible({ timeout: 15000 });

      await page.screenshot({ path: 'test-results/screenshots/auth-dashboard.png' });
    });

    test('can access profile/settings', async ({ page }) => {
      await page.waitForLoadState('networkidle');

      // Find and click profile/settings
      const profileLink = page.getByRole('button', { name: /profile|settings|account/i });
      if (await profileLink.count() > 0) {
        await profileLink.first().click();
        await page.waitForLoadState('networkidle');

        // Should see profile content
        await expect(
          page.getByText(/profile|settings|sign out|logout/i).first()
        ).toBeVisible();

        await page.screenshot({ path: 'test-results/screenshots/auth-profile.png' });
      }
    });

    test('can sign out', async ({ page }) => {
      await page.waitForLoadState('networkidle');

      // Navigate to where sign out is
      const profileLink = page.getByRole('button', { name: /profile|settings|account|menu/i });
      if (await profileLink.count() > 0) {
        await profileLink.first().click();
      }

      // Click sign out
      const signOutButton = page.getByRole('button', { name: /sign out|logout|log out/i });
      if (await signOutButton.count() > 0) {
        await signOutButton.first().click();

        // Handle confirmation if present
        const confirmButton = page.getByRole('button', { name: /yes|confirm|ok/i });
        if (await confirmButton.count() > 0) {
          await confirmButton.first().click();
        }

        // Should be back to login screen
        await expect(
          page.getByRole('button', { name: /sign|google/i }).first()
        ).toBeVisible({ timeout: 10000 });

        await page.screenshot({ path: 'test-results/screenshots/auth-signed-out.png' });
      }
    });
  });
});
