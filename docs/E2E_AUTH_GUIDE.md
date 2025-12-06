# E2E Testing Authentication Guide

How to handle authentication in automated E2E tests.

## Authentication Strategy

For E2E testing, we use a **dedicated test account** with email/password credentials. This account is created specifically for automated testing in the staging environment.

## Setup

### 1. Create Test Account

Create a dedicated test user in your staging environment:
- Email: `e2e-test@yourdomain.com` (or similar)
- Password: Strong, unique password
- Store credentials securely in GitHub Secrets

### 2. Configure GitHub Secrets

Add these secrets to your GitHub repository:

| Secret | Description |
|--------|-------------|
| `TEST_USER_EMAIL` | Email address of the test account |
| `TEST_USER_PASSWORD` | Password for the test account |

### 3. How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  E2E Test Authentication Flow                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CI Workflow                                                │
│       │                                                     │
│       ▼                                                     │
│  POST /api/auth/login                                       │
│  {"email": "test@...", "password": "..."}                  │
│       │                                                     │
│       ▼                                                     │
│  Returns: {"token": "eyJhbG..."}                           │
│       │                                                     │
│       ▼                                                     │
│  Token injected into tests → App is authenticated          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Implementation

### CI/CD Workflows

The workflows automatically:
1. Login with test credentials via `/api/auth/login`
2. Extract the JWT token from the response
3. Pass the token to test runners

### Playwright (Web E2E)

Token is injected into localStorage:

```typescript
// auth.setup.ts
await page.evaluate((token) => {
  localStorage.setItem('authToken', token);
}, process.env.TEST_AUTH_TOKEN);
```

### Newman (API Tests)

Token is passed as environment variable:

```bash
newman run collection.json --env-var "authToken=$TOKEN"
```

## Security Best Practices

1. **Use a dedicated test account** - Never use real user accounts
2. **Staging only** - Test account should only exist in staging
3. **Strong password** - Use a unique, strong password
4. **Store securely** - Use GitHub Secrets, never commit credentials
5. **Limited permissions** - Test account should have minimal necessary permissions
6. **Regular rotation** - Consider rotating the password periodically

## Troubleshooting

### "Invalid credentials" error
- Verify the test account exists in staging
- Check that secrets are correctly set in GitHub

### "Token expired" during long tests
- The login endpoint returns fresh tokens
- Tokens are fetched at the start of each workflow run

### Tests pass locally but fail in CI
- Ensure GitHub Secrets are set correctly
- Check workflow logs for authentication errors

## Local Development

For local testing, you can:

1. Create a `.env.test` file (gitignored):
   ```
   TEST_USER_EMAIL=your-test@email.com
   TEST_USER_PASSWORD=your-test-password
   ```

2. Run tests with credentials:
   ```bash
   source .env.test
   npm test
   ```
