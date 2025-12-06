# Playwright E2E Testing

Web end-to-end testing for the Ishkul Expo web build.

## Prerequisites

```bash
cd e2e
npm install
npx playwright install
```

## Running Tests

### Local Development

```bash
# Run all tests
npm test

# Run with browser visible
npm run test:headed

# Run with UI mode (interactive)
npm run test:ui

# Run specific test file
npm run test:smoke
npm run test:auth
npm run test:learning

# Run on specific browser
npm run test:chromium
npm run test:mobile
```

### Against Staging

```bash
STAGING_URL=https://ishkul-staging.vercel.app npm test
```

### With Authentication

```bash
TEST_AUTH_TOKEN=your_jwt_token npm test
```

## Test Structure

```
e2e/
├── playwright.config.ts    # Configuration
├── package.json            # Dependencies
├── tests/
│   ├── smoke.spec.ts       # Quick sanity checks
│   ├── auth.spec.ts        # Authentication flows
│   ├── learning.spec.ts    # Learning features
│   └── accessibility.spec.ts   # A11y checks
└── test-results/           # Generated reports & screenshots
```

## Test Categories

| Suite | Purpose | Auth Required |
|-------|---------|---------------|
| `smoke` | Basic app functionality | No |
| `auth` | Login/logout flows | Partial |
| `learning` | Learning paths, lessons, quizzes | Yes |
| `accessibility` | A11y compliance | No |

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `STAGING_URL` | Base URL for tests (default: localhost:8081) |
| `TEST_AUTH_TOKEN` | JWT token for authenticated tests |
| `CI` | Set to `true` in CI environments |

### Browser Support

Tests run on:
- **Desktop**: Chromium, Firefox, WebKit (Safari)
- **Mobile**: Pixel 5, iPhone 12 viewports

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Hello')).toBeVisible();
  });
});
```

### Page Object Model (Optional)

For larger test suites, consider creating page objects:

```typescript
// pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}

  async signInWithGoogle() {
    await this.page.getByRole('button', { name: /google/i }).click();
  }
}
```

### Best Practices

1. **Use role-based selectors**: `getByRole('button', { name: /submit/i })`
2. **Wait for network**: `await page.waitForLoadState('networkidle')`
3. **Take screenshots**: `await page.screenshot({ path: 'test.png' })`
4. **Handle flaky elements**: Use `toBeVisible({ timeout: 10000 })`

## Debugging

```bash
# Run with Playwright Inspector
npm run test:debug

# Generate tests with codegen
npm run codegen http://localhost:8081
```

## CI/CD

Tests run automatically via GitHub Actions:
- **On staging deploy**: Smoke + auth tests
- **On PR**: All tests against preview URL

## Reports

After running tests:
```bash
npm run report
```

Opens HTML report in browser showing:
- Test results
- Screenshots on failure
- Video recordings
- Trace viewer
