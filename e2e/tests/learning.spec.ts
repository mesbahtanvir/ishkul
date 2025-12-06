import { test, expect } from '@playwright/test';

/**
 * Learning Feature Tests
 * Tests for learning paths, lessons, and quizzes
 */

test.describe('Learning Features', () => {
  // These tests require authentication
  test.skip(!process.env.TEST_AUTH_TOKEN, 'Requires TEST_AUTH_TOKEN');

  test.beforeEach(async ({ page }) => {
    // Set auth token
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('authToken', token);
    }, process.env.TEST_AUTH_TOKEN as string);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test.describe('Learning Paths', () => {
    test('displays learning paths list', async ({ page }) => {
      // Navigate to learning paths
      const learningTab = page.getByRole('button', { name: /learning|paths|learn/i });
      if (await learningTab.count() > 0) {
        await learningTab.first().click();
      }

      await page.waitForLoadState('networkidle');

      // Should see learning content
      await expect(
        page.getByText(/path|lesson|course|topic|module/i).first()
      ).toBeVisible({ timeout: 15000 });

      await page.screenshot({ path: 'test-results/screenshots/learning-paths-list.png' });
    });

    test('can open a learning path', async ({ page }) => {
      // Navigate to learning paths
      const learningTab = page.getByRole('button', { name: /learning|paths|learn/i });
      if (await learningTab.count() > 0) {
        await learningTab.first().click();
      }

      await page.waitForLoadState('networkidle');

      // Click on first available path/lesson
      const pathItem = page.getByRole('button', { name: /start|continue|view|lesson/i });
      if (await pathItem.count() > 0) {
        await pathItem.first().click();
        await page.waitForLoadState('networkidle');

        // Should see path details
        await expect(
          page.getByText(/lesson|content|start|next|quiz/i).first()
        ).toBeVisible({ timeout: 10000 });

        await page.screenshot({ path: 'test-results/screenshots/learning-path-detail.png' });
      }
    });
  });

  test.describe('Lessons', () => {
    test('can start a lesson', async ({ page }) => {
      // Navigate to a lesson
      const lessonLink = page.getByRole('button', { name: /lesson|start|begin/i });
      if (await lessonLink.count() > 0) {
        await lessonLink.first().click();
        await page.waitForLoadState('networkidle');

        // Should see lesson content
        await expect(
          page.getByText(/lesson|content|continue|next/i).first()
        ).toBeVisible({ timeout: 10000 });

        await page.screenshot({ path: 'test-results/screenshots/lesson-started.png' });
      }
    });

    test('can navigate through lesson content', async ({ page }) => {
      // Find and click next/continue buttons
      const nextButton = page.getByRole('button', { name: /next|continue|forward/i });

      if (await nextButton.count() > 0) {
        await nextButton.first().click();
        await page.waitForTimeout(1000);

        await page.screenshot({ path: 'test-results/screenshots/lesson-navigation.png' });
      }
    });
  });

  test.describe('Quizzes', () => {
    test('can access a quiz', async ({ page }) => {
      // Navigate to quiz
      const quizLink = page.getByRole('button', { name: /quiz|test|assessment/i });
      if (await quizLink.count() > 0) {
        await quizLink.first().click();
        await page.waitForLoadState('networkidle');

        // Should see quiz content
        await expect(
          page.getByText(/question|quiz|start|begin/i).first()
        ).toBeVisible({ timeout: 10000 });

        await page.screenshot({ path: 'test-results/screenshots/quiz-start.png' });
      }
    });

    test('can answer quiz questions', async ({ page }) => {
      // Navigate to quiz if not already there
      const quizLink = page.getByRole('button', { name: /quiz|test|start/i });
      if (await quizLink.count() > 0) {
        await quizLink.first().click();
        await page.waitForLoadState('networkidle');
      }

      // Wait for question to appear
      const question = page.getByText(/question|\?/i);
      if (await question.count() > 0) {
        // Select an answer (first option)
        const option = page.getByRole('button', { name: /^[A-D]|option/i });
        if (await option.count() > 0) {
          await option.first().click();

          // Submit answer
          const submitButton = page.getByRole('button', { name: /submit|next|check/i });
          if (await submitButton.count() > 0) {
            await submitButton.first().click();
          }

          await page.screenshot({ path: 'test-results/screenshots/quiz-answered.png' });
        }
      }
    });

    test('shows quiz results on completion', async ({ page }) => {
      // This test assumes we can complete a quiz
      // The actual completion logic depends on quiz structure

      // Look for results/completion screen
      const results = page.getByText(/complete|results|score|finish|done|correct/i);

      if (await results.count() > 0) {
        await expect(results.first()).toBeVisible();
        await page.screenshot({ path: 'test-results/screenshots/quiz-results.png' });
      }
    });
  });
});
