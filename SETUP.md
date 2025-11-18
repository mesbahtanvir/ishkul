# Complete Setup Guide

This guide will walk you through setting up Firebase, Google OAuth, and running the Learning AI app.

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- Google account
- Text editor (VS Code recommended)

---

## Step 1: Install Dependencies

```bash
npm install
```

---

## Step 2: Firebase Setup

### 2.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter project name: `learning-ai-app` (or your choice)
4. Disable Google Analytics (optional)
5. Click **"Create project"**

### 2.2 Enable Authentication

1. In Firebase Console, click **"Authentication"** in the left menu
2. Click **"Get started"**
3. Click **"Sign-in method"** tab
4. Click **"Google"**
5. Toggle **"Enable"**
6. Enter support email
7. Click **"Save"**

### 2.3 Create Firestore Database

1. In Firebase Console, click **"Firestore Database"** in left menu
2. Click **"Create database"**
3. Select **"Start in production mode"** (we'll update rules)
4. Choose a location (closest to your users)
5. Click **"Enable"**

### 2.4 Update Firestore Security Rules

1. Click **"Rules"** tab in Firestore
2. Replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Click **"Publish"**

### 2.5 Get Firebase Config

1. In Firebase Console, click ⚙️ (gear icon) → **"Project settings"**
2. Scroll to **"Your apps"**
3. Click **"Web"** (</> icon)
4. Register app: name it `learning-ai-web`
5. Copy the `firebaseConfig` object

Example:
```javascript
{
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
}
```

---

## Step 3: Google OAuth Setup

### 3.1 Go to Google Cloud Console

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project from the dropdown
3. Go to **"APIs & Services"** → **"Credentials"**

### 3.2 Configure OAuth Consent Screen

1. Click **"OAuth consent screen"** in left menu
2. Select **"External"** (unless you have Google Workspace)
3. Click **"Create"**
4. Fill in required fields:
   - **App name**: Learning AI
   - **User support email**: Your email
   - **Developer contact**: Your email
5. Click **"Save and Continue"**
6. Skip scopes (click **"Save and Continue"**)
7. Add test users (your email)
8. Click **"Save and Continue"**

### 3.3 Create Web OAuth Client ID

1. Go to **"Credentials"** tab
2. Click **"+ Create Credentials"** → **"OAuth client ID"**
3. Application type: **"Web application"**
4. Name: `Learning AI Web`
5. **Authorized JavaScript origins**:
   - `http://localhost:8081`
   - `https://auth.expo.io`
6. **Authorized redirect URIs**:
   - `http://localhost:8081/auth`
   - `https://auth.expo.io/@your-username/learning-ai`
7. Click **"Create"**
8. **Copy the Client ID** (looks like: `123456-abc.apps.googleusercontent.com`)

### 3.4 Create iOS OAuth Client ID

1. Click **"+ Create Credentials"** → **"OAuth client ID"**
2. Application type: **"iOS"**
3. Name: `Learning AI iOS`
4. Bundle ID: `com.yourcompany.learningai` (or from your `app.json`)
5. Click **"Create"**
6. **Copy the iOS Client ID**

### 3.5 Create Android OAuth Client ID

1. Click **"+ Create Credentials"** → **"OAuth client ID"**
2. Application type: **"Android"**
3. Name: `Learning AI Android`
4. Package name: `com.yourcompany.learningai`
5. Get SHA-1 certificate fingerprint:
   ```bash
   # For debug builds:
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```
6. Paste SHA-1 fingerprint
7. Click **"Create"**
8. **Copy the Android Client ID**

---

## Step 4: Environment Variables

1. Create `.env` file in project root:
```bash
cp .env.example .env
```

2. Edit `.env` and fill in your values:

```env
# Firebase (from Step 2.5)
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# Google OAuth (from Step 3)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=123456-abc.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=123456-ios.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=123456-android.apps.googleusercontent.com
```

---

## Step 5: Run the App

### Web (Easiest to test first)

```bash
npm run web
```

Open browser to `http://localhost:8081`

### iOS Simulator (Mac only)

```bash
npm run ios
```

### Android Emulator

```bash
npm run android
```

### Physical Device

1. Install Expo Go app on your phone
2. Run:
```bash
npx expo start
```
3. Scan QR code with:
   - iOS: Camera app
   - Android: Expo Go app

---

## Step 6: Test the Flow

1. **Login Screen** - Click "Continue with Google"
2. **Select Google Account** - Choose your account
3. **Goal Selection** - Enter "Learn Python"
4. **Level Selection** - Choose "Beginner"
5. **Next Step** - Click "Start →"
6. **Lesson** - Read the lesson, click "I Understand →"
7. **Next Step** - New step appears
8. **Quiz** - Answer the question, click "Submit"
9. **Progress** - Check the "Progress" tab
10. **Settings** - View your account info

---

## Troubleshooting

### Google Sign-In Not Working

**Web:**
- Check Web Client ID in `.env`
- Verify redirect URI includes `http://localhost:8081/auth`
- Clear browser cache and try again

**iOS:**
- Verify iOS Client ID in `.env`
- Check Bundle ID matches `app.json`
- May need to run `npx expo prebuild` for native builds

**Android:**
- Verify Android Client ID in `.env`
- SHA-1 fingerprint must match
- Check package name matches

### Firestore Permission Denied

- Verify you're signed in
- Check Firestore rules allow access
- User ID in request must match document ID

### TypeScript Errors

```bash
npm run lint
npx tsc --noEmit
```

### Build Errors

```bash
# Clear everything
rm -rf node_modules
rm -rf .expo
npm install

# Start fresh
npx expo start -c
```

### Environment Variables Not Loading

- Restart Expo dev server after changing `.env`
- Variables must start with `EXPO_PUBLIC_`
- Check for typos in variable names

---

## Next Steps

### Integrate Real LLM

1. Get API key from [OpenAI](https://platform.openai.com/) or [Anthropic](https://www.anthropic.com/)
2. Add to `.env`:
```env
EXPO_PUBLIC_OPENAI_API_KEY=sk-...
```
3. Update `src/services/llmEngine.ts`:
   - Uncomment `getNextStepFromLLM` function
   - Test with real API calls

### Deploy to App Stores

**iOS:**
```bash
npx expo build:ios
```

**Android:**
```bash
npx expo build:android
```

**Web:**
```bash
npx expo export:web
# Deploy to Vercel, Netlify, etc.
```

---

## Need Help?

- [Expo Documentation](https://docs.expo.dev/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [React Navigation Docs](https://reactnavigation.org/)
- [GitHub Issues](https://github.com/your-repo/issues)

---

## Security Checklist

- [ ] `.env` is in `.gitignore` (✅ Already done)
- [ ] Firestore rules are production-ready
- [ ] OAuth redirect URIs are whitelisted
- [ ] API keys are not committed to Git
- [ ] Test users added to OAuth consent screen

---

**You're all set! 🎉**

Run `npm run web` and start building your adaptive learning app!
