# Claude Code Instructions for Ishkul Project

## Project Overview

Ishkul is a full-stack adaptive learning platform consisting of:

- **Frontend**: React Native/Expo (TypeScript) - Cross-platform mobile & web app
- **Backend**: Go service with Firebase Admin SDK
- **Database**: Cloud Firestore
- **Auth**: Firebase Authentication
- **CI/CD**: GitHub Actions with automated deployment

## Project Structure

```text
ishkul/
├── frontend/                    # React Native/Expo mobile & web app
│   ├── src/
│   │   ├── components/         # Reusable UI components (Button, Input, Container, LoadingScreen)
│   │   ├── screens/            # App screens (Login, Goal, Level, NextStep, Lesson, Quiz, Practice, Progress, Settings)
│   │   ├── navigation/         # React Navigation setup (Tabs + Stack)
│   │   ├── state/              # Zustand stores (userStore, learningStore)
│   │   ├── services/           # Firebase services (auth, memory, llmEngine)
│   │   ├── config/             # Firebase configuration
│   │   └── types/              # TypeScript type definitions
│   ├── App.tsx                 # Main entry point
│   ├── package.json            # Dependencies (Expo 54, React 19, Firebase 12)
│   └── .env.example
│
├── backend/                     # Go backend service
│   ├── cmd/server/             # Application entry point (main.go)
│   ├── internal/
│   │   ├── handlers/           # HTTP request handlers
│   │   ├── middleware/         # Auth, CORS middleware
│   │   └── models/             # Data models
│   ├── pkg/firebase/           # Firebase Admin SDK integration
│   ├── go.mod                  # Go 1.23.0
│   └── Dockerfile              # Container configuration
│
├── firebase/                    # Firebase configuration & rules
│   ├── firestore.rules         # Database security rules
│   ├── storage.rules           # Storage security rules
│   └── config.ts               # Client-side Firebase config
│
├── .github/workflows/          # CI/CD pipelines
│   ├── deploy.yml              # Automated deployment workflow
│   └── ci.yml                  # Continuous integration checks
│
├── scripts/                     # Deployment & setup scripts
│   ├── setup-github-actions.sh
│   ├── setup-secrets.sh
│   └── configure-firebase.sh
│
└── Documentation files (README, PROJECT_SUMMARY, DEPLOY_GUIDE, etc.)
```

## Tech Stack

### Frontend

- **Framework**: Expo 54 / React Native 0.81
- **Language**: TypeScript 5.9
- **State**: Zustand 5.0
- **Navigation**: React Navigation 7 (Bottom Tabs + Stack)
- **Firebase**: Firebase JS SDK 12.6
- **Auth**: Google Sign-In (expo-auth-session)

### Backend

- **Language**: Go 1.23
- **Firebase**: Firebase Admin SDK v4.18
- **Database**: Cloud Firestore v1.18
- **Deployment**: Google Cloud Run (containerized)

### Infrastructure

- **Hosting**: Firebase Hosting (frontend), Google Cloud Run (backend services)
- **Container Registry**: Google Cloud Artifact Registry (stores Docker images)
- **CI/CD**: GitHub Actions with Workload Identity Federation
- **Auth**: Firebase Authentication (frontend), Firebase Admin SDK (backend)
- **Storage**: Cloud Firestore (database), Firebase Storage (user uploads)

## Key Commands

### Frontend

```bash
cd frontend
npm install           # Install dependencies
npm start            # Start Expo dev server
npm run web          # Run on web
npm run ios          # Run on iOS simulator
npm run android      # Run on Android emulator
npm run build        # Build for web
npm run type-check   # TypeScript type checking
npm run lint         # ESLint
```

### Backend

```bash
cd backend
go mod tidy          # Install dependencies
go run cmd/server/main.go  # Run server locally
go build -o server cmd/server/main.go  # Build binary
docker build -t ishkul-backend .       # Build Docker image
```

### Deployment

```bash
# Automated (via GitHub Actions)
git push origin main  # Triggers automatic deployment

# Manual deployment
./scripts/setup-github-actions.sh  # One-time CI/CD setup
cd backend && gcloud run deploy ishkul-backend --source .  # Deploy backend to Cloud Run
cd frontend && firebase deploy --only hosting  # Deploy frontend to Firebase Hosting
firebase deploy --only firestore:rules,storage  # Deploy Firestore & Storage rules

# Cloud Run service management
gcloud run services list  # List all Cloud Run services
gcloud run services describe ishkul-backend  # Get backend service details
gcloud run services delete ishkul-backend  # Delete a Cloud Run service
```

## Quick Reference: Backend API Configuration

### Current Cloud Run Service
- **Service URL**: `https://ishkul-backend-863006625304.europe-west1.run.app/api`
- **Service Region**: Europe (eu-west1)
- **Status**: Active and deployed
- **Cloud Run Dashboard**: [View metrics and logs](https://console.cloud.google.com/run/detail/europe-west1/ishkul-backend/observability/metrics?project=ishkul-org)

### Quick Links (Bookmark These!)

**Deployment Dashboards:**
- [Cloud Run Dashboard](https://console.cloud.google.com/run/detail/europe-west1/ishkul-backend/observability/metrics?project=ishkul-org)
  View logs, metrics, deployments
- [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers?project=ishkul-org)
  Configure backend build conditions
- [Vercel Deployments](https://vercel.com/my-dream-company/ishkul/deployments)
  View frontend build history

**Configuration:**
- [Vercel Environment Variables](https://vercel.com/my-dream-company/ishkul/settings/environment-variables)
  Update frontend env vars
- [Firebase Console](https://console.firebase.google.com/project/ishkul-org)
  Firestore, Auth, Storage
- [GCP Console](https://console.cloud.google.com/welcome?project=ishkul-org)
  Overall project management

### Setting Up the Frontend to Use Cloud Run

1. **For Local Development**:
   ```bash
   cd frontend
   cp .env.example .env.local
   # Update EXPO_PUBLIC_API_URL in .env.local with your Cloud Run URL
   EXPO_PUBLIC_API_URL=https://ishkul-backend-863006625304.europe-west1.run.app/api
   npm start
   # Restart Expo dev server after changing env vars: npx expo start -c
   ```

2. **For Production Builds**:
   - GitHub Actions automatically injects the Cloud Run URL during deployment
   - The URL is set via environment variables in the build process
   - No hardcoding needed - same `.env.example` template works for all environments
   - Update via [Vercel Environment Variables](https://vercel.com/my-dream-company/ishkul/settings/environment-variables)

3. **Environment Variable in Code**:
   - Located in: [frontend/src/config/firebase.config.ts](frontend/src/config/firebase.config.ts#L40)
   - Reads: `process.env.EXPO_PUBLIC_API_URL`
   - Falls back to `http://localhost:8080/api` if not set

4. **Important Notes**:
   - **The Cloud Run URL is stable** - it doesn't change between deployments
   - Only changes if you delete and recreate the service
   - Always restart Expo dev server after changing env vars: `npx expo start -c`
   - `.env.local` is gitignored - never commit it

## Development Guidelines

### When Working on Frontend

1. **Always use TypeScript** - No plain JavaScript files
2. **Follow existing patterns** - Match the structure in `src/` folders
3. **Use Zustand stores** for state management (userStore, learningStore)
4. **Firebase client SDK** - Use services in `src/services/`
5. **Navigation** - Use React Navigation v7 patterns
6. **UI Design** - Follow iOS-style minimalist design (colors, spacing in PROJECT_SUMMARY.md)
7. **Cross-platform** - Code must work on iOS, Android, Web

### When Working on Backend

1. **Go conventions** - Follow Go best practices
2. **Firebase Admin SDK** - Use for server-side operations
3. **Middleware** - Auth required for all `/api/*` endpoints
4. **Error handling** - Proper HTTP status codes
5. **CORS** - Configure for frontend domains
6. **Environment** - Use `.env` for configuration

### Code Style

- **Frontend**: ESLint configured, TypeScript strict mode
- **Backend**: gofmt, standard Go conventions
- **Comments**: Add clear comments for complex logic
- **Types**: Use TypeScript interfaces/types, Go structs
- **Naming**: Descriptive names (camelCase JS/TS, PascalCase Go exports)

## Firebase Integration

### Firestore Collections

- `users/` - User profiles with learning history
  - Fields: uid, email, displayName, goal, level, memory, history, nextStep
- Security rules: Users can only read/write their own documents

### Firebase Auth

- Google Sign-In enabled
- JWT tokens for backend authentication
- Frontend: Firebase JS SDK
- Backend: Firebase Admin SDK validates tokens

### Firebase Storage

- User-uploaded content (future feature)
- Security rules: Authenticated users only

## Modern Minimalist Design System

The frontend now uses a **mobile-first, minimalist design system** with:

- **Colors**: Modern palette in `frontend/src/theme/colors.ts`
- **Typography**: Clean type scale in `frontend/src/theme/typography.ts`
- **Spacing**: 4px-based scale in `frontend/src/theme/spacing.ts`
- **Components**: Styled with design tokens (Button, Input, Container)

See [frontend/DESIGN_SYSTEM.md](frontend/DESIGN_SYSTEM.md) for complete design documentation.

### Design Principles

- **Mobile-First**: Optimized for phones, responsive to tablets/web
- **Minimalist**: Clean, uncluttered, focus on content
- **Accessible**: WCAG AA compliant spacing, colors, contrast
- **Consistent**: All UI uses theme system
- **Flexible**: Components support variants and customization

### When Adding New Screens

1. Use the Container component with proper padding
2. Import Colors, Typography, Spacing from theme
3. Follow existing screen patterns
4. Test on small (320px) and large (430px+) screens

## Important Files to Update

### When updating dependencies

- `frontend/package.json` - Frontend npm packages
- `backend/go.mod` - Backend Go modules

### When modifying Firebase

- `frontend/src/config/firebase.config.ts` - Client config
- `backend/pkg/firebase/` - Admin SDK config
- `firebase/firestore.rules` - Database rules
- `firebase/storage.rules` - Storage rules

### When changing UI/Design

- `frontend/src/theme/colors.ts` - Update color palette
- `frontend/src/theme/typography.ts` - Update typography
- `frontend/src/theme/spacing.ts` - Update spacing scale
- `frontend/src/components/` - Update component styles
- `frontend/DESIGN_SYSTEM.md` - **Update design documentation!**

### When changing CI/CD

- `.github/workflows/deploy.yml` - Deployment workflow
- `.github/workflows/ci.yml` - CI checks
- `scripts/` - Deployment scripts

### When updating documentation

- `README.md` - Main project readme
- `PROJECT_SUMMARY.md` - Detailed architecture
- `CLAUDE.md` - **This file - keep updated!**
- `frontend/DESIGN_SYSTEM.md` - UI/UX design documentation

## Common Tasks

### Adding a New Screen

1. Create component in `frontend/src/screens/NewScreen.tsx`
2. Add to navigation in `frontend/src/navigation/AppNavigator.tsx`
3. Update types in `frontend/src/types/app.ts` if needed
4. Add route to navigation params

### Adding a Backend API Endpoint

1. Create handler in `backend/internal/handlers/`
2. Add route in `backend/cmd/server/main.go`
3. Update middleware if needed
4. Document in README.md API section

### Modifying Learning Engine

- Edit `frontend/src/services/llmEngine.ts`
- Update mock data or integrate real LLM
- Adjust types in `frontend/src/types/app.ts`

### Updating Firestore Structure

1. Update types in `frontend/src/types/app.ts`
2. Update backend models in `backend/internal/models/`
3. Update `firestore.rules` if security changes
4. Migrate existing data if needed

## CI/CD Pipeline

### Deployment Architecture

Your project uses **three independent deployment systems** for different components:

1. **Frontend (Vercel)** - Automatic via GitHub App
2. **Backend (Google Cloud)** - Automatic via GitHub App or gcloud CLI
3. **Firebase Rules** - Manual via GitHub Actions or Firebase CLI

### Conditional Deployments

Each component deploys **only when its files change**, avoiding unnecessary builds:

#### Frontend - Vercel (Conditional via vercel.json)

- **File**: [frontend/vercel.json](frontend/vercel.json)
- **Logic**: Skips deployment if only `backend/`, `firebase/`, or `*.md` files changed
- **When it deploys**:
  - ✅ `frontend/**` files changed
  - ✅ `package.json` or `package-lock.json` changed
  - ✅ `.env.example` changed
  - ❌ Skips if only `backend/**` changed
  - ❌ Skips if only `firebase/**` changed
  - ❌ Skips if only documentation changed

**Configuration:**
```json
"ignoreCommand": "git diff HEAD^ HEAD --quiet -- . ':(exclude)backend' ':(exclude)firebase' ':(exclude)*.md' ':(exclude)docs'"
```

#### Backend - Google Cloud (Automatic)

- **Type**: Cloud Build + Cloud Run integration
- **Manual Deploy**: `cd backend && gcloud run deploy ishkul-backend --source .`
- **Manual Trigger**: Configure Cloud Build trigger to only run on `backend/**` changes

**Configure Cloud Build Trigger:**
```bash
# 1. Go to Cloud Build: https://console.cloud.google.com/cloud-build/triggers
# 2. Edit your trigger
# 3. Set "Included files filter" to: backend/**
# 4. Save
```

#### Firebase Rules (Manual or GitHub Actions)

- **Current**: Manual deployment via `firebase deploy --only firestore,storage`
- **Option 1**: Use GitHub Actions with conditional job (recommended)
- **Option 2**: Add pre-commit hook to deploy rules when firebase files change

**Manual Deploy:**
```bash
cd firebase && firebase deploy --only firestore,storage --project=ishkul-org
```

### Deployment Flow Summary

```
git push origin main
    ↓
GitHub webhook → Vercel + Google Cloud
    ↓
Vercel checks: "Did frontend/* change?"
    ├─ YES → Build & deploy frontend
    └─ NO → Skip (don't waste minutes)
    ↓
Google Cloud checks: "Did backend/* change?"
    ├─ YES → Build & deploy to Cloud Run
    └─ NO → Skip
    ↓
Firebase Rules: Manual trigger needed
    (Run: cd firebase && firebase deploy --only firestore,storage)
```

### Performance Impact

**Before Conditional Deployments:**
- Every push: 8-13 minutes (all three systems build)
- Monthly: 240-390 minutes from CI/CD

**After Conditional Deployments:**
- Backend-only change: 3-5 minutes (Vercel skipped ✅)
- Frontend-only change: 4-6 minutes (GCP skipped ✅)
- Documentation change: ~30 seconds (all skipped ✅)
- Monthly: Saves 60-80% of CI/CD minutes

### Required GitHub Secrets & Integrations

#### Vercel GitHub App
- ✅ Already configured - auto-deploys frontend
- Settings: [Vercel Environment Variables](https://vercel.com/my-dream-company/ishkul/settings/environment-variables)

#### Google Cloud GitHub App
- ✅ Already configured - auto-deploys backend
- Dashboard: [Cloud Run](https://console.cloud.google.com/run/detail/europe-west1/ishkul-backend/observability/metrics?project=ishkul-org)
- Configure trigger: [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers?project=ishkul-org)

#### Firebase CLI (Manual)
- Used for: `firebase deploy --only firestore,storage`
- Setup: `./scripts/setup-github-actions.sh`

## Environment Variables

### Frontend (.env and .env.local)

**Note**: Always use `EXPO_PUBLIC_` prefix for frontend environment variables (Expo requirement)

```env
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id

# Google OAuth Configuration
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com

# Backend API Configuration (IMPORTANT!)
# Development: http://localhost:8080/api
# Production: Your Cloud Run service URL
EXPO_PUBLIC_API_URL=https://ishkul-backend-863006625304.europe-west1.run.app/api
```

**Files**:
- `.env.example` - Template (commit to git)
- `.env.local` - Local overrides (gitignored, don't commit)
- `.env` files - Deprecated, use .env.local instead

**Setup Instructions**:
```bash
cd frontend
cp .env.example .env.local
# Edit .env.local and add your Cloud Run URL
```

### Backend (.env)

```env
FIREBASE_PROJECT_ID=
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
PORT=8080
```

## Testing & Quality

### Frontend Testing

- Run `npm run type-check` before commits
- Test on web, iOS, and Android
- Verify Google Sign-In works
- Check Firestore operations

### Backend Testing

- Run `go build` to check compilation
- Test API endpoints with curl/Postman
- Verify Firebase Admin SDK operations
- Check authentication middleware

## Quick Setup: Conditional Deployments

### Configure Vercel to Skip Frontend Builds

✅ **Already configured** in [frontend/vercel.json](frontend/vercel.json)

The `ignoreCommand` tells Vercel to skip builds when only these files change:
- `backend/**`
- `firebase/**`
- `*.md` files
- `docs/**` folder

**No action needed** - this is automatic!

### Configure Google Cloud Build to Skip Backend Builds

To prevent unnecessary Cloud Run builds when only frontend files change:

1. **Open Cloud Build Triggers**:
   [https://console.cloud.google.com/cloud-build/triggers?project=ishkul-org](https://console.cloud.google.com/cloud-build/triggers?project=ishkul-org)

2. **Find your ishkul-backend trigger** and click **Edit**

3. **Add "Included files filter"**:
   ```
   backend/**
   ```

4. **Save**

Now Cloud Build will only trigger when `backend/` files change.

### Firebase Rules Deployment

**Current**: Manual deployment via CLI
```bash
cd firebase
firebase deploy --only firestore,storage --project=ishkul-org
```

**Planned**: Add conditional GitHub Actions trigger
- **Tracking Issue**: [#71 - Refactor GitHub Actions: Add conditional triggers for Firebase deployments](https://github.com/mesbahtanvir/ishkul/issues/71)
- **Status**: ⏳ Pending implementation
- **Benefit**: Firebase rules will only deploy when `firebase/**` files change (save ~2 minutes per push)

Once implemented, you'll see:
```
git push (only backend changes)
  → Firebase Rules: ⏭️ SKIPPED (no firebase/* changes)
  → Time saved: 2 minutes
```

## Troubleshooting

### Common Issues

1. **Google Sign-In fails** - Check OAuth client IDs in .env
2. **Firestore permission denied** - Verify security rules
3. **Backend 401 errors** - Check Firebase ID token in Authorization header
4. **Build fails** - Clear caches: `npx expo start -c`, `go clean -cache`
5. **Cloud Run deployment fails** - Check workflow logs, GCP project ID, service quotas
6. **Backend cannot start on Cloud Run** - Verify PORT env var, Application Default Credentials
7. **Cloud Run service not accessible** - Check IAM permissions, service is public/private settings
8. **Vercel not deploying** - Check if only `backend/` or `firebase/` changed (intentionally skipped)
9. **Cloud Build not triggering** - Verify "Included files filter" is set to `backend/**`

## Documentation

Always keep these files synchronized:

- **CLAUDE.md** (this file) - Development instructions
- **README.md** - User-facing project overview
- **PROJECT_SUMMARY.md** - Detailed architecture
- **DEPLOY_GUIDE.md** - Deployment instructions
- **CICD_SETUP.md** - CI/CD configuration

## Best Practices

### Before Committing

Run these CI checks locally before committing to catch issues early:

**Frontend (from `frontend/` directory):**
```bash
npm run lint                 # ESLint - must pass with no errors (warnings OK)
npm run type-check           # TypeScript - must pass
npm test -- --watchAll=false # Jest tests - all must pass
```

**Backend (from `backend/` directory):**
```bash
gofmt -l .                                    # Check formatting (no output = OK)
go test ./internal/... ./pkg/...              # Run tests
golangci-lint run --path-prefix=backend       # Linting (if available)
```

**Quick All-in-One Check:**
```bash
# Frontend
cd frontend && npm run lint && npm run type-check && npm test -- --watchAll=false

# Backend
cd backend && gofmt -l . && go test ./internal/... ./pkg/...
```

**Additional Guidelines:**
1. Test on at least one platform (web easiest)
2. Update CLAUDE.md if architecture changed
3. Write clear commit messages

### Before Deploying

1. Test locally first
2. Check all environment variables are set
3. Verify Firebase rules are correct
4. Review GitHub Actions workflow
5. Monitor deployment logs

### Code Organization

- Keep components small and focused
- Use services for external interactions (Firebase, API)
- Store state in Zustand stores
- Use TypeScript types everywhere
- Follow DRY principle

## Architecture Decisions

### Why Expo

- Cross-platform (iOS, Android, Web)
- Fast development with hot reload
- Easy OTA updates
- Strong TypeScript support

### Why Go Backend

- High performance and concurrency
- Easy deployment (single binary)
- Strong Firebase Admin SDK
- Good Cloud Run support

### Why Firebase

- Managed authentication
- Real-time database (Firestore)
- File storage
- Easy integration with mobile apps
- Generous free tier

### Why Zustand

- Simple API
- TypeScript support
- Less boilerplate than Redux
- Good performance

## Future Enhancements

Potential areas for improvement:

- [ ] Real LLM integration (OpenAI/Anthropic/Claude)
- [ ] Spaced repetition algorithm
- [ ] Push notifications
- [ ] Dark mode
- [ ] Offline mode
- [ ] Social features
- [ ] Voice input
- [ ] Rich media in lessons

## Support & Resources

- **Issues**: GitHub Issues tab
- **Docs**: See README.md and other .md files
- **Firebase Console**: <https://console.firebase.google.com>
- **Cloud Console**: <https://console.cloud.google.com>
- **Expo Docs**: <https://docs.expo.dev>

---

**Last Updated**: 2025-11-27
**Version**: 1.2.0
**Status**: Production Ready ✅
**Deployment**: Vercel (Frontend) + Google Cloud (Backend) + Firebase (Rules)
**Conditional Deployments**: ✅ Enabled

**Note**: Update this file whenever you make significant architectural changes or add new features!

## Cloud Run Service Management

The backend runs as a managed Cloud Run service. Key operations:

```bash
# View service status
gcloud run services describe ishkul-backend --region=us-central1

# View recent deployments
gcloud run revisions list --service=ishkul-backend

# View service logs
gcloud run services logs read ishkul-backend --limit=50

# Set environment variables
gcloud run services update ishkul-backend \
  --set-env-vars KEY=value \
  --region=us-central1

# Scale configuration
gcloud run services update ishkul-backend \
  --min-instances=0 \
  --max-instances=100 \
  --region=us-central1
```

### Service Health Checks

Cloud Run performs automatic health checks on the service. Ensure:
- Service listens on PORT environment variable (default: 8080)
- Service responds with HTTP 200 to root path or `/health` endpoint
- Service starts within 5 minutes
