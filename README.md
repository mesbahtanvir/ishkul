# Learning AI - Adaptive Learning App

A universal adaptive learning tutor built with Expo, React Native, TypeScript, Firebase, and AI.

## Features

- 🎓 **Adaptive Learning Engine** - AI-powered personalized learning paths
- 🔥 **Firebase Authentication** - Google Sign-In for iOS, Android, and Web
- 💾 **Cloud Sync** - Progress saved to Firestore
- 📱 **Cross-Platform** - Works on iOS, Android, Web, and Tablets
- 🎯 **Goal-Based Learning** - Set custom learning goals
- 📊 **Progress Tracking** - Monitor your learning journey
- 🧠 **Three Learning Modes** - Lessons, Quizzes, and Practice Tasks

## Tech Stack

- **Expo** - React Native framework
- **TypeScript** - Type-safe code
- **Firebase** - Authentication & Firestore
- **Zustand** - State management
- **React Navigation** - Navigation (Tabs + Stack)

## Prerequisites

- Node.js 18+ and npm
- Expo CLI
- Firebase project
- Google OAuth credentials

## Setup Instructions

### 1. Clone and Install

```bash
git clone <repository-url>
cd ishkul
npm install
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Authentication** → **Google Sign-In**
4. Create a **Firestore Database**
5. Copy your Firebase config

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials for:
   - Web application
   - iOS application
   - Android application
3. Copy the client IDs

### 4. Environment Variables

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Fill in your credentials in `.env`:
```env
EXPO_PUBLIC_FIREBASE_API_KEY=your-actual-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123:web:abc123

EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id
```

### 5. Run the App

**Web:**
```bash
npm run web
```

**iOS:**
```bash
npm run ios
```

**Android:**
```bash
npm run android
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Container.tsx
│   └── LoadingScreen.tsx
├── screens/            # App screens
│   ├── LoginScreen.tsx
│   ├── GoalSelectionScreen.tsx
│   ├── LevelSelectionScreen.tsx
│   ├── NextStepScreen.tsx
│   ├── LessonScreen.tsx
│   ├── QuizScreen.tsx
│   ├── PracticeScreen.tsx
│   ├── ProgressScreen.tsx
│   └── SettingsScreen.tsx
├── navigation/         # Navigation setup
│   └── AppNavigator.tsx
├── state/             # Zustand stores
│   ├── userStore.ts
│   └── learningStore.ts
├── services/          # Backend services
│   ├── firebase.ts
│   ├── auth.ts
│   ├── memory.ts
│   └── llmEngine.ts
└── types/            # TypeScript types
    └── app.ts
```

## How It Works

1. **User logs in** with Google
2. **Sets a learning goal** (e.g., "Learn Python")
3. **Chooses skill level** (Beginner/Intermediate/Advanced)
4. **AI engine generates next step**:
   - **Lesson** - Learn new concepts
   - **Quiz** - Test understanding
   - **Practice** - Hands-on tasks
5. **Progress is saved** to Firestore
6. **Repeat** - Adaptive learning continues

## LLM Integration

The app currently uses **mock data** for the learning engine. To integrate a real LLM:

1. Add your API key to `.env`:
```env
EXPO_PUBLIC_OPENAI_API_KEY=sk-...
```

2. Update `src/services/llmEngine.ts`:
   - Uncomment the `getNextStepFromLLM` function
   - Configure your preferred LLM provider (OpenAI, Anthropic, etc.)

## Customization

### Change App Colors

Edit colors in component stylesheets:
- Primary: `#007AFF` (iOS Blue)
- Success: `#34C759` (Green)
- Warning: `#FF9500` (Orange)
- Danger: `#FF3B30` (Red)

### Add More Learning Content

Edit `src/services/llmEngine.ts` → `mockLessons` object to add more lessons, quizzes, and practice tasks.

### Modify Learning Goals

Edit `src/screens/GoalSelectionScreen.tsx` → `EXAMPLE_GOALS` array.

## Troubleshooting

### Google Sign-In Not Working

1. Verify OAuth client IDs are correct
2. Check Firebase Authentication is enabled
3. For iOS: Add URL scheme to `app.json`
4. For Android: Add SHA-1 fingerprint to Firebase

### Firestore Permission Denied

Update Firestore rules:
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

### Build Errors

```bash
# Clear cache
rm -rf node_modules
npm install

# Clear Expo cache
npx expo start -c
```

## Future Enhancements

- [ ] Real LLM integration (OpenAI/Anthropic)
- [ ] Spaced repetition algorithm
- [ ] Daily reminders/notifications
- [ ] Dark mode implementation
- [ ] Offline mode with local storage
- [ ] Social features (leaderboards, sharing)
- [ ] Voice input for quizzes
- [ ] Image/diagram support in lessons

## License

MIT

## Contributing

Pull requests welcome! Please open an issue first to discuss changes.

## Support

For issues or questions, please open a GitHub issue.
