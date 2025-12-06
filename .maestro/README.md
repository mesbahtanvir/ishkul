# Maestro E2E Testing

Mobile end-to-end testing for the Ishkul React Native/Expo app.

## Prerequisites

Install Maestro:

```bash
# macOS/Linux
curl -Ls "https://get.maestro.mobile.dev" | bash

# Verify installation
maestro --version
```

## Test Structure

```
.maestro/
├── config.yaml              # Global configuration
├── flows/
│   ├── smoke-test.yaml      # Quick sanity check
│   ├── auth/
│   │   ├── login-google.yaml    # Google OAuth flow
│   │   └── logout.yaml          # Sign out flow
│   └── learning/
│       ├── view-learning-path.yaml  # Browse learning content
│       └── complete-quiz.yaml       # Quiz completion flow
└── README.md
```

## Running Tests

### Local Development

```bash
# Run all tests
maestro test .maestro/

# Run specific flow
maestro test .maestro/flows/smoke-test.yaml

# Run with tags
maestro test .maestro/ --include-tags=smoke
maestro test .maestro/ --include-tags=critical
maestro test .maestro/ --include-tags=auth

# Run in studio (interactive mode)
maestro studio
```

### With Expo Development Build

```bash
# Build development client
cd frontend
npx expo run:android  # or npx expo run:ios

# Run Maestro tests
maestro test .maestro/flows/smoke-test.yaml
```

### With Expo EAS Build

```bash
# Build for testing
eas build --profile preview --platform android

# Download and install APK, then run tests
maestro test .maestro/
```

## Environment Variables

Set these in CI or export locally:

```bash
export TEST_EMAIL="test@example.com"
export TEST_PASSWORD="testpassword123"
```

## CI/CD Integration

### GitHub Actions

Tests run automatically via `.github/workflows/staging-e2e.yml`:
- **On staging deploy**: Smoke tests
- **Nightly**: Full E2E suite

### Maestro Cloud (Optional)

For cloud-based testing with real devices:

```bash
maestro cloud \
  --apiKey $MAESTRO_API_KEY \
  --app path/to/app.apk \
  .maestro/
```

## Writing New Tests

### Basic Flow Structure

```yaml
appId: com.ishkul.app
tags:
  - category
---
- launchApp
- tapOn: "Button Text"
- assertVisible: "Expected Text"
- takeScreenshot: screenshot-name
```

### Best Practices

1. **Use regex for flexible matching**: `text: "Button|Btn|Click"`
2. **Add timeouts for async operations**: `timeout: 10000`
3. **Take screenshots at key points** for debugging
4. **Use tags** for organizing test suites
5. **Handle optional elements**: `optional: true`

### Common Commands

| Command | Purpose |
|---------|---------|
| `launchApp` | Start/restart the app |
| `tapOn` | Tap on element |
| `assertVisible` | Verify element exists |
| `assertNotVisible` | Verify element doesn't exist |
| `inputText` | Type text |
| `scroll` | Scroll in direction |
| `takeScreenshot` | Capture screen |
| `extendedWaitUntil` | Wait for condition |

## Troubleshooting

### App not found
Ensure the app is installed and `appId` matches your bundle identifier.

### Tests timing out
Increase `timeout` values or check if the app is loading correctly.

### Flaky tests
- Use `extendedWaitUntil` instead of fixed `sleep`
- Use regex patterns for flexible text matching
- Add `optional: true` for non-critical assertions

## Screenshots

Screenshots are saved during test runs for debugging:
- Location: `.maestro/screenshots/` (local) or test artifacts (CI)
- Naming: `{flow-name}-{screenshot-name}.png`
