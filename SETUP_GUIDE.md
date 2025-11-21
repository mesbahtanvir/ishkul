# Complete Setup Guide - Learning AI App

This guide provides step-by-step instructions for setting up the entire Learning AI application, including all required services and configurations.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Firebase Console Setup](#firebase-console-setup)
3. [Google Cloud Console Setup](#google-cloud-console-setup)
4. [Local Project Setup](#local-project-setup)
5. [Environment Configuration](#environment-configuration)
6. [Platform-Specific Setup](#platform-specific-setup)
7. [Optional Services](#optional-services)
8. [Verification & Testing](#verification--testing)
9. [Troubleshooting](#troubleshooting)
10. [Deployment](#deployment)

---

## Prerequisites

Before you begin, ensure you have the following installed and ready:

### Required Software

- **Node.js** (v18 or higher)
  ```bash
  node --version  # Should be v18.0.0 or higher
  ```

- **npm** (v8 or higher)
  ```bash
  npm --version  # Should be v8.0.0 or higher
  ```

- **Git**
  ```bash
  git --version
  ```

### Required Accounts

You'll need accounts for the following services (all free tier available):

- [ ] Google Account (for Firebase Console)
- [ ] GitHub Account (optional, for CI/CD)

### Optional Software (for mobile development)

- **Expo Go App** on your mobile device (iOS/Android)
- **iOS Simulator** (macOS only) with Xcode
- **Android Studio** with Android emulator

---

## Firebase Console Setup

Firebase provides authentication and database services for the app. Follow these steps carefully.

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter project details:
   - **Project name:** `learning-ai-app` (or your preferred name)
   - **Enable Google Analytics:** Optional (recommended for production)
4. Click **"Create project"** and wait for initialization

### Step 2: Register Your App

You need to register the app for each platform you plan to support.

#### Register Web App

1. In your Firebase project dashboard, click the **Web icon** (`</>`)
2. Register app:
   - **App nickname:** `Learning AI Web`
   - **Firebase Hosting:** Check this box if you plan to use Firebase Hosting
3. Click **"Register app"**
4. **Copy the Firebase configuration** - you'll need these values later:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "your-app.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-app.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef"
   };
   ```
5. Click **"Continue to console"**

#### Register iOS App (Optional)

1. Click **"Add app"** and select **iOS**
2. Enter details:
   - **iOS bundle ID:** `com.yourcompany.learningai` (must match app.json)
   - **App nickname:** `Learning AI iOS`
3. Download `GoogleService-Info.plist` (you'll need this later)
4. Follow the setup instructions provided

#### Register Android App (Optional)

1. Click **"Add app"** and select **Android**
2. Enter details:
   - **Android package name:** `com.yourcompany.learningai` (must match app.json)
   - **App nickname:** `Learning AI Android`
3. Download `google-services.json` (you'll need this later)
4. Follow the setup instructions provided

### Step 3: Enable Firebase Authentication

1. In the Firebase Console, go to **Build** → **Authentication**
2. Click **"Get started"**
3. Go to the **"Sign-in method"** tab
4. Enable **Google** sign-in provider:
   - Click on **"Google"**
   - Toggle **"Enable"**
   - **Project support email:** Select your email
   - Click **"Save"**

### Step 4: Create Firestore Database

1. In the Firebase Console, go to **Build** → **Firestore Database**
2. Click **"Create database"**
3. Choose starting mode:
   - Select **"Start in production mode"** (we'll add security rules next)
   - Click **"Next"**
4. Choose location:
   - Select a region close to your users (e.g., `us-central1`)
   - Click **"Enable"**
5. Wait for database creation

### Step 5: Configure Firestore Security Rules

1. In Firestore Database, go to the **"Rules"** tab
2. Replace the default rules with the following:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Deny all other access by default
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

3. Click **"Publish"** to deploy the rules
4. **Important:** These rules ensure users can only access their own data

### Step 6: Note Your Firebase Configuration

Keep these values handy - you'll need them for the `.env` file:

- `apiKey`
- `authDomain`
- `projectId`
- `storageBucket`
- `messagingSenderId`
- `appId`

---

## Google Cloud Console Setup

Google Cloud Console is needed for OAuth 2.0 credentials to enable Google Sign-In.

### Step 1: Access Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project from the project dropdown
   - The project should be automatically created when you created your Firebase project
   - Project ID should match your Firebase project ID

### Step 2: Configure OAuth Consent Screen

1. Navigate to **APIs & Services** → **OAuth consent screen**
2. Select **User Type:**
   - **External:** For public apps (most common)
   - **Internal:** Only for Google Workspace organizations
3. Click **"Create"**
4. Fill in the required fields:
   - **App name:** `Learning AI`
   - **User support email:** Your email
   - **App logo:** Optional (upload your app icon)
   - **Application home page:** Your app URL (optional)
   - **Authorized domains:** Add your domain (e.g., `yourapp.com`)
   - **Developer contact email:** Your email
5. Click **"Save and Continue"**
6. **Scopes:** Click "Add or Remove Scopes"
   - Add the following scopes:
     - `openid`
     - `email`
     - `profile`
   - Click **"Update"**
7. Click **"Save and Continue"**
8. **Test users:** Add your email for testing (if using External type)
9. Click **"Save and Continue"**
10. Review and click **"Back to Dashboard"**

### Step 3: Create OAuth 2.0 Credentials

You need to create **three separate OAuth client IDs** for Web, iOS, and Android.

#### Create Web OAuth Client ID

1. Go to **APIs & Services** → **Credentials**
2. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
3. Select **Application type:** `Web application`
4. Configure:
   - **Name:** `Learning AI Web Client`
   - **Authorized JavaScript origins:**
     ```
     http://localhost:8081
     http://localhost:19006
     https://yourapp.vercel.app
     ```
   - **Authorized redirect URIs:**
     ```
     http://localhost:8081
     http://localhost:19006
     https://yourapp.vercel.app
     ```
5. Click **"Create"**
6. **Copy the Client ID** - you'll need this for `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`

#### Create iOS OAuth Client ID

1. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
2. Select **Application type:** `iOS`
3. Configure:
   - **Name:** `Learning AI iOS Client`
   - **Bundle ID:** `com.yourcompany.learningai` (must match your app.json)
4. Click **"Create"**
5. **Copy the Client ID** - you'll need this for `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`

#### Create Android OAuth Client ID

1. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
2. Select **Application type:** `Android`
3. Configure:
   - **Name:** `Learning AI Android Client`
   - **Package name:** `com.yourcompany.learningai` (must match your app.json)
   - **SHA-1 certificate fingerprint:**
     - For development, get it by running:
       ```bash
       keytool -keystore ~/.android/debug.keystore -list -v -alias androiddebugkey
       # Default password is: android
       ```
     - Copy the SHA-1 fingerprint
4. Click **"Create"**
5. **Copy the Client ID** - you'll need this for `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`

### Step 4: Note Your OAuth Client IDs

Keep these three values handy:

- Web Client ID
- iOS Client ID
- Android Client ID

---

## Local Project Setup

Now let's set up the project on your local machine.

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone <your-repo-url>
cd ishkul

# Or if you already have the code, navigate to the directory
cd ishkul
```

### Step 2: Install Dependencies

```bash
# Install all npm packages
npm install

# This will install all dependencies listed in package.json
```

**Expected output:** You should see npm installing packages and completing without errors.

### Step 3: Verify Installation

```bash
# Check if node_modules was created
ls -la node_modules

# Verify Expo CLI is available
npx expo --version
```

---

## Environment Configuration

Create your environment file with all the credentials you've collected.

### Step 1: Copy the Example File

```bash
# Create .env file from the example
cp .env.example .env
```

### Step 2: Edit the .env File

Open `.env` in your text editor and fill in all values:

```env
# ============================================
# FIREBASE CONFIGURATION
# ============================================
# Get these from Firebase Console → Project Settings → General → Your apps → SDK setup and configuration

EXPO_PUBLIC_FIREBASE_API_KEY=AIza...your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# ============================================
# GOOGLE OAUTH CONFIGURATION
# ============================================
# Get these from Google Cloud Console → APIs & Services → Credentials

# Web Client ID (for web platform and OAuth flow)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com

# iOS Client ID (for iOS native app)
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com

# Android Client ID (for Android native app)
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com

# ============================================
# OPTIONAL: LLM API KEYS (for future use)
# ============================================
# Currently the app uses mock data. Add these if you want real LLM integration.

# OpenAI API Key (optional)
# Get from: https://platform.openai.com/api-keys
# EXPO_PUBLIC_OPENAI_API_KEY=sk-...your-openai-key

# Anthropic API Key (optional)
# Get from: https://console.anthropic.com/
# EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...your-anthropic-key
```

### Step 3: Verify Environment Variables

Run this command to check if your environment variables are loaded:

```bash
# This will show you if the .env file is being read
npx expo config --type public
```

### Important Notes

- **NEVER commit `.env` to version control** - it's already in `.gitignore`
- All variables must start with `EXPO_PUBLIC_` to be accessible in Expo
- Keep your API keys secure and never share them publicly
- Create separate `.env.production` for production deployment if needed

---

## Platform-Specific Setup

### Web Development

The easiest platform to get started with.

```bash
# Start the web development server
npm run web

# Or using Expo CLI directly
npx expo start --web
```

**Access the app:**
- Open http://localhost:8081 in your browser
- Or the URL shown in the terminal

**Supported browsers:**
- Chrome (recommended)
- Firefox
- Safari
- Edge

### iOS Development (macOS only)

#### Prerequisites

1. Install **Xcode** from the Mac App Store
2. Install Xcode Command Line Tools:
   ```bash
   xcode-select --install
   ```
3. Install **Expo Go** app on your iOS device from App Store

#### Running on iOS Simulator

```bash
# Start Expo and open iOS simulator
npm run ios

# Or
npx expo start --ios
```

#### Running on Physical iOS Device

1. Install **Expo Go** from the App Store
2. Start the development server:
   ```bash
   npx expo start
   ```
3. Scan the QR code with your iOS camera
4. The app will open in Expo Go

### Android Development

#### Prerequisites

1. Install **Android Studio**
2. Set up an Android Virtual Device (AVD):
   - Open Android Studio → Tools → AVD Manager
   - Create a new virtual device (recommended: Pixel 5, API 33+)
3. Install **Expo Go** app from Google Play Store (for physical device testing)

#### Running on Android Emulator

```bash
# Start Expo and open Android emulator
npm run android

# Or
npx expo start --android
```

#### Running on Physical Android Device

1. Install **Expo Go** from Google Play Store
2. Enable Developer Mode on your device
3. Start the development server:
   ```bash
   npx expo start
   ```
4. Scan the QR code with Expo Go app

### Tablet Support

The app is optimized for tablets (iPad, Android tablets):

- Responsive layouts adapt to larger screens
- Touch-optimized interface
- Works on all screen sizes from 7" to 13"

---

## Optional Services

### Vercel Deployment (Web)

Deploy your web app to Vercel for free hosting.

#### Setup Steps

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   # Build the web app
   npm run build

   # Deploy to Vercel
   vercel
   ```

4. Configure environment variables in Vercel dashboard:
   - Go to your project on vercel.com
   - Settings → Environment Variables
   - Add all variables from your `.env` file

5. Update OAuth settings:
   - Add your Vercel URL to authorized origins in Google Cloud Console
   - Update `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` if needed

### Expo Application Services (EAS) - Mobile Builds

For creating standalone iOS and Android apps.

#### Setup Steps

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```

2. Login to Expo:
   ```bash
   eas login
   ```

3. Configure your project:
   ```bash
   eas build:configure
   ```

4. Build for iOS/Android:
   ```bash
   # Build for iOS
   eas build --platform ios

   # Build for Android
   eas build --platform android

   # Build for both
   eas build --platform all
   ```

5. Submit to app stores:
   ```bash
   # Submit to App Store
   eas submit --platform ios

   # Submit to Google Play
   eas submit --platform android
   ```

### LLM Integration (OpenAI or Anthropic)

Currently, the app uses mock data. To integrate real LLM APIs:

#### OpenAI Setup

1. Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Add to `.env`:
   ```env
   EXPO_PUBLIC_OPENAI_API_KEY=sk-...your-key
   ```
3. Uncomment OpenAI code in `/src/services/llmEngine.ts`
4. Install OpenAI SDK if needed:
   ```bash
   npm install openai
   ```

#### Anthropic Setup

1. Get API key from [Anthropic Console](https://console.anthropic.com/)
2. Add to `.env`:
   ```env
   EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...your-key
   ```
3. Uncomment Anthropic code in `/src/services/llmEngine.ts`
4. Install Anthropic SDK if needed:
   ```bash
   npm install @anthropic-ai/sdk
   ```

### GitHub Actions CI/CD

Already configured in `.github/workflows/ci.yml`. It runs automatically on:

- Push to main/master branches
- Pull requests

**Workflow includes:**
- TypeScript compilation check
- ESLint code quality check
- Web build verification
- Bundle size reporting

---

## Verification & Testing

### Step 1: Start the Development Server

```bash
npm run web
```

**Expected output:**
```
Starting Metro Bundler
Web Bundler is ready
Expo DevTools is running at http://localhost:19002
```

### Step 2: Test Authentication Flow

1. Open the app in your browser
2. Click **"Sign in with Google"**
3. Select your Google account
4. Grant permissions
5. You should be redirected to Goal Selection screen

**Troubleshooting login:**
- Check browser console for errors
- Verify Firebase Authentication is enabled
- Verify OAuth client ID is correct
- Check authorized redirect URIs in Google Cloud Console

### Step 3: Test Firestore Connection

1. Complete goal and level selection
2. Go to Progress screen
3. Complete a lesson or quiz
4. Check Firebase Console → Firestore Database
5. You should see a document created under `users/{your-uid}`

### Step 4: Test All Core Features

- [ ] Google Sign-In works
- [ ] Goal selection saves
- [ ] Level selection saves
- [ ] Lesson content displays
- [ ] Quiz functionality works
- [ ] Practice exercises work
- [ ] Progress tracking updates
- [ ] Settings screen displays user info
- [ ] Sign out works

### Step 5: Run TypeScript Check

```bash
# Check for TypeScript errors
npm run type-check

# Or
npx tsc --noEmit
```

**Expected:** No errors

### Step 6: Run Linter

```bash
# Check code quality
npm run lint

# Auto-fix issues
npm run lint:fix
```

**Expected:** No errors or all auto-fixable

### Step 7: Build for Production

```bash
# Build web app
npm run build
```

**Expected:** Build completes successfully, `dist/` folder is created

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: "Module not found" or "Cannot resolve module"

**Solution:**
```bash
# Clear all caches and reinstall
rm -rf node_modules
rm -rf .expo
rm package-lock.json
npm install

# Clear Metro bundler cache
npx expo start --clear
```

#### Issue: Firebase errors "Firebase App not initialized"

**Solution:**
1. Verify all Firebase environment variables are set in `.env`
2. Restart the development server
3. Check Firebase config in `/src/services/firebase.ts`
4. Ensure `EXPO_PUBLIC_` prefix is present on all variables

#### Issue: Google Sign-In shows "popup_blocked" or "popup_closed_by_user"

**Solution:**
1. Allow popups in your browser for localhost
2. Try using a different browser
3. Check that OAuth client ID is correct
4. Verify authorized origins in Google Cloud Console include your current URL

#### Issue: Google Sign-In works on web but not on mobile

**Solution:**
1. Verify iOS/Android OAuth client IDs are set
2. Check that bundle ID/package name matches `app.json`
3. For Android, verify SHA-1 fingerprint is correct
4. Restart Expo Go app

#### Issue: Firestore permission denied

**Solution:**
1. Check Firestore security rules
2. Verify user is authenticated (check auth state)
3. Ensure document path matches security rules (should be `users/{userId}`)
4. Check Firebase Console → Firestore Database → Rules tab

#### Issue: "Unable to resolve module expo-auth-session"

**Solution:**
```bash
# Install missing dependencies
npx expo install expo-auth-session expo-web-browser expo-crypto

# Restart development server
npx expo start --clear
```

#### Issue: Environment variables not loading

**Solution:**
1. Ensure `.env` file is in project root
2. Verify all variables start with `EXPO_PUBLIC_`
3. Restart the development server (Expo doesn't hot-reload .env changes)
4. Check for syntax errors in `.env` (no spaces around `=`)

#### Issue: TypeScript errors in IDE

**Solution:**
```bash
# Reload TypeScript server in VS Code
# Command Palette (Cmd+Shift+P) → TypeScript: Reload Project

# Or restart the TypeScript server
npm run type-check
```

#### Issue: Build fails with memory error

**Solution:**
```bash
# Increase Node memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Then rebuild
npm run build
```

### Getting Help

If you encounter issues not listed here:

1. Check the existing documentation:
   - `README.md` - Project overview
   - `SETUP.md` - Alternative setup guide
   - `CHECKLIST.md` - Pre-launch verification

2. Check logs:
   ```bash
   # View Metro bundler logs
   npx expo start

   # View web console
   # Open browser DevTools → Console tab
   ```

3. Common resources:
   - [Expo Documentation](https://docs.expo.dev/)
   - [Firebase Documentation](https://firebase.google.com/docs)
   - [React Native Documentation](https://reactnative.dev/docs/getting-started)

---

## Deployment

### Web Deployment

#### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Build and deploy
npm run build
vercel --prod

# Or use the Vercel GitHub integration for automatic deployments
```

**Configure:**
1. Add environment variables in Vercel dashboard
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Update OAuth authorized origins with your Vercel URL

#### Option 2: Firebase Hosting

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize hosting
firebase init hosting

# Build and deploy
npm run build
firebase deploy --only hosting
```

#### Option 3: Static Hosting (Netlify, GitHub Pages, etc.)

```bash
# Build the app
npm run build

# Deploy the 'dist' folder to your hosting provider
```

### Mobile Deployment (iOS & Android)

#### Prerequisites

1. Apple Developer Account ($99/year) for iOS
2. Google Play Console Account ($25 one-time) for Android

#### Using Expo Application Services (EAS)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure builds
eas build:configure

# Build for production
eas build --platform ios --profile production
eas build --platform android --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

#### Pre-deployment Checklist

- [ ] All features tested and working
- [ ] Environment variables configured for production
- [ ] App icons and splash screens updated
- [ ] Privacy policy and terms of service added
- [ ] Analytics configured (if using)
- [ ] Error tracking setup (Sentry, etc.)
- [ ] Security rules reviewed
- [ ] OAuth consent screen verified
- [ ] App Store/Play Store listings prepared

---

## Security Best Practices

### Environment Variables

- Never commit `.env` to version control
- Use different credentials for development and production
- Rotate API keys regularly
- Use environment-specific `.env` files (`.env.development`, `.env.production`)

### Firebase Security

- Review Firestore security rules regularly
- Enable App Check for additional security
- Monitor authentication logs
- Set up billing alerts
- Enable Firebase Security Rules testing

### OAuth Security

- Keep OAuth client secrets secure (for server-side flows)
- Regularly review authorized redirect URIs
- Monitor OAuth consent screen for suspicious activity
- Use HTTPS in production for all redirect URIs

### Code Security

- Keep dependencies updated: `npm audit fix`
- Review security alerts in GitHub
- Use environment variables for all sensitive data
- Never log sensitive information
- Implement rate limiting for API calls

---

## Next Steps

After completing this setup:

1. **Customize the app:**
   - Update app name and branding in `app.json`
   - Replace icons and splash screens in `assets/`
   - Modify color scheme in components

2. **Add real LLM integration:**
   - Choose between OpenAI or Anthropic
   - Implement API calls in `/src/services/llmEngine.ts`
   - Test with real learning content

3. **Enhance features:**
   - Add more learning topics
   - Implement progress analytics
   - Add social features
   - Implement push notifications

4. **Prepare for production:**
   - Complete all items in `CHECKLIST.md`
   - Set up error tracking (Sentry)
   - Configure analytics (Firebase Analytics)
   - Test on multiple devices

5. **Deploy:**
   - Deploy web app to Vercel
   - Build and submit mobile apps to stores
   - Set up continuous deployment

---

## Support and Resources

### Documentation

- **Project Documentation:**
  - `README.md` - Project overview
  - `SETUP.md` - Alternative setup guide
  - `PROJECT_SUMMARY.md` - Technical details
  - `CHECKLIST.md` - Pre-launch checklist

### External Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Google Cloud Documentation](https://cloud.google.com/docs)
- [React Navigation Documentation](https://reactnavigation.org/)

### Community

- [Expo Forums](https://forums.expo.dev/)
- [React Native Community](https://github.com/react-native-community)
- [Firebase Support](https://firebase.google.com/support)

---

## Conclusion

You now have a complete setup of the Learning AI application with:

- ✅ Firebase Authentication (Google Sign-In)
- ✅ Firestore Database for user data
- ✅ Cross-platform support (Web, iOS, Android)
- ✅ Development environment configured
- ✅ Security rules in place
- ✅ Ready for deployment

**Happy coding!** 🚀

---

*Last updated: 2025*
*Version: 1.0.0*
