# Testing Guide

Comprehensive testing documentation for the Ishkul project.

## Overview

Ishkul uses a multi-layered testing strategy:

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit Tests | Jest, Go testing | Individual functions/components |
| Integration Tests | Jest, Go testing | Component interactions |
| API Functional | Newman/Postman | API endpoint validation |
| API Performance | k6 | Load and stress testing |
| Web E2E | Playwright | Browser automation |
| Mobile E2E | Maestro | Mobile app automation |

## Quick Start

```bash
# Unit tests (existing)
cd frontend && npm test
cd backend && go test ./...

# API tests
newman run tests/postman/ishkul-api.collection.json -e tests/postman/staging.environment.json

# Load tests
k6 run tests/k6/smoke-test.js --env USE_STAGING=true

# Web E2E tests
cd e2e && npm test

# Mobile E2E tests
maestro test .maestro/flows/smoke-test.yaml
```

## Testing Environments

### Local Development
- **Frontend**: `http://localhost:8081`
- **Backend**: `http://localhost:8080`

### Staging
- **Frontend**: `https://ishkul-staging.vercel.app`
- **Backend**: `https://ishkul-backend-staging-*.run.app`

### Production
- Tests should **never** run against production automatically
- Manual validation only after staging passes

## Test Types

### 1. Unit Tests (Existing)

**Frontend** (`frontend/`):
```bash
npm test                 # Run all tests
npm run test:coverage    # With coverage report
npm run test:watch       # Watch mode
```

**Backend** (`backend/`):
```bash
go test ./...           # Run all tests
go test -v -race ./...  # With race detection
go test -cover ./...    # With coverage
```

### 2. API Functional Tests (`tests/postman/`)

Using Postman collections with Newman CLI.

```bash
# Local
newman run tests/postman/ishkul-api.collection.json \
  -e tests/postman/local.environment.json

# Staging with auth
newman run tests/postman/ishkul-api.collection.json \
  -e tests/postman/staging.environment.json \
  --env-var "authToken=$TEST_AUTH_TOKEN"
```

**Test Categories:**
- Health & status endpoints
- Authentication validation
- User profile operations
- Subscription management
- Learning paths
- Error handling
- Security (CORS, rate limiting)

### 3. API Performance Tests (`tests/k6/`)

Using k6 for load and stress testing.

```bash
# Smoke test (quick sanity check)
k6 run tests/k6/smoke-test.js

# Load test (normal traffic simulation)
k6 run tests/k6/api-load-test.js --env USE_STAGING=true

# Stress test (find breaking point)
k6 run tests/k6/stress-test.js --env USE_STAGING=true
```

**Test Types:**
| Test | VUs | Duration | Purpose |
|------|-----|----------|---------|
| Smoke | 1 | 30s | Sanity check |
| Load | 20-50 | 16min | Normal load |
| Stress | 50-150 | 26min | Breaking point |

### 4. Web E2E Tests (`e2e/`)

Using Playwright for browser automation.

```bash
cd e2e

# Install dependencies
npm install
npx playwright install

# Run tests
npm test                    # All browsers
npm run test:chromium       # Chrome only
npm run test:mobile         # Mobile viewports
npm run test:headed         # With visible browser
npm run test:ui             # Interactive UI mode
```

**Test Suites:**
- `smoke.spec.ts` - Basic app functionality
- `auth.spec.ts` - Login/logout flows
- `learning.spec.ts` - Learning features
- `accessibility.spec.ts` - A11y compliance

### 5. Mobile E2E Tests (`.maestro/`)

Using Maestro for mobile app automation.

```bash
# Install Maestro
curl -Ls "https://get.maestro.mobile.dev" | bash

# Run tests
maestro test .maestro/flows/smoke-test.yaml
maestro test .maestro/                        # All flows
maestro test .maestro/ --include-tags=auth    # By tag
```

**Test Flows:**
- `smoke-test.yaml` - App launch verification
- `auth/login-google.yaml` - Google OAuth flow
- `auth/logout.yaml` - Sign out flow
- `learning/view-learning-path.yaml` - Learning navigation
- `learning/complete-quiz.yaml` - Quiz completion

## CI/CD Integration

### Automated Workflows

| Workflow | Trigger | Tests Run |
|----------|---------|-----------|
| `staging-e2e.yml` | Staging deploy, PRs | API smoke, Web E2E, k6 smoke |
| `nightly-tests.yml` | Daily 2 AM UTC | Full load test, all browsers |
| `maestro-mobile-e2e.yml` | Manual | Mobile E2E |

### Required Secrets

Configure in GitHub repository settings:

| Secret | Purpose |
|--------|---------|
| `TEST_AUTH_TOKEN` | JWT for authenticated tests |
| `MAESTRO_CLOUD_API_KEY` | Maestro Cloud (optional) |
| `MAESTRO_PROJECT_ID` | Maestro Cloud project |

### Running Manually

```bash
# Trigger staging E2E
gh workflow run staging-e2e.yml

# Trigger nightly with specific tests
gh workflow run nightly-tests.yml -f test_type=load

# Trigger mobile E2E
gh workflow run maestro-mobile-e2e.yml -f platform=android -f flows=smoke
```

## Test Results

### Artifacts

Test results are uploaded as GitHub Actions artifacts:
- `api-test-results/` - Newman reports
- `playwright-report/` - Playwright HTML report
- `k6-*-results/` - k6 JSON summaries

### Local Results

```
tests/
├── k6/results/              # k6 summaries
├── postman/results/         # Newman reports
e2e/
├── playwright-report/       # HTML report
├── test-results/            # Screenshots, videos
```

## Writing Tests

### API Tests (Newman)

Add requests to `tests/postman/ishkul-api.collection.json`:

```javascript
pm.test('Status is 200', () => {
  pm.response.to.have.status(200);
});

pm.test('Has required fields', () => {
  const json = pm.response.json();
  pm.expect(json).to.have.property('id');
});
```

### Load Tests (k6)

Create new test in `tests/k6/`:

```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  const res = http.get('http://test.k6.io');
  check(res, { 'status is 200': (r) => r.status === 200 });
}
```

### Web E2E (Playwright)

Create new spec in `e2e/tests/`:

```typescript
import { test, expect } from '@playwright/test';

test('feature works', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Button');
  await expect(page.getByText('Result')).toBeVisible();
});
```

### Mobile E2E (Maestro)

Create new flow in `.maestro/flows/`:

```yaml
appId: com.ishkul.app
---
- launchApp
- tapOn: "Button Text"
- assertVisible: "Expected Result"
- takeScreenshot: test-complete
```

## Best Practices

1. **Run smoke tests frequently** - Quick feedback on basic functionality
2. **Run full suites nightly** - Catch regressions before they accumulate
3. **Use realistic test data** - Mirror production patterns
4. **Set appropriate thresholds** - Fail tests on performance regressions
5. **Take screenshots on failure** - Easier debugging
6. **Tag tests appropriately** - Enable selective execution
7. **Keep tests independent** - No shared state between tests
8. **Mock external services** - Avoid flaky third-party dependencies

## Troubleshooting

### Newman fails to connect
- Check `baseUrl` in environment file
- Verify backend is running

### k6 thresholds failing
- Review response times in results
- Consider adjusting thresholds for staging

### Playwright tests timing out
- Increase timeout values
- Check if selectors are correct
- Use `await page.waitForLoadState('networkidle')`

### Maestro can't find elements
- Use regex patterns: `text: "Button|Btn"`
- Increase timeout values
- Check app state before test

## Related Documentation

- [tests/k6/README.md](../tests/k6/README.md) - k6 details
- [tests/postman/README.md](../tests/postman/README.md) - Newman details
- [e2e/README.md](../e2e/README.md) - Playwright details
- [.maestro/README.md](../.maestro/README.md) - Maestro details
