# Quick Start Guide

Get your Expo Firebase app up and running in 5 minutes!

## Prerequisites

- Node.js installed
- Firebase account

## Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the wizard
3. Once created, click on the Web icon (</>) to add a web app
4. Copy the configuration object

### 3. Enable Firebase Services

**Authentication:**
1. Go to Authentication > Sign-in method
2. Enable "Email/Password"
3. Click Save

**Firestore:**
1. Go to Firestore Database
2. Click "Create database"
3. Start in **test mode** for development
4. Choose a location

**Storage:**
1. Go to Storage
2. Click "Get started"
3. Start in **test mode** for development

### 4. Configure Environment Variables

1. Copy the example file:
```bash
cp .env.example .env
```

2. Edit `.env` and paste your Firebase credentials:
```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIza...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123:web:abc123
```

### 5. Start the App

```bash
npm start
```

Then press:
- `w` for web browser
- `i` for iOS simulator (macOS only)
- `a` for Android emulator
- Scan QR code with Expo Go app on your phone

## Test the App

1. Click "Sign Up" to create a new account
2. Enter your details and register
3. Check your email for verification
4. Sign in with your credentials
5. Explore the Home and Profile screens

## Next Steps

- Read the full [README.md](./README.md) for detailed documentation
- Customize the UI components in `src/screens/`
- Add new features using the Firebase services in `src/services/`
- Update Firestore and Storage security rules for production

## Troubleshooting

**"Firebase not initialized"**
- Check your `.env` file has correct values
- Restart the dev server: `npm start -c`

**"Authentication error"**
- Verify Email/Password is enabled in Firebase Console
- Check email format is valid

**App not loading**
- Clear cache: `npm start -- --clear`
- Reinstall dependencies: `rm -rf node_modules && npm install`

Need more help? Check the [README.md](./README.md) or create an issue.
