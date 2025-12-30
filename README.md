# Ishkul - Adaptive Learning Platform

A full-stack adaptive learning platform with React Native frontend and Go backend, powered by Firebase and AI.

## Architecture

```
ishkul/
├── frontend/           # React Native/Expo mobile & web app
└── backend/            # Go backend service with Firebase
```

## Features

- 🎓 **Adaptive Learning Engine** - AI-powered personalized learning paths
- 🔥 **Firebase Integration** - Authentication, Firestore, Storage
- 💾 **Cloud Sync** - Progress saved and synced across devices
- 📱 **Cross-Platform** - Works on iOS, Android, Web, and Tablets
- 🎯 **Goal-Based Learning** - Set custom learning goals
- 📊 **Progress Tracking** - Monitor your learning journey
- 🧠 **Three Learning Modes** - Lessons, Quizzes, and Practice Tasks
- 🚀 **RESTful API** - Go backend with Firebase integration
- 🔒 **Secure** - Firebase Auth with JWT token validation

## Tech Stack

### Frontend
- **Expo/React Native** - Cross-platform mobile framework
- **TypeScript** - Type-safe code
- **Firebase SDK** - Client-side Firebase integration
- **Zustand** - State management
- **React Navigation** - Navigation (Tabs + Stack)

### Backend
- **Go 1.24+** - High-performance backend
- **Firebase Admin SDK** - Server-side Firebase integration
- **Firestore** - NoSQL database
- **Firebase Storage** - File storage
- **Firebase Auth** - User authentication

## Prerequisites

- Node.js 18+ and npm
- Go 1.24+
- Expo CLI
- Firebase project with Billing enabled
- Firebase CLI: `npm install -g firebase-tools`

## Quick Start

### 1. Clone Repository

```bash
git clone <repository-url>
cd ishkul
```

### 2. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your Firebase config
npm start
```

### 3. Backend Setup

```bash
cd backend
go mod tidy
cp .env.example .env
# Add your Firebase service account key as serviceAccountKey.json
# Edit .env with your Firebase config
go run cmd/server/main.go
```

The backend will start on `http://localhost:8080`

### 4. Run Frontend

**Web:**
```bash
cd frontend
npm run web
```

**iOS:**
```bash
cd frontend
npm run ios
```

**Android:**
```bash
cd frontend
npm run android
```

## Project Structure

```
ishkul/
├── frontend/                    # React Native/Expo frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── screens/            # App screens
│   │   ├── navigation/         # Navigation setup
│   │   ├── state/              # Zustand stores
│   │   ├── services/           # Firebase services
│   │   └── types/              # TypeScript types
│   ├── package.json
│   └── .env.example
│
├── backend/                     # Go backend service
│   ├── cmd/
│   │   └── server/             # Application entry point
│   ├── internal/
│   │   ├── handlers/           # HTTP request handlers
│   │   ├── middleware/         # HTTP middleware (auth, cors)
│   │   └── models/             # Data models
│   ├── pkg/
│   │   └── firebase/           # Firebase integration
│   ├── go.mod
│   └── .env.example
│
├── docs/                        # Documentation
│   ├── DEPLOY_GUIDE.md         # Deployment guide
│   ├── DEVELOPMENT_SETUP.md    # Development setup
│   └── ...                     # Other guides
└── README.md                    # This file
```

### Frontend Structure

See [frontend/README.md](frontend/README.md) for detailed frontend documentation.

### Backend Structure

See [backend/README.md](backend/README.md) for detailed backend documentation.

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

## CI/CD

**Automated Deployment with GitHub Actions**

The project uses multiple workflows for different deployment scenarios:

- ✅ **Backend** → Google Cloud Run (northamerica-northeast1)
- ✅ **Frontend** → Vercel
- ✅ **Firebase Rules** → Firestore & Storage rules

**Workflows:**
- `ci.yml` - Runs on every push/PR (lint, test, type-check)
- `deploy-backend.yml` - Backend deployment on push to main or release tags
- `deploy-firebase.yml` - Firebase rules deployment

**Production Release:**
```bash
# Create and push a release tag
git tag v1.0.0
git push origin v1.0.0
```

**Learn More:**
- [CI/CD Setup Guide](docs/CICD_SETUP.md) - Complete GitHub Actions setup
- [Deployment Guide](docs/DEPLOY_GUIDE.md) - Manual deployment instructions
- [Workflow Documentation](.github/workflows/README.md) - Workflow details

## Backend API

The Go backend provides the following endpoints:

### Public
- `GET /health` - Health check

### Authenticated (Require Firebase ID token)
- `GET /api/users` - Get all users
- `POST /api/users/create` - Create/update user
- `GET /api/progress` - Get user progress
- `POST /api/progress/update` - Update lesson progress
- `GET /api/lessons?level=beginner` - Get lessons
- `POST /api/upload` - Upload file to Firebase Storage

**Authentication:**
All `/api/*` endpoints require a Firebase ID token in the Authorization header:
```
Authorization: Bearer <firebase-id-token>
```

## Deployment

See deployment documentation:
- **[docs/DEPLOY_GUIDE.md](docs/DEPLOY_GUIDE.md)** - Comprehensive deployment guide
- **[docs/BACKEND_DEPLOYMENT.md](docs/BACKEND_DEPLOYMENT.md)** - Backend deployment details
- **[docs/INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md)** - Cloud Run management & monitoring

**Quick Deploy:**

### Backend (Cloud Run)
```bash
cd backend
gcloud run deploy ishkul-backend --source . --region northamerica-northeast1
```

### Frontend (Vercel)
```bash
cd frontend
vercel --prod
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

## Documentation

Complete documentation is available in the `docs/` directory:

### Getting Started
- **[docs/DEVELOPMENT_SETUP.md](docs/DEVELOPMENT_SETUP.md)** - Full development environment setup
- **[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** - Common issues and solutions

### Deployment
- **[docs/DEPLOY_GUIDE.md](docs/DEPLOY_GUIDE.md)** - Comprehensive deployment guide
- **[docs/BACKEND_DEPLOYMENT.md](docs/BACKEND_DEPLOYMENT.md)** - Backend deployment details
- **[docs/INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md)** - Cloud Run management & scaling

### Testing
- **[docs/TESTING.md](docs/TESTING.md)** - Testing guide (k6, Playwright, Maestro, Newman)
- **[docs/MANUAL_TESTING.md](docs/MANUAL_TESTING.md)** - Manual API testing

### Firebase & Infrastructure
- **[firebase/README.md](firebase/README.md)** - Firebase configuration
- **[docs/GITHUB_ENVIRONMENTS_SETUP.md](docs/GITHUB_ENVIRONMENTS_SETUP.md)** - GitHub Environments

### CI/CD & Workflows
- **[.github/workflows/README.md](.github/workflows/README.md)** - GitHub Actions workflows
- **[docs/ENV_SYNC_GUIDE.md](docs/ENV_SYNC_GUIDE.md)** - Environment variable syncing

### Other
- **[docs/ROADMAP.md](docs/ROADMAP.md)** - Future features and enhancements
- **[CLAUDE.md](CLAUDE.md)** - Claude Code development instructions

## License

MIT License - See [LICENSE](LICENSE) file for details

## Contributing

Pull requests are welcome! Please open an issue first to discuss changes.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

For issues or questions:
- 📝 Open a [GitHub Issue](https://github.com/mesbahtanvir/ishkul/issues)
- 📖 Check the [documentation](#documentation)
- 💬 Start a [Discussion](https://github.com/mesbahtanvir/ishkul/discussions)
