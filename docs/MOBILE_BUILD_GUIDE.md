# Mobile App Build Guide

This guide covers building and deploying the Ishkul mobile app for iOS and Android using Expo Application Services (EAS).

## Prerequisites

### Required Accounts

1. **Expo Account** (Free)
   - Sign up at [expo.dev](https://expo.dev)
   - Required for EAS Build and Submit

2. **Apple Developer Account** ($99/year) - iOS only
   - Sign up at [developer.apple.com](https://developer.apple.com)
   - Required for App Store distribution

3. **Google Play Console** ($25 one-time) - Android only
   - Sign up at [play.google.com/console](https://play.google.com/console)
   - Required for Play Store distribution

### Local Development Setup

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Log in to Expo
eas login

# Navigate to frontend
cd frontend

# Verify configuration
eas build:configure
```

## Build Profiles

We have three build profiles configured in `eas.json`:

| Profile | Purpose | Distribution | Bundle ID Suffix |
|---------|---------|--------------|------------------|
| `development` | Local testing | Internal + Simulator | `.dev` |
| `preview` | Beta testing | Internal (TestFlight/Internal Testing) | `.preview` |
| `production` | App Store release | Store | (none) |

## Building the App

### iOS Builds

```bash
# Development build (simulator)
eas build --platform ios --profile development

# Preview build (TestFlight internal testing)
eas build --platform ios --profile preview

# Production build (App Store)
eas build --platform ios --profile production
```

### Android Builds

```bash
# Development build (APK for testing)
eas build --platform android --profile development

# Preview build (APK for internal testing)
eas build --platform android --profile preview

# Production build (AAB for Play Store)
eas build --platform android --profile production
```

### Build Both Platforms

```bash
eas build --platform all --profile preview
```

## First-Time Setup

### iOS Credentials

When running your first iOS build, EAS will prompt you to set up credentials:

1. **Option 1: Let EAS manage credentials (Recommended)**
   ```bash
   eas credentials
   ```
   - EAS generates and manages certificates automatically
   - Provisioning profiles are created on-demand

2. **Option 2: Use existing credentials**
   - Export from Apple Developer Portal
   - Upload via `eas credentials`

### Android Credentials

For Android, EAS generates a keystore automatically on first build:

```bash
# View/manage credentials
eas credentials --platform android
```

For production, ensure you back up your keystore:
```bash
eas credentials --platform android
# Select "Download credentials"
```

## Submitting to App Stores

### Submit to App Store (iOS)

1. **First-time setup:**
   - Create app in [App Store Connect](https://appstoreconnect.apple.com)
   - Note the App ID (ASC_APP_ID)

2. **Configure secrets** in GitHub or locally:
   ```bash
   # Required environment variables
   APPLE_ID=your@email.com
   ASC_APP_ID=1234567890
   APPLE_TEAM_ID=ABCD1234
   ```

3. **Submit:**
   ```bash
   eas submit --platform ios --latest
   ```

### Submit to Google Play (Android)

1. **First-time setup:**
   - Create app in [Google Play Console](https://play.google.com/console)
   - Create service account with appropriate permissions
   - Download JSON key file

2. **Place service account key:**
   ```bash
   # Save as frontend/google-play-service-account.json
   # Add to .gitignore (already done)
   ```

3. **Submit:**
   ```bash
   eas submit --platform android --latest
   ```

## GitHub Actions CI/CD

### Manual Builds

Trigger builds from GitHub Actions:

1. Go to **Actions** tab
2. Select **iOS Build** or **Android Build**
3. Click **Run workflow**
4. Select build profile
5. Optionally enable submission

### Automatic Builds

Production builds are triggered automatically on version tags:

```bash
git tag v1.0.1
git push origin v1.0.1
```

### Required GitHub Secrets

Add these secrets in **Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `EXPO_TOKEN` | Expo access token from [expo.dev/accounts/settings/access-tokens](https://expo.dev/accounts/settings/access-tokens) |
| `APPLE_ID` | Your Apple ID email |
| `ASC_APP_ID` | App Store Connect App ID |
| `APPLE_TEAM_ID` | Apple Developer Team ID |
| `EXPO_PUBLIC_*` | Firebase and OAuth credentials |

## Local Development

### Run on iOS Simulator

```bash
npm run ios
```

### Run on Android Emulator

```bash
npm run android
```

### Development Client

For native module development, use development builds:

```bash
# Build development client
eas build --platform ios --profile development

# Install on simulator and run
npx expo start --dev-client
```

## Troubleshooting

### Build Fails with Credentials Error

```bash
# Reset and reconfigure credentials
eas credentials --platform ios
# or
eas credentials --platform android
```

### Build Queue is Long

Use `--local` flag for local builds (requires Xcode/Android SDK):

```bash
eas build --platform ios --profile development --local
```

### App Rejected by App Store

Common issues:
- Missing privacy policy URL
- Incorrect screenshot dimensions
- App Tracking Transparency not implemented

Check [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).

### Version Conflicts

If `eas build` fails with version errors:

```bash
# Sync versions
eas build:version:sync
```

## Version Management

Versions are managed automatically:

- `autoIncrement: true` in production profile
- `appVersionSource: "remote"` syncs with EAS

To manually set version:

```bash
# Update app.config.js version
# Then sync to EAS
eas build:version:sync
```

## Useful Commands

```bash
# Check build status
eas build:list

# View build logs
eas build:view

# Cancel a build
eas build:cancel

# Check submission status
eas submit:list
```

## Architecture Notes

### File Structure

```
frontend/
├── app.config.js      # Dynamic Expo config
├── app.json           # Static config (fallback)
├── eas.json           # EAS Build configuration
├── assets/
│   ├── icon.png       # App icon (1024x1024)
│   ├── splash-icon.png # Splash screen
│   └── adaptive-icon.png # Android adaptive icon
└── google-play-service-account.json  # (gitignored)
```

### Environment-Specific Builds

The `app.config.js` uses `APP_ENV` to configure:
- App name suffix (Dev/Preview)
- Bundle identifier suffix
- Associated domains

---

## Quick Reference

| Task | Command |
|------|---------|
| Build iOS preview | `eas build -p ios --profile preview` |
| Build Android preview | `eas build -p android --profile preview` |
| Submit iOS to TestFlight | `eas submit -p ios --latest` |
| Submit Android to Play Store | `eas submit -p android --latest` |
| Check credentials | `eas credentials` |
| View builds | `eas build:list` |

---

**Last Updated**: 2025-12-04 | **EAS CLI Version**: 13.x
