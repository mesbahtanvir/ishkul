import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth/user.json');

/**
 * Authentication Setup for Playwright Tests
 *
 * INDUSTRY-STANDARD APPROACHES FOR GOOGLE OAUTH:
 *
 * 1. TOKEN INJECTION (Default - used here)
 *    - Inject a pre-generated JWT token into localStorage
 *    - Token is provided via TEST_AUTH_TOKEN environment variable
 *    - Fastest and most reliable for CI/CD
 *
 * 2. SAVED AUTH STATE (Alternative)
 *    - Run `npx playwright codegen --save-storage=auth.json` locally
 *    - Login manually through Google OAuth
 *    - The auth.json file captures cookies and localStorage
 *    - Reuse this state in CI (but tokens expire!)
 *
 * 3. BACKEND TEST ENDPOINT (Recommended for production)
 *    - Create a /auth/test-login endpoint (staging only)
 *    - Generates valid JWT for test users
 *    - Most secure and maintainable
 *
 * 4. SERVICE ACCOUNT (For API tests)
 *    - Use Google Service Account credentials
 *    - Generate tokens programmatically
 *    - Best for backend API testing
 */

setup('authenticate', async ({ page }) => {
  // Strategy 1: Token Injection (Recommended for CI/CD)
  if (process.env.TEST_AUTH_TOKEN) {
    await page.goto('/');

    // Inject the auth token into localStorage
    await page.evaluate((token) => {
      // Match your app's token storage mechanism
      localStorage.setItem('authToken', token);
      localStorage.setItem('isAuthenticated', 'true');

      // If using a more complex auth state, adjust accordingly:
      // localStorage.setItem('user', JSON.stringify({
      //   id: 'test-user-id',
      //   email: 'test@example.com',
      //   name: 'Test User'
      // }));
    }, process.env.TEST_AUTH_TOKEN);

    // Reload to apply auth state
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify authentication worked
    // Adjust this check based on your app's authenticated state indicator
    const isAuthenticated = await page.evaluate(() => {
      return localStorage.getItem('authToken') !== null;
    });

    if (!isAuthenticated) {
      throw new Error('Token injection failed');
    }

    // Save the authenticated state for reuse
    await page.context().storageState({ path: authFile });

    console.log('✅ Authentication successful via token injection');
    return;
  }

  // Strategy 2: Backend Test Endpoint (If available)
  if (process.env.TEST_LOGIN_ENDPOINT) {
    const response = await page.request.post(process.env.TEST_LOGIN_ENDPOINT, {
      data: {
        email: process.env.TEST_EMAIL || 'test@example.com',
        // In staging, this endpoint should auto-authenticate test users
      },
    });

    if (response.ok()) {
      const data = await response.json();
      await page.evaluate((token) => {
        localStorage.setItem('authToken', token);
      }, data.token);

      await page.goto('/');
      await page.context().storageState({ path: authFile });

      console.log('✅ Authentication successful via test endpoint');
      return;
    }
  }

  // Strategy 3: Manual OAuth Flow (Not recommended for CI)
  // This is fragile and will fail in CI due to Google's bot detection
  // Only use for local development with manual intervention
  if (process.env.ALLOW_MANUAL_OAUTH === 'true') {
    console.log('⚠️ Manual OAuth flow - requires human interaction');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click Google sign-in button
    const googleButton = page.getByRole('button', { name: /google|sign in/i });
    await googleButton.first().click();

    // Wait for OAuth popup or redirect
    // This will likely fail in CI due to Google's security measures
    await page.waitForURL('**/accounts.google.com/**', { timeout: 10000 }).catch(() => {
      console.log('OAuth redirect detected');
    });

    // Manual intervention required here in non-headless mode
    // The test will wait for the user to complete OAuth

    // After OAuth completes, save state
    await page.waitForURL('**/', { timeout: 60000 });
    await page.context().storageState({ path: authFile });

    console.log('✅ Authentication successful via manual OAuth');
    return;
  }

  // No authentication method available
  console.log('⚠️ No authentication configured - tests will run unauthenticated');
  console.log('Set TEST_AUTH_TOKEN environment variable for authenticated tests');
});

/**
 * HOW TO GENERATE TEST_AUTH_TOKEN:
 *
 * Option A: Extract from browser (one-time, local development)
 * 1. Login to your app normally in a browser
 * 2. Open DevTools → Application → Local Storage
 * 3. Copy the authToken value
 * 4. Set as TEST_AUTH_TOKEN environment variable
 *
 * Option B: Backend test endpoint (recommended for CI)
 * 1. Create a /auth/test-login endpoint in staging backend
 * 2. This endpoint generates valid JWT for test users
 * 3. Call this endpoint in CI to get fresh tokens
 *
 * Option C: Service account (for API-only tests)
 * 1. Create a Google Cloud Service Account
 * 2. Use it to generate tokens via Google's API
 * 3. This bypasses OAuth UI entirely
 *
 * IMPORTANT: Test tokens should:
 * - Have limited permissions
 * - Be short-lived (1-4 hours)
 * - Only work in staging environment
 * - Never be committed to version control
 */
