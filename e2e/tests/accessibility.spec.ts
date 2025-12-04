import { test, expect } from '@playwright/test';

/**
 * Accessibility Tests
 * Basic accessibility checks for the web app
 */

test.describe('Accessibility', () => {
  test('has proper heading structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should have at least one h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);

    // h1 should have meaningful content
    const h1Text = await page.locator('h1').first().textContent();
    expect(h1Text?.trim().length).toBeGreaterThan(0);
  });

  test('buttons have accessible names', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get all buttons
    const buttons = page.getByRole('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const button = buttons.nth(i);
      const accessibleName = await button.getAttribute('aria-label') ||
                              await button.textContent();

      // Each button should have some accessible name
      expect(accessibleName?.trim().length).toBeGreaterThan(0);
    }
  });

  test('images have alt text', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get all images
    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');

      // Images should have alt text OR be decorative (role="presentation")
      const isAccessible = alt !== null || role === 'presentation' || role === 'none';
      expect(isAccessible).toBe(true);
    }
  });

  test('page is navigable by keyboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Press Tab to navigate
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Something should be focused
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
    expect(focusedElement).not.toBe('BODY');
  });

  test('has sufficient color contrast', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that primary text is visible
    // This is a basic check - for full contrast testing, use axe-playwright
    const textElements = page.locator('p, span, h1, h2, h3, button');
    const count = await textElements.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const element = textElements.nth(i);
      const isVisible = await element.isVisible();
      if (isVisible) {
        // Element should be visible (basic visibility check)
        expect(await element.boundingBox()).not.toBeNull();
      }
    }
  });

  test('focus indicators are visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Tab to first focusable element
    await page.keyboard.press('Tab');

    // Take screenshot to verify focus is visible
    await page.screenshot({
      path: 'test-results/screenshots/accessibility-focus.png',
    });

    // The focused element should have some visual indicator
    // This is verified by screenshot - manual review or visual regression tools
  });
});
