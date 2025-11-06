# Expo Firebase App

A cross-platform mobile and web application built with Expo (React Native) and Firebase. This template provides a solid foundation for building scalable applications with authentication, database, and storage capabilities.

## Features

- **Cross-Platform**: Single codebase for iOS, Android, and Web
- **Firebase Authentication**: Email/password authentication with email verification
- **Firestore Database**: NoSQL cloud database for storing and syncing data
- **Cloud Storage**: File upload and download capabilities
- **React Navigation**: Navigation between screens with stack navigators
- **TypeScript**: Full TypeScript support for type safety
- **React Native Paper**: Material Design UI components
- **Form Validation**: Built-in form validation for authentication screens

## Tech Stack

- [Expo](https://expo.dev/) - React Native framework
- [Firebase](https://firebase.google.com/) - Backend as a Service (BaaS)
- [React Navigation](https://reactnavigation.org/) - Routing and navigation
- [React Native Paper](https://reactnativepaper.com/) - Material Design components
- [TypeScript](https://www.typescriptlang.org/) - Type safety

## Project Structure

```
expo-firebase-app/
├── src/
│   ├── components/      # Reusable UI components
│   ├── screens/         # Screen components
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── ForgotPasswordScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   └── ProfileScreen.tsx
│   ├── navigation/      # Navigation configuration
│   │   ├── RootNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   └── AppNavigator.tsx
│   ├── services/        # Firebase service layer
│   │   ├── authService.ts
│   │   ├── firestoreService.ts
│   │   └── storageService.ts
│   ├── hooks/           # Custom React hooks
│   │   └── useAuth.ts
│   ├── types/           # TypeScript type definitions
│   ├── config/          # App configuration
│   │   └── firebase.ts
│   └── utils/           # Utility functions
├── App.tsx              # Main application component
├── package.json
└── tsconfig.json
```

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v16 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (optional, but recommended)
- A Firebase account and project

## Getting Started

### 1. Clone the Repository

```bash
# If this is in a git repository
git clone <repository-url>
cd expo-firebase-app
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Set Up Firebase

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Enable the following services:
   - **Authentication**: Enable Email/Password sign-in method
   - **Firestore Database**: Create a database (start in test mode for development)
   - **Storage**: Set up Cloud Storage

4. Get your Firebase configuration:
   - Go to Project Settings > General
   - Scroll down to "Your apps"
   - Click on the Web icon (</>) to create a web app
   - Copy the Firebase configuration object

### 4. Configure Environment Variables

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Open `.env` and fill in your Firebase credentials:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key-here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### 5. Run the Application

```bash
# Start the Expo development server
npm start

# Run on specific platform
npm run android  # Android
npm run ios      # iOS (macOS only)
npm run web      # Web browser
```

## Firebase Setup Details

### Authentication

The app uses Firebase Authentication with email/password sign-in. Email verification is automatically sent upon registration.

### Firestore Database

User profiles are stored in Firestore under the `users` collection with the following structure:

```typescript
{
  userId: string;
  email: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Firestore Security Rules** (recommended for production):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own profile
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Cloud Storage

Files are stored with the following path structure:
- User profiles: `users/{userId}/profile.jpg`
- User files: `files/{userId}/{timestamp}_{filename}`

**Storage Security Rules** (recommended for production):

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS simulator (macOS only)
- `npm run web` - Run in web browser

## Key Features Walkthrough

### Authentication Flow

1. **Login**: Users can sign in with email and password
2. **Register**: New users can create an account with email verification
3. **Password Reset**: Users can request a password reset email
4. **Auto-navigation**: Authenticated users are automatically redirected to the app

### Navigation Structure

- **Auth Stack**: Login → Register → Forgot Password
- **App Stack**: Home → Profile
- **Root Navigator**: Switches between Auth and App stacks based on authentication state

### Services

#### AuthService (`src/services/authService.ts`)

- `register(data)` - Register new user
- `login(credentials)` - Sign in user
- `logout()` - Sign out user
- `resetPassword(email)` - Send password reset email
- `getCurrentUser()` - Get current user
- `onAuthStateChange(callback)` - Subscribe to auth state changes

#### FirestoreService (`src/services/firestoreService.ts`)

- `create(collection, data)` - Create document
- `get(collection, id)` - Get document by ID
- `getAll(collection, constraints)` - Query documents
- `update(collection, id, data)` - Update document
- `delete(collection, id)` - Delete document
- `createUserProfile(userId, data)` - Create user profile
- `getUserProfile(userId)` - Get user profile

#### StorageService (`src/services/storageService.ts`)

- `uploadFile(file, path)` - Upload file
- `uploadFileWithProgress(file, path, onProgress)` - Upload with progress tracking
- `getFileURL(path)` - Get download URL
- `deleteFile(path)` - Delete file
- `uploadProfileImage(userId, file)` - Upload user profile image

## Customization

### Changing App Theme

Edit the theme in `App.tsx` using React Native Paper's theming:

```typescript
import { DefaultTheme, PaperProvider } from 'react-native-paper';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#6200ee',
    secondary: '#03dac4',
    // Add more custom colors
  },
};

<PaperProvider theme={theme}>
  {/* Your app */}
</PaperProvider>
```

### Adding New Screens

1. Create screen component in `src/screens/`
2. Add screen to appropriate navigator
3. Update TypeScript types in `src/types/`

### Adding New Firebase Collections

Use the `firestoreService` to interact with new collections:

```typescript
import { firestoreService } from '../services';

// Create document
await firestoreService.create('myCollection', { name: 'Example' });

// Get document
const doc = await firestoreService.get('myCollection', 'documentId');

// Query documents
const docs = await firestoreService.getAll('myCollection', [
  firestoreService.createQuery.where('status', '==', 'active'),
  firestoreService.createQuery.orderBy('createdAt', 'desc'),
  firestoreService.createQuery.limit(10),
]);
```

## Troubleshooting

### Common Issues

1. **Firebase not initializing**
   - Ensure your `.env` file has correct Firebase credentials
   - Restart the Expo development server

2. **Authentication errors**
   - Check that Email/Password authentication is enabled in Firebase Console
   - Verify email format is correct

3. **Navigation not working**
   - Ensure all screen imports are correct
   - Check that navigation prop is passed correctly

4. **Expo app not starting**
   - Clear cache: `expo start -c`
   - Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`

## Building for Production

### Android

```bash
# Build APK
eas build --platform android

# Build AAB for Play Store
eas build --platform android --profile production
```

### iOS

```bash
# Build for App Store
eas build --platform ios --profile production
```

### Web

```bash
# Build web version
expo build:web

# The output will be in the web-build directory
```

## Security Considerations

1. **Never commit `.env` file** - Keep Firebase credentials secret
2. **Set up proper Firestore security rules** - Restrict access to user data
3. **Set up proper Storage security rules** - Control file access
4. **Enable App Check** - Protect your Firebase resources from abuse
5. **Implement rate limiting** - Prevent brute force attacks on authentication

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [React Navigation Documentation](https://reactnavigation.org/docs/getting-started)
- [React Native Paper Documentation](https://reactnativepaper.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Create an issue in the repository
- Check existing issues for solutions
- Read the documentation

---

**Happy Coding!** 🚀
