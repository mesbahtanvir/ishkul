# Development Setup Guide

This guide covers environment setup, local development configuration, and initial project setup.

## Prerequisites

- Node.js 18+ (frontend)
- Go 1.24+ (backend)
- Google Cloud SDK (gcloud CLI)
- Firebase CLI
- Docker (optional, for local backend testing)

## Frontend Setup

### 1. Environment Variables

Create `frontend/.env.local`:

```bash
cd frontend
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id

# Google OAuth Client IDs
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com

# Backend API URL
# Local development: http://localhost:8080/api
# Production: https://ishkul-backend-1086267507068.northamerica-northeast1.run.app/api
EXPO_PUBLIC_API_URL=http://localhost:8080/api
```

### 2. Install Dependencies

```bash
cd frontend
npm install
```

### 3. Start Development Server

```bash
npm start
# Press 'w' for web, 'i' for iOS, 'a' for Android
```

After changing environment variables, restart with:

```bash
npx expo start -c
```

### 4. Available Commands

```bash
npm start            # Start Expo dev server
npm run web          # Run on web browser
npm run ios          # Run on iOS simulator
npm run android      # Run on Android emulator
npm run build        # Build for web
npm run type-check   # TypeScript type checking
npm run lint         # ESLint
npm test             # Run Jest tests
```

## Backend Setup

### 1. Environment Variables

Create `backend/.env`:

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your values:

```env
# Firebase
FIREBASE_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json

# Server
PORT=8080

# CORS (comma-separated origins)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081,http://localhost:19006,https://ishkul.vercel.app

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=your-secure-random-secret-here

# Google OAuth Client IDs
GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com

# Environment
ENVIRONMENT=development
```

### 2. Firebase Service Account

Get your `serviceAccountKey.json`:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Project Settings → Service Accounts
3. Click "Generate New Private Key"
4. Save as `backend/serviceAccountKey.json`

**⚠️ Never commit serviceAccountKey.json to git**

### 3. Run Backend Locally

```bash
cd backend
go mod download       # Download dependencies
go run cmd/server/main.go
# Server runs on http://localhost:8080
```

### 4. Available Commands

```bash
go mod tidy                    # Tidy dependencies
go run cmd/server/main.go      # Run server
go build -o server cmd/server/main.go  # Build binary
go test ./...                  # Run tests
docker build -t ishkul-backend .  # Build Docker image
```

## Google OAuth Setup

### Get OAuth Client IDs

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. APIs & Services → Credentials
3. Create OAuth 2.0 Client IDs for:
   - **Web** - For frontend
   - **iOS** - For iOS app
   - **Android** - For Android app

4. Add authorized redirect URIs:
   - Web: `http://localhost:3000`, `https://ishkul.vercel.app`
   - iOS/Android: As provided by Expo Auth

5. Copy Client IDs to:
   - `frontend/.env.local`
   - `backend/.env`

## Firebase Configuration

### Collections

The following Firestore collections are used:

- **users/** - User profiles and learning history
  ```
  {
    uid: string,
    email: string,
    displayName: string,
    goal: string,
    level: number,
    memory: object,
    history: array,
    nextStep: object,
    createdAt: timestamp,
    updatedAt: timestamp
  }
  ```

### Security Rules

Default rules restrict access to user's own documents:

```
match /users/{uid} {
  allow read, write: if request.auth.uid == uid;
}
```

Update rules in `firebase/firestore.rules` as needed.

## Environment Variable Reference

### Frontend (EXPO_PUBLIC_ prefix required)

| Variable | Purpose | Example |
|----------|---------|---------|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase API key | From Firebase Console |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | your-project.firebaseapp.com |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | GCP project ID | your-project-id |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage | your-project.appspot.com |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | FCM sender ID | Your sender ID |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase app ID | From Firebase Console |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google OAuth (web) | xxx.apps.googleusercontent.com |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google OAuth (iOS) | xxx.apps.googleusercontent.com |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Google OAuth (Android) | xxx.apps.googleusercontent.com |
| `EXPO_PUBLIC_API_URL` | Backend API URL | http://localhost:8080/api |

### Backend

| Variable | Purpose | Default | Notes |
|----------|---------|---------|-------|
| `FIREBASE_PROJECT_ID` | GCP project ID | Required | From Firebase Console |
| `GOOGLE_APPLICATION_CREDENTIALS` | Service account file | ./serviceAccountKey.json | Path to JSON key |
| `PORT` | Server port | 8080 | For Cloud Run |
| `ALLOWED_ORIGINS` | CORS allowed origins | localhost | Comma-separated URLs |
| `JWT_SECRET` | JWT signing secret | Auto-generated | Generate: `openssl rand -base64 32` |
| `GOOGLE_WEB_CLIENT_ID` | Google OAuth (web) | Required | For token verification |
| `GOOGLE_IOS_CLIENT_ID` | Google OAuth (iOS) | Optional | For mobile auth |
| `GOOGLE_ANDROID_CLIENT_ID` | Google OAuth (Android) | Optional | For mobile auth |
| `ENVIRONMENT` | Deployment env | development | development or production |

## Local Development Workflow

### Starting Everything

```bash
# Terminal 1: Backend
cd backend
go run cmd/server/main.go

# Terminal 2: Frontend
cd frontend
npm start
# Select 'w' for web browser
```

### Testing the Connection

Frontend should connect to `http://localhost:8080/api`.

Test backend health:

```bash
curl http://localhost:8080/health
# Should return: {"status":"ok"}
```

### Debugging

**Backend logs**: Check terminal where `go run` is running

**Frontend logs**: Open browser DevTools (F12)

**Firebase issues**: Check [Firebase Console](https://console.firebase.google.com)

## Troubleshooting Setup Issues

### "Cannot find module" (Frontend)

```bash
cd frontend
npm install
npx expo start -c
```

### "Module not found" (Backend)

```bash
cd backend
go mod download
go mod tidy
go run cmd/server/main.go
```

### Firebase Authentication Fails

1. Check `serviceAccountKey.json` exists and is valid
2. Verify `FIREBASE_PROJECT_ID` matches your project
3. Check Cloud Firestore is enabled in Firebase Console

### Google Sign-In Not Working

1. Verify OAuth Client IDs in `.env` files
2. Check authorized redirect URIs in Google Cloud Console
3. Clear app cache and restart

### CORS Errors

1. Verify `ALLOWED_ORIGINS` includes your frontend URL
2. Check backend is running on correct port
3. Verify `EXPO_PUBLIC_API_URL` matches backend URL

## Next Steps

- Run CLAUDE.md checklist before first commit
- See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for deployment
- See [CLAUDE.md](CLAUDE.md) for development guidelines
- See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) if issues arise
