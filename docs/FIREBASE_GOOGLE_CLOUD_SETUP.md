# Firebase + Google Cloud Setup Guide

Complete guide to deploy a React Native/Expo frontend + Go backend with Firebase on Google Cloud.

**Last Updated**: 2024-12-04
**Estimated Setup Time**: 2-4 hours (first time), 30 minutes (experienced)

---

## Table of Contents

1. [Quick Start (Experienced Devs)](#1-quick-start-experienced-devs)
2. [Architecture Overview](#2-architecture-overview)
3. [Prerequisites](#3-prerequisites)
4. [Firebase Project Setup](#4-firebase-project-setup)
5. [Google Cloud Setup](#5-google-cloud-setup)
6. [OAuth Configuration](#6-oauth-configuration)
7. [Backend Setup (Go)](#7-backend-setup-go)
8. [Frontend Setup (Expo/React Native)](#8-frontend-setup-exporeact-native)
9. [LLM / OpenAI Setup](#9-llm--openai-setup)
10. [GitHub Models & Prompts](#10-github-models--prompts)
11. [Firestore Security Rules](#11-firestore-security-rules)
12. [CI/CD Pipeline (GitHub Actions)](#12-cicd-pipeline-github-actions)
13. [Stripe Integration (Optional)](#13-stripe-integration-optional)
14. [Running Without Stripe (Self-Hosted)](#14-running-without-stripe-self-hosted)
15. [Domain & SSL Setup](#15-domain--ssl-setup)
16. [Complete Checklist](#16-complete-checklist)
17. [Appendix](#17-appendix)

---

## 1. Quick Start (Experienced Devs)

For developers who have done this before. Skip to [Section 3](#3-prerequisites) for the full walkthrough.

```bash
# 1. Create Firebase project at https://console.firebase.google.com
#    Enable: Firestore, Authentication (Google), Storage

# 2. Clone and configure
git clone https://github.com/YOUR_USERNAME/ishkul.git
cd ishkul

# 3. Get service account key
gcloud iam service-accounts keys create backend/serviceAccountKey.json \
  --iam-account=firebase-adminsdk-xxxxx@YOUR_PROJECT.iam.gserviceaccount.com

# 4. Backend setup
cd backend
cp .env.example .env
# Edit .env: GOOGLE_APPLICATION_CREDENTIALS, JWT_SECRET, OPENAI_API_KEY
go run cmd/server/main.go

# 5. Frontend setup (new terminal)
cd frontend
cp .env.example .env.local
# Edit .env.local: Firebase config, OAuth client IDs, API URL
npm install && npm start
# Press 'w' for web

# 6. Deploy (after GitHub secrets are configured)
git tag v1.0.0 && git push origin v1.0.0  # Production
git push origin main                        # Staging
```

**GitHub Secrets Required**:
- `GCP_PROJECT_ID`, `GCP_SA_KEY` (base64)
- `JWT_SECRET`, `OPENAI_API_KEY`
- `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_IOS_CLIENT_ID`, `GOOGLE_ANDROID_CLIENT_ID`
- `FIREBASE_*` variables (6 total)
- `ALLOWED_ORIGINS`
- Optional: `STRIPE_*` variables (6 total)

---

## 2. Architecture Overview

### System Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ISHKUL ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  CLIENTS                                                                │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐          │
│  │   Browser    │      │     iOS      │      │   Android    │          │
│  │   (Web)      │      │    (Expo)    │      │   (Expo)     │          │
│  │   PRIMARY    │      │   Optional   │      │   Optional   │          │
│  └──────┬───────┘      └──────┬───────┘      └──────┬───────┘          │
│         │                     │                      │                  │
│         └─────────────────────┼──────────────────────┘                  │
│                               │                                         │
│                               ▼                                         │
│  FRONTEND HOSTING    ┌────────────────────┐                            │
│                      │   Vercel (CDN)     │                            │
│                      │   - Static files   │                            │
│                      │   - Auto SSL       │                            │
│                      │   - Global edge    │                            │
│                      └─────────┬──────────┘                            │
│                                │ HTTPS                                  │
│                                ▼                                        │
│  BACKEND API         ┌────────────────────┐       ┌─────────────────┐  │
│                      │  Google Cloud Run  │       │    OpenAI API   │  │
│                      │  (Go Backend)      │◄─────►│  (LLM Content)  │  │
│                      │                    │       └─────────────────┘  │
│                      │  - JWT Auth        │                            │
│                      │  - Rate limiting   │                            │
│                      │  - DDoS protection │                            │
│                      └─────────┬──────────┘                            │
│                                │                                        │
│         ┌──────────────────────┼──────────────────────┐                │
│         │                      │                      │                │
│         ▼                      ▼                      ▼                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
│  │   Firestore     │  │  Firebase Auth  │  │  Cloud Storage  │        │
│  │   (Database)    │  │  (User IDs)     │  │  (Files)        │        │
│  │                 │  │                 │  │                 │        │
│  │  - users/       │  │  - Google OAuth │  │  - User uploads │        │
│  │  - progress/    │  │  - JWT tokens   │  │  - 10MB limit   │        │
│  │  - lessons/     │  │                 │  │                 │        │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘        │
│                                                                         │
│  OPTIONAL            ┌─────────────────────────────────────────┐       │
│                      │              Stripe                      │       │
│                      │  - Subscriptions                        │       │
│                      │  - Webhooks → Backend → Update Firestore│       │
│                      │  - Test mode / Live mode                │       │
│                      └─────────────────────────────────────────┘       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       AUTHENTICATION FLOW                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. User clicks "Sign in with Google"                                   │
│     │                                                                   │
│     ▼                                                                   │
│  2. Frontend opens Google OAuth popup                                   │
│     │                                                                   │
│     ▼                                                                   │
│  3. User authenticates with Google                                      │
│     │                                                                   │
│     ▼                                                                   │
│  4. Frontend receives Google ID Token                                   │
│     │                                                                   │
│     ▼                                                                   │
│  5. Frontend sends ID Token to Backend: POST /api/auth/login            │
│     │                                                                   │
│     ▼                                                                   │
│  6. Backend validates ID Token with Google                              │
│     │                                                                   │
│     ▼                                                                   │
│  7. Backend creates/updates user in Firestore                           │
│     │                                                                   │
│     ▼                                                                   │
│  8. Backend generates JWT access token (1hr) + refresh token (7 days)   │
│     │                                                                   │
│     ▼                                                                   │
│  9. Frontend stores tokens in AsyncStorage                              │
│     │                                                                   │
│     ▼                                                                   │
│  10. All subsequent requests include: Authorization: Bearer <JWT>       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React Native + Expo | Cross-platform UI (Web primary) |
| State | Zustand | Simple, fast state management |
| Navigation | React Navigation 7 | Screen navigation |
| Backend | Go 1.24 | High-performance API server |
| Database | Cloud Firestore | NoSQL document database |
| Auth | Firebase Auth + JWT | User authentication |
| Storage | Cloud Storage | File uploads |
| Hosting (FE) | Vercel | Static site CDN |
| Hosting (BE) | Cloud Run | Serverless containers |
| LLM | OpenAI API | Content generation |
| Payments | Stripe (optional) | Subscriptions |
| CI/CD | GitHub Actions | Automated testing/deployment |

---

## 3. Prerequisites

### Accounts Required

| Account | URL | Cost |
|---------|-----|------|
| Google Cloud | https://console.cloud.google.com | Free tier available, then pay-as-you-go |
| Firebase | https://console.firebase.google.com | Free (Spark) or pay-as-you-go (Blaze) |
| GitHub | https://github.com | Free |
| Vercel | https://vercel.com | Free (Hobby) |
| OpenAI | https://platform.openai.com | Pay-as-you-go (~$0.01-0.10 per request) |
| Stripe (optional) | https://stripe.com | 2.9% + $0.30 per transaction |

### Tools to Install

#### macOS

```bash
# Homebrew (package manager)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node.js 20+ (frontend)
brew install node@20

# Go 1.24+ (backend)
brew install go

# Google Cloud SDK
brew install --cask google-cloud-sdk

# Firebase CLI
npm install -g firebase-tools

# Optional: Docker (for local backend)
brew install --cask docker
```

#### Ubuntu/Debian

```bash
# Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Go 1.24+
wget https://go.dev/dl/go1.24.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.24.0.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# Google Cloud SDK
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Firebase CLI
npm install -g firebase-tools

# Docker (optional)
sudo apt-get install docker.io docker-compose
```

#### Windows

```powershell
# Install with winget (Windows 11) or download installers

# Node.js 20+
winget install OpenJS.NodeJS.LTS

# Go 1.24+
winget install GoLang.Go

# Google Cloud SDK
# Download from: https://cloud.google.com/sdk/docs/install

# Firebase CLI
npm install -g firebase-tools

# Docker Desktop (optional)
winget install Docker.DockerDesktop
```

### Verify Installation

```bash
node --version    # Should be v20.x or higher
npm --version     # Should be v10.x or higher
go version        # Should be go1.23 or higher
gcloud --version  # Should show Google Cloud SDK
firebase --version # Should be v13.x or higher
```

### Cost Estimates

| Service | Free Tier | Typical Monthly Cost |
|---------|-----------|---------------------|
| Firestore | 50K reads, 20K writes/day | $0-10 (small app) |
| Cloud Run | 2M requests/month | $0-20 (auto-scales) |
| Cloud Storage | 5GB | $0-5 |
| Vercel | 100GB bandwidth | $0 (hobby) |
| OpenAI | None | $5-50 (depends on usage) |
| **Total** | - | **$5-85/month** |

---

## 4. Firebase Project Setup

### Step 4.1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Create a project"** (or "Add project")
3. Enter project name: `your-project-name` (e.g., `ishkul-org`)
4. **Disable** Google Analytics (optional, simplifies setup)
5. Click **"Create project"**
6. Wait for project creation (30-60 seconds)

### Step 4.2: Enable Firestore Database

1. In Firebase Console, click **"Build"** → **"Firestore Database"**
2. Click **"Create database"**
3. Choose mode:
   - **Production mode** (recommended) - starts locked down
   - Test mode - open for 30 days (development only)
4. Select location:
   - `northamerica-northeast1` (Montreal) - for North America
   - `europe-west1` (Belgium) - for Europe
   - `asia-east1` (Taiwan) - for Asia

   > **Important**: Location cannot be changed later!

5. Click **"Enable"**

### Step 4.3: Enable Authentication

1. Click **"Build"** → **"Authentication"**
2. Click **"Get started"**
3. Click **"Sign-in method"** tab
4. Click **"Google"** provider
5. Toggle **"Enable"**
6. Enter **Project support email** (your email)
7. Click **"Save"**

### Step 4.4: Enable Cloud Storage

1. Click **"Build"** → **"Storage"**
2. Click **"Get started"**
3. Choose security rules mode (Production recommended)
4. Select same location as Firestore
5. Click **"Done"**

### Step 4.5: Get Firebase Configuration

1. Click **gear icon** → **"Project settings"**
2. Scroll to **"Your apps"** section
3. Click **Web icon** (`</>`) to add a web app
4. Enter app nickname: `web-app`
5. **Do not** check "Firebase Hosting"
6. Click **"Register app"**
7. Copy the configuration object:

```javascript
// Save these values - you'll need them for frontend/.env.local
const firebaseConfig = {
  apiKey: "AIzaSy...",              // EXPO_PUBLIC_FIREBASE_API_KEY
  authDomain: "your-project.firebaseapp.com",  // EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
  projectId: "your-project",        // EXPO_PUBLIC_FIREBASE_PROJECT_ID
  storageBucket: "your-project.appspot.com",   // EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
  messagingSenderId: "123456789",   // EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  appId: "1:123456789:web:abc123"   // EXPO_PUBLIC_FIREBASE_APP_ID
};
```

### Step 4.6: Get Service Account Key

The backend needs a service account key to authenticate with Firebase Admin SDK.

1. Click **gear icon** → **"Project settings"**
2. Click **"Service accounts"** tab
3. Click **"Generate new private key"**
4. Click **"Generate key"**
5. Save the downloaded JSON file as `backend/serviceAccountKey.json`

> **Security**: Never commit this file to git! It's already in `.gitignore`.

**Alternative via CLI** (if you have gcloud configured):

```bash
# Find your service account email
gcloud iam service-accounts list --project=YOUR_PROJECT_ID

# Generate key
gcloud iam service-accounts keys create backend/serviceAccountKey.json \
  --iam-account=firebase-adminsdk-xxxxx@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --project=YOUR_PROJECT_ID
```

---

## 5. Google Cloud Setup

Firebase projects are automatically linked to Google Cloud. This section enables additional APIs and sets up Cloud Run.

### Step 5.1: Access Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your Firebase project from the dropdown (top-left)
3. If prompted, accept terms of service

### Step 5.2: Enable Billing

Cloud Run requires billing to be enabled (you won't be charged much within free tier).

1. Click **hamburger menu** (☰) → **"Billing"**
2. Click **"Link a billing account"**
3. Create a billing account or select existing one
4. Enter payment information

### Step 5.3: Enable Required APIs

```bash
# Set your project ID
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID

# Enable all required APIs
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  firestore.googleapis.com \
  storage-component.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  cloudresourcemanager.googleapis.com
```

Or via Console:
1. Click **"APIs & Services"** → **"Enable APIs and Services"**
2. Search and enable each:
   - Cloud Run API
   - Cloud Build API
   - Cloud Firestore API
   - Cloud Storage API
   - Secret Manager API
   - IAM API

### Step 5.4: Create Service Account for GitHub Actions

This service account allows GitHub Actions to deploy to Cloud Run.

```bash
PROJECT_ID="your-project-id"

# Create service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions Deployer" \
  --project=$PROJECT_ID

# Get the email
SA_EMAIL="github-actions@${PROJECT_ID}.iam.gserviceaccount.com"

# Grant required roles
ROLES=(
  "roles/run.admin"
  "roles/iam.serviceAccountUser"
  "roles/cloudbuild.builds.editor"
  "roles/storage.admin"
  "roles/firebase.admin"
  "roles/secretmanager.admin"
)

for ROLE in "${ROLES[@]}"; do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="$ROLE"
done

# Create and download key
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=$SA_EMAIL \
  --project=$PROJECT_ID

# Base64 encode for GitHub secret
cat github-actions-key.json | base64 -w 0 > github-actions-key-base64.txt
echo "Copy the contents of github-actions-key-base64.txt to GitHub secret GCP_SA_KEY"
```

### Step 5.5: Create Secret Manager Secret for JWT

```bash
# Generate a secure random JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Create the secret in Secret Manager
echo -n "$JWT_SECRET" | gcloud secrets create JWT_SECRET \
  --replication-policy="automatic" \
  --data-file=- \
  --project=$PROJECT_ID

# Grant Cloud Run access to the secret
gcloud secrets add-iam-policy-binding JWT_SECRET \
  --member="serviceAccount:${PROJECT_ID}@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID

# Save for local development
echo "JWT_SECRET=$JWT_SECRET" >> backend/.env
```

### Step 5.6: Configure Cloud Run (First Deployment)

The first deployment creates the service. Subsequent deployments are handled by CI/CD.

```bash
cd backend

# Build and deploy
gcloud run deploy your-backend \
  --source . \
  --region=northamerica-northeast1 \
  --project=$PROJECT_ID \
  --allow-unauthenticated \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --set-env-vars="ENVIRONMENT=production,PORT=8080"
```

After deployment, note the service URL (e.g., `https://your-backend-xxxxx-uc.a.run.app`).

---

## 6. OAuth Configuration

Google OAuth allows users to sign in with their Google accounts.

### Step 6.1: Configure OAuth Consent Screen

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **"APIs & Services"** → **"OAuth consent screen"**
3. Select **"External"** (unless G Suite only)
4. Click **"Create"**

Fill in the form:
- **App name**: Your App Name
- **User support email**: your-email@gmail.com
- **App logo**: (optional, can add later)
- **App domain**: (leave blank for now)
- **Authorized domains**: Add your domain (e.g., `ishkul.org`)
- **Developer contact email**: your-email@gmail.com

5. Click **"Save and Continue"**
6. **Scopes**: Click "Add or Remove Scopes"
   - Select: `email`, `profile`, `openid`
   - Click **"Update"**
7. Click **"Save and Continue"**
8. **Test users**: Add your email for testing
9. Click **"Save and Continue"**
10. Review and click **"Back to Dashboard"**

### Step 6.2: Create OAuth Credentials

#### Web Client ID

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. Select **"Web application"**
4. Name: `Web Client`
5. **Authorized JavaScript origins**:
   ```
   http://localhost:3000
   http://localhost:8081
   http://localhost:19006
   https://your-app.vercel.app
   https://yourdomain.com
   ```
6. **Authorized redirect URIs**:
   ```
   http://localhost:3000
   http://localhost:8081
   http://localhost:19006
   https://your-app.vercel.app
   https://yourdomain.com
   ```
7. Click **"Create"**
8. Copy the **Client ID** (save as `GOOGLE_WEB_CLIENT_ID`)

#### iOS Client ID (Optional - for mobile)

1. Click **"Create Credentials"** → **"OAuth client ID"**
2. Select **"iOS"**
3. Name: `iOS Client`
4. **Bundle ID**: `org.yourorg.yourapp` (from app.json)
5. Click **"Create"**
6. Copy the **Client ID** (save as `GOOGLE_IOS_CLIENT_ID`)

#### Android Client ID (Optional - for mobile)

1. Click **"Create Credentials"** → **"OAuth client ID"**
2. Select **"Android"**
3. Name: `Android Client`
4. **Package name**: `org.yourorg.yourapp` (from app.json)
5. **SHA-1 certificate fingerprint**:
   ```bash
   # For debug keystore
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA1

   # For Expo
   npx expo credentials:manager
   ```
6. Click **"Create"**
7. Copy the **Client ID** (save as `GOOGLE_ANDROID_CLIENT_ID`)

### Step 6.3: Summary of OAuth Values

After completing OAuth setup, you should have:

```bash
# For backend/.env
GOOGLE_WEB_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_IOS_CLIENT_ID=123456789-def.apps.googleusercontent.com      # Optional
GOOGLE_ANDROID_CLIENT_ID=123456789-ghi.apps.googleusercontent.com  # Optional

# For frontend/.env.local (same values, different prefix)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=123456789-abc.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=123456789-def.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=123456789-ghi.apps.googleusercontent.com
```

---

## 7. Backend Setup (Go)

### Step 7.1: Project Structure

```
backend/
├── cmd/
│   └── server/
│       └── main.go           # Entry point
├── internal/
│   ├── auth/
│   │   └── jwt.go           # JWT generation/validation
│   ├── handlers/            # HTTP endpoint handlers
│   │   ├── auth.go          # Login/register/refresh
│   │   ├── me.go            # User profile
│   │   ├── learning_paths.go # Learning features
│   │   └── subscription.go   # Stripe (optional)
│   ├── middleware/
│   │   ├── auth.go          # JWT verification
│   │   ├── cors.go          # CORS headers
│   │   └── ddos.go          # Rate limiting
│   └── models/
│       ├── user.go          # User data structure
│       └── tier.go          # Subscription tiers
├── pkg/
│   ├── firebase/
│   │   └── firebase.go      # Firebase Admin SDK
│   ├── openai/
│   │   └── client.go        # OpenAI API client
│   └── prompts/
│       └── loader.go        # YAML prompt loader
├── Dockerfile
├── docker-compose.yml
├── go.mod
└── go.sum
```

### Step 7.2: Environment Variables

Create `backend/.env`:

```bash
# ===========================================
# REQUIRED VARIABLES
# ===========================================

# Firebase Admin SDK
# Path to service account key (local development only)
GOOGLE_APPLICATION_CREDENTIALS=serviceAccountKey.json

# Firebase project URLs
FIREBASE_DATABASE_URL=https://YOUR_PROJECT_ID.firebaseio.com
FIREBASE_STORAGE_BUCKET=YOUR_PROJECT_ID.appspot.com

# Server Configuration
PORT=8080
ENVIRONMENT=development

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=your-32-character-secret-key-here

# CORS - allowed frontend origins
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081,http://localhost:19006

# Google OAuth Client IDs (for token validation)
GOOGLE_WEB_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_IOS_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID=xxx.apps.googleusercontent.com

# ===========================================
# LLM CONFIGURATION
# ===========================================

# OpenAI API Key (get from https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-...

# Optional: Custom OpenAI-compatible endpoint
# OPENAI_BASE_URL=https://api.openai.com/v1

# ===========================================
# OPTIONAL: STRIPE (Skip for self-hosted)
# ===========================================

# Stripe API Keys (test or live)
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_...
# STRIPE_PRO_PRICE_ID=price_...

# App URL for Stripe redirects
# APP_URL=https://yourdomain.com

# ===========================================
# OPTIONAL: DATA ISOLATION (for staging/preview)
# ===========================================

# Prefix all Firestore collections (e.g., "staging_users" instead of "users")
# FIRESTORE_COLLECTION_PREFIX=staging_

# ===========================================
# OPTIONAL: DDOS PROTECTION TUNING
# ===========================================

# RATE_LIMIT_STANDARD_RPS=10.0
# RATE_LIMIT_AUTH_RPS=5.0
# RATE_LIMIT_EXPENSIVE_RPS=2.0
# CIRCUIT_MAX_CONCURRENT=100
# IP_BLOCK_MAX_VIOLATIONS=10
```

### Step 7.3: Running Locally

```bash
cd backend

# Install dependencies
go mod download

# Verify dependencies are correct
go mod tidy

# Run the server
go run cmd/server/main.go

# Expected output:
# 2024/12/04 10:00:00 INFO Starting server port=8080 environment=development
# 2024/12/04 10:00:00 INFO Firebase initialized project=your-project-id
# 2024/12/04 10:00:00 INFO Loaded prompts count=14
```

Test the health endpoint:
```bash
curl http://localhost:8080/health
# {"status":"ok","timestamp":"2024-12-04T10:00:00Z"}
```

### Step 7.4: Running with Docker

```bash
cd backend

# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

The `docker-compose.yml` mounts your `serviceAccountKey.json` and `.env` file.

### Step 7.5: API Endpoints Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | Health check |
| POST | `/api/auth/login` | No | Login with Google token |
| POST | `/api/auth/register` | No | Email registration |
| POST | `/api/auth/refresh` | No | Refresh access token |
| POST | `/api/auth/logout` | Yes | Invalidate tokens |
| GET | `/api/me` | Yes | Get user profile |
| PUT | `/api/me` | Yes | Update user profile |
| GET | `/api/me/document` | Yes | Get full user document |
| POST | `/api/me/next-step` | Yes | Get next learning step |
| GET | `/api/learning-paths` | Yes | Get learning paths |
| POST | `/api/subscription/checkout` | Yes | Start Stripe checkout |
| GET | `/api/subscription/status` | Yes | Get subscription status |

### Step 7.6: Testing

```bash
cd backend

# Run all tests
go test ./...

# Run with coverage
go test -v -race -coverprofile=coverage.out ./...

# View coverage report
go tool cover -html=coverage.out

# Run specific package tests
go test -v ./internal/handlers/...
```

---

## 8. Frontend Setup (Expo/React Native)

### Step 8.1: Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Container.tsx
│   ├── screens/             # App screens
│   │   ├── LoginScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   └── ...
│   ├── navigation/          # React Navigation
│   │   └── AppNavigator.tsx
│   ├── services/            # Business logic
│   │   ├── api.ts           # API client
│   │   ├── auth.ts          # Authentication
│   │   └── firebase.ts      # Firebase config
│   ├── state/               # Zustand stores
│   │   └── userStore.ts
│   ├── config/
│   │   └── firebase.config.ts
│   └── types/
│       └── app.ts
├── public/                  # Web static files
├── assets/                  # Images, fonts
├── app.json                 # Expo config
├── package.json
├── tsconfig.json
└── vercel.json              # Vercel deployment config
```

### Step 8.2: Environment Variables

Create `frontend/.env.local`:

```bash
# ===========================================
# FIREBASE CONFIGURATION
# These are public values - safe to include in client code
# ===========================================

EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# ===========================================
# GOOGLE OAUTH CLIENT IDS
# ===========================================

EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=xxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=xxx.apps.googleusercontent.com

# ===========================================
# BACKEND API URL
# ===========================================

# Local development
EXPO_PUBLIC_API_URL=http://localhost:8080/api

# Or production (uncomment when deploying)
# EXPO_PUBLIC_API_URL=https://your-backend-xxxxx-uc.a.run.app/api

# ===========================================
# OPTIONAL: STAGING MODE
# ===========================================

# Set to "true" to use staging backend
# EXPO_PUBLIC_USE_STAGING=false
```

### Step 8.3: Installation

```bash
cd frontend

# Install dependencies
npm install

# Verify TypeScript compiles
npm run type-check

# Expected output: no errors
```

### Step 8.4: Running for Web (Primary Platform)

```bash
cd frontend

# Start development server
npm start

# When Expo menu appears, press 'w' for web
# Or run directly:
npm run web

# Opens browser at http://localhost:8081
```

### Step 8.5: Running for Mobile (Optional)

```bash
# iOS Simulator (macOS only, requires Xcode)
npm run ios

# Android Emulator (requires Android Studio)
npm run android

# Physical device: scan QR code with Expo Go app
npm start
```

### Step 8.6: Building for Production

```bash
# Build web version
npm run build

# Output is in dist/ folder
# This is what Vercel deploys
```

### Step 8.7: Testing

```bash
# Run Jest tests
npm test

# Watch mode
npm run test:watch

# Type checking
npm run type-check

# Linting
npm run lint
```

### Step 8.8: Deploying to Vercel

#### Option A: Automatic (GitHub Integration)

1. Go to [Vercel](https://vercel.com)
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework**: Other
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add environment variables (from `.env.local`)
6. Click **"Deploy"**

#### Option B: Manual CLI

```bash
npm install -g vercel

cd frontend
vercel

# Follow prompts
# Link to existing project or create new
```

---

## 9. LLM / OpenAI Setup

The backend uses OpenAI's API to generate personalized learning content.

### Step 9.1: Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com)
2. Sign up or log in
3. Click your profile → **"View API keys"**
4. Click **"Create new secret key"**
5. Name it: `ishkul-backend`
6. Copy the key (starts with `sk-`)

> **Important**: You can only see the key once. Save it immediately!

### Step 9.2: Configure API Key

Add to `backend/.env`:

```bash
OPENAI_API_KEY=sk-...your-key-here
```

For production (GitHub Secrets), add:
- Secret name: `OPENAI_API_KEY`
- Secret value: `sk-...your-key-here`

### Step 9.3: Understanding the OpenAI Client

The client is in `backend/pkg/openai/client.go`:

```go
// Creates client using OPENAI_API_KEY env var
client, err := openai.NewClient()

// Make a simple completion request
response, err := client.CreateSimpleCompletion(
    systemPrompt,  // Instructions for the AI
    userMessage,   // User's input
    0.8,           // Temperature (0-1, higher = more creative)
    2000,          // Max tokens in response
)
```

### Step 9.4: Model Selection

Models are selected based on user tier (defined in `backend/internal/models/tier.go`):

| Tier | Model | Cost | Use Case |
|------|-------|------|----------|
| Free | `gpt-4o-mini` | ~$0.01/request | Basic learning content |
| Pro | `gpt-4o` | ~$0.10/request | Advanced, detailed content |

### Step 9.5: Custom OpenAI-Compatible Endpoints

You can use alternative providers (Anthropic, local LLMs) by setting:

```bash
OPENAI_BASE_URL=https://your-alternative-api.com/v1
OPENAI_API_KEY=your-alternative-key
```

Compatible with:
- Azure OpenAI
- Anthropic (via proxy)
- Ollama (local)
- vLLM
- LM Studio

### Step 9.6: Cost Management

To control costs:

1. **Set billing limits** in OpenAI dashboard
2. **Use mini models** for most requests
3. **Cache responses** where appropriate
4. **Monitor usage** via OpenAI dashboard

Typical costs:
- Small app (100 users): $5-20/month
- Medium app (1000 users): $50-200/month
- Large app (10000 users): $500-2000/month

---

## 10. GitHub Models & Prompts

Prompts are stored as YAML files for easy editing and GitHub Models integration.

### Step 10.1: Prompts Directory Structure

```
prompts/
├── learning/                    # Learning feature prompts
│   ├── next-step.prompt.yml     # Generate next learning step
│   ├── course-outline.prompt.yml # Generate course outline
│   ├── tool-selector.prompt.yml  # Select appropriate tool
│   ├── compact-memory.prompt.yml # Compress learning memory
│   └── tools/                   # Tool-specific prompts
│       ├── quiz.prompt.yml
│       ├── lesson.prompt.yml
│       ├── practice.prompt.yml
│       ├── flashcard.prompt.yml
│       └── pronunciation.prompt.yml
├── system/                      # System prompts
│   └── learning-coach.prompt.yml
├── code-review.prompt.yml       # Dev tool: code review
├── generate-tests.prompt.yml    # Dev tool: test generation
└── explain-code.prompt.yml      # Dev tool: code explanation
```

### Step 10.2: Prompt File Format

Each `.prompt.yml` file follows this structure:

```yaml
name: Human-readable name
description: What this prompt does
model: gpt-4o-mini  # or gpt-4o, etc.
modelParameters:
  temperature: 0.8
  maxTokens: 2000
messages:
  - role: system
    content: |
      System instructions here.

      Use {{variable}} for template variables.
      Use {{#if condition}}...{{/if}} for conditionals.

  - role: user
    content: |
      User message template.

      Variables available:
      - {{goal}}
      - {{level}}
      - {{memory}}
```

### Step 10.3: Template Variables

The backend replaces template variables before sending to OpenAI:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{goal}}` | User's learning goal | "Learn Spanish" |
| `{{level}}` | Proficiency level | "beginner" |
| `{{memory}}` | Learning memory JSON | `{"topics": {...}}` |
| `{{historyCount}}` | Total steps completed | 42 |
| `{{recentHistory}}` | Recent learning history | "quiz: verbs, lesson: nouns" |
| `{{currentTopic}}` | Current topic to teach | "Present tense conjugation" |

### Step 10.4: Loading Prompts in Backend

```go
// Initialize loader
loader := prompts.NewLoader("prompts")

// Load a prompt by path
template, err := loader.Load("learning/next-step")

// Access template fields
fmt.Println(template.Name)        // "Generate Next Learning Step"
fmt.Println(template.Model)       // "gpt-4o-mini"
fmt.Println(template.Messages[0]) // System message
```

### Step 10.5: GitHub Models Integration

GitHub Models (preview) allows running prompts directly from GitHub's UI.

**To use**:
1. Go to your repository on GitHub
2. Click **"Models"** tab (if available)
3. Select a `.prompt.yml` file
4. Click **"Run in Prompt Editor"**
5. Fill in template variables
6. Run and compare with different models

**To evaluate prompts in CI** (future feature):
```bash
gh models eval prompts/learning/next-step.prompt.yml \
  --variables '{"goal": "Learn Python", "level": "beginner"}'
```

### Step 10.6: Creating New Prompts

1. Create file: `prompts/your-feature/your-prompt.prompt.yml`
2. Follow the YAML structure above
3. Test locally with the backend
4. Commit to repository
5. Prompt is automatically available in GitHub Models

---

## 11. Firestore Security Rules

Security rules control who can read/write data in Firestore.

### Step 11.1: Rules File Location

```
firebase/firestore.rules
```

### Step 11.2: Complete Rules Explained

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // =============================================
    // USERS COLLECTION
    // Users can only read/write their own documents
    // =============================================
    match /users/{userId} {
      // Allow if authenticated AND accessing own document
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;

      // Subcollections (usage tracking, etc.)
      match /{subcollection}/{document=**} {
        allow read, write: if request.auth != null
                           && request.auth.uid == userId;
      }
    }

    // =============================================
    // PROGRESS COLLECTION
    // Users can read/write their own progress
    // =============================================
    match /progress/{progressId} {
      // Read: auth required, must be document owner
      allow read: if request.auth != null
                  && request.auth.uid == resource.data.userId;

      // Write: auth required, must be setting own userId
      allow write: if request.auth != null
                   && request.auth.uid == request.resource.data.userId;
    }

    // =============================================
    // LESSONS COLLECTION
    // Public read, admin-only write
    // =============================================
    match /lessons/{lessonId} {
      // Anyone can read lessons
      allow read: if true;

      // Only admins can write
      allow write: if request.auth != null
                   && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // =============================================
    // PREVIEW/STAGING DATA ISOLATION
    // Collections with prefixes (pr_123_, staging_)
    // =============================================
    match /pr_{prNumber}_users/{userId} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }

    match /staging_users/{userId} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }
  }
}
```

### Step 11.3: Testing Rules Locally

```bash
# Install Firebase Emulators
firebase emulators:start --only firestore

# In another terminal, run tests
cd firebase
npm test  # If you have rules tests
```

### Step 11.4: Deploying Rules

```bash
cd firebase

# Deploy Firestore rules only
firebase deploy --only firestore:rules --project=your-project-id

# Deploy all Firebase (rules + indexes + storage)
firebase deploy --project=your-project-id
```

### Step 11.5: Common Rules Patterns

**Allow authenticated users only**:
```javascript
allow read, write: if request.auth != null;
```

**Allow owner only**:
```javascript
allow read, write: if request.auth.uid == userId;
```

**Allow if field matches user**:
```javascript
allow read: if resource.data.userId == request.auth.uid;
```

**Validate data on write**:
```javascript
allow write: if request.resource.data.title is string
             && request.resource.data.title.size() <= 100;
```

**Rate limiting** (advanced):
```javascript
allow write: if request.time > resource.data.lastWrite + duration.value(1, 's');
```

---

## 12. CI/CD Pipeline (GitHub Actions)

### Step 12.1: Workflow Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CI/CD PIPELINE                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  TRIGGER: Push to any branch / Pull Request                        │
│                     │                                               │
│                     ▼                                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    CI (ci.yml)                               │   │
│  │  ┌─────────────────┐    ┌─────────────────┐                 │   │
│  │  │    Frontend     │    │     Backend     │                 │   │
│  │  │  - Type check   │    │  - go mod tidy  │                 │   │
│  │  │  - ESLint       │    │  - gofmt        │                 │   │
│  │  │  - Build        │    │  - go test      │                 │   │
│  │  │  - Jest tests   │    │  - Docker build │                 │   │
│  │  └─────────────────┘    └─────────────────┘                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                     │                                               │
│                     ▼                                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │               DEPLOYMENT TRIGGERS                            │   │
│  │                                                              │   │
│  │  Pull Request ──────► Preview (ishkul-backend-pr-123)       │   │
│  │                       - Stripe disabled                      │   │
│  │                       - Data prefix: pr_123_                 │   │
│  │                                                              │   │
│  │  Push to main ──────► Staging (ishkul-backend-staging)      │   │
│  │                       - Stripe: test mode                    │   │
│  │                       - Data prefix: staging_                │   │
│  │                                                              │   │
│  │  Release tag ───────► Production (ishkul-backend)           │   │
│  │  (v1.0.0)             - Stripe: live mode                   │   │
│  │                       - No data prefix                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   VERCEL (Frontend)                          │   │
│  │  - Auto-deploys on push to main                             │   │
│  │  - Preview deployments for PRs                              │   │
│  │  - Ignores backend/ and firebase/ changes                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 12.2: GitHub Secrets Required

Go to Repository **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

#### Core Secrets (Required)

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `GCP_PROJECT_ID` | Google Cloud project ID | `your-project-id` |
| `GCP_SA_KEY` | Base64-encoded service account key | See Step 5.4 |
| `JWT_SECRET` | JWT signing secret | `openssl rand -base64 32` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |

#### Google OAuth (Required)

| Secret Name | Description |
|-------------|-------------|
| `GOOGLE_WEB_CLIENT_ID` | Web OAuth client ID |
| `GOOGLE_IOS_CLIENT_ID` | iOS OAuth client ID |
| `GOOGLE_ANDROID_CLIENT_ID` | Android OAuth client ID |

#### Firebase (Required)

| Secret Name | Description |
|-------------|-------------|
| `FIREBASE_DATABASE_URL` | `https://project.firebaseio.com` |
| `FIREBASE_STORAGE_BUCKET` | `project.appspot.com` |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase web API key |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | `project.firebaseapp.com` |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Project ID |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |

#### CORS (Required)

| Secret Name | Description |
|-------------|-------------|
| `ALLOWED_ORIGINS` | Comma-separated origins |

Example: `https://your-app.vercel.app,https://yourdomain.com`

#### Stripe (Optional)

| Secret Name | Description |
|-------------|-------------|
| `STRIPE_SECRET_KEY` | Live secret key (`sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Live webhook secret |
| `STRIPE_PRO_PRICE_ID` | Live price ID |
| `STRIPE_TEST_SECRET_KEY` | Test secret key (`sk_test_...`) |
| `STRIPE_TEST_WEBHOOK_SECRET` | Test webhook secret |
| `STRIPE_TEST_PRO_PRICE_ID` | Test price ID |

### Step 12.3: Workflow Files

#### `.github/workflows/ci.yml` - Testing

```yaml
name: CI

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm run build
      - run: npm test -- --passWithNoTests

  backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.23'
      - run: go mod tidy && git diff --exit-code go.mod go.sum
      - run: test -z $(gofmt -l .)
      - run: go build -o /dev/null ./cmd/server
      - run: go test -race -coverprofile=coverage.out ./...
```

#### `.github/workflows/deploy-backend.yml` - Production

```yaml
name: Deploy Backend (Production)

on:
  release:
    types: [published]

jobs:
  deploy:
    uses: ./.github/workflows/deploy-backend-reusable.yml
    with:
      environment: production
      service_name: ishkul-backend
      region: northamerica-northeast1
      min_instances: 1
      max_instances: 100
      memory: 1Gi
      cpu: 2
    secrets: inherit
```

### Step 12.4: Creating a Release

To trigger production deployment:

```bash
# Create and push a tag
git tag v1.0.0
git push origin v1.0.0

# Or create release via GitHub UI:
# 1. Go to repository → Releases
# 2. Click "Create a new release"
# 3. Enter tag: v1.0.0
# 4. Enter release notes
# 5. Click "Publish release"
```

### Step 12.5: Monitoring Deployments

1. Go to repository **Actions** tab
2. Click on running workflow
3. View logs for each job
4. Check Cloud Run console for service status

---

## 13. Stripe Integration (Optional)

Skip this section if you want a free, self-hosted version without payments.

### Step 13.1: Create Stripe Account

1. Go to [Stripe](https://stripe.com)
2. Click **"Start now"**
3. Complete account setup
4. Verify your email

### Step 13.2: Get API Keys

1. Go to **Developers** → **API keys**
2. Copy:
   - **Publishable key**: `pk_test_...` (frontend)
   - **Secret key**: `sk_test_...` (backend)

### Step 13.3: Create Product and Price

1. Go to **Products** → **Add product**
2. Fill in:
   - Name: `Pro Subscription`
   - Description: `Unlimited learning with advanced AI models`
3. Add pricing:
   - Pricing model: **Recurring**
   - Price: `$2.00` (or your price)
   - Billing period: **Monthly**
4. Click **Save product**
5. Copy the **Price ID**: `price_...`

### Step 13.4: Set Up Webhook

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter:
   - Endpoint URL: `https://your-backend.run.app/api/webhooks/stripe`
   - Events to send:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
4. Click **Add endpoint**
5. Copy the **Signing secret**: `whsec_...`

### Step 13.5: Configure Environment Variables

Add to `backend/.env`:

```bash
# Test mode
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
APP_URL=http://localhost:3000

# For production, use live keys:
# STRIPE_SECRET_KEY=sk_live_...
# STRIPE_WEBHOOK_SECRET=whsec_live_...
# STRIPE_PRO_PRICE_ID=price_live_...
# APP_URL=https://yourdomain.com
```

### Step 13.6: Test Cards

Use these card numbers in test mode:

| Card Number | Result |
|-------------|--------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Decline |
| `4000 0025 0000 3155` | Requires 3D Secure |

Use any future expiry date and any CVC.

### Step 13.7: Testing the Flow

1. Start backend with Stripe keys configured
2. Start frontend
3. Log in as a user
4. Go to subscription page
5. Click "Upgrade to Pro"
6. Enter test card: `4242 4242 4242 4242`
7. Complete checkout
8. Verify user tier changed to "pro" in Firestore

---

## 14. Running Without Stripe (Self-Hosted)

For personal use or open-source deployments without payments.

### Step 14.1: Option A - All Users Get Pro (Recommended)

Modify `backend/internal/models/tier.go`:

```go
// GetCurrentTier returns the user's current tier
// MODIFIED: Always return Pro for self-hosted deployment
func (u *User) GetCurrentTier() string {
    // Uncomment original code if you add payments later:
    // if u.PaidUntil != nil && u.PaidUntil.After(time.Now()) {
    //     return TierPro
    // }
    // return u.Tier

    // Self-hosted: everyone is Pro
    return TierPro
}
```

Or set an environment variable:

```bash
# In backend/.env
SELF_HOSTED_MODE=true
```

Then in code:

```go
func (u *User) GetCurrentTier() string {
    if os.Getenv("SELF_HOSTED_MODE") == "true" {
        return TierPro
    }
    // ... original logic
}
```

### Step 14.2: Option B - Remove Stripe Code Entirely

1. Remove Stripe environment variables from `.env`
2. Remove Stripe routes from `cmd/server/main.go`:

```go
// Comment out or remove these lines:
// router.HandleFunc("/api/subscription/checkout", ...).Methods("POST")
// router.HandleFunc("/api/subscription/status", ...).Methods("GET")
// router.HandleFunc("/api/webhooks/stripe", ...).Methods("POST")
```

3. The backend will work without Stripe if the env vars are not set

### Step 14.3: Frontend Changes (Optional)

Hide payment UI in `frontend/src/screens/`:

```typescript
// In any component that shows upgrade button:
const SELF_HOSTED = process.env.EXPO_PUBLIC_SELF_HOSTED === 'true';

// In render:
{!SELF_HOSTED && (
  <Button onPress={handleUpgrade}>Upgrade to Pro</Button>
)}
```

Or simply don't navigate to payment screens.

### Step 14.4: Tier Limits for Self-Hosted

With everyone as "Pro", the limits are:

| Feature | Limit |
|---------|-------|
| Daily learning steps | 1000 |
| Active learning paths | 5 |
| AI Model | `gpt-4o` (or your configured model) |

Adjust in `backend/internal/models/tier.go` if needed:

```go
const (
    ProDailyStepLimit = 10000  // Increase for self-hosted
    ProMaxActivePaths = 10     // Increase for self-hosted
)
```

---

## 15. Domain & SSL Setup

### Step 15.1: Custom Domain for Vercel (Frontend)

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project
3. Go to **Settings** → **Domains**
4. Click **Add**
5. Enter your domain: `yourdomain.com`
6. Add DNS records as instructed:

```
Type    Name    Value
A       @       76.76.21.21
CNAME   www     cname.vercel-dns.com
```

7. Wait for DNS propagation (up to 48 hours)
8. SSL is automatic

### Step 15.2: Custom Domain for Cloud Run (Backend)

1. Go to [Cloud Run Console](https://console.cloud.google.com/run)
2. Select your service
3. Click **Manage Custom Domains**
4. Click **Add Mapping**
5. Select your service
6. Enter subdomain: `api.yourdomain.com`
7. Add DNS records as instructed:

```
Type    Name    Value
CNAME   api     ghs.googlehosted.com
```

8. SSL is automatic (managed by Google)

### Step 15.3: Update CORS After Domain Setup

Update `ALLOWED_ORIGINS` in backend:

```bash
# GitHub Secret or .env
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,https://your-app.vercel.app
```

### Step 15.4: Update Frontend API URL

```bash
# frontend/.env.local (production)
EXPO_PUBLIC_API_URL=https://api.yourdomain.com/api
```

---

## 16. Complete Checklist

### Phase 1: Accounts & Tools

- [ ] Create Google Cloud account with billing enabled
- [ ] Create Firebase project
- [ ] Create GitHub account
- [ ] Create Vercel account
- [ ] Create OpenAI account
- [ ] Install Node.js 20+
- [ ] Install Go 1.24+
- [ ] Install Google Cloud SDK
- [ ] Install Firebase CLI

### Phase 2: Firebase Setup

- [ ] Enable Firestore Database
- [ ] Enable Authentication (Google provider)
- [ ] Enable Cloud Storage
- [ ] Get Firebase configuration values
- [ ] Download service account key

### Phase 3: Google Cloud Setup

- [ ] Enable required APIs
- [ ] Create GitHub Actions service account
- [ ] Grant IAM roles to service account
- [ ] Create service account key (base64 encoded)
- [ ] Create JWT_SECRET in Secret Manager

### Phase 4: OAuth Setup

- [ ] Configure OAuth consent screen
- [ ] Create Web OAuth client ID
- [ ] Create iOS OAuth client ID (optional)
- [ ] Create Android OAuth client ID (optional)
- [ ] Configure authorized origins and redirects

### Phase 5: Local Development

- [ ] Clone repository
- [ ] Create `backend/.env` with all variables
- [ ] Create `frontend/.env.local` with all variables
- [ ] Copy `serviceAccountKey.json` to backend/
- [ ] Run backend: `go run cmd/server/main.go`
- [ ] Run frontend: `npm start` → press 'w'
- [ ] Test health endpoint: `curl http://localhost:8080/health`
- [ ] Test Google Sign-In flow

### Phase 6: GitHub Setup

- [ ] Push code to GitHub repository
- [ ] Add all GitHub Secrets (see Section 12.2)
- [ ] Verify CI workflow passes
- [ ] Create first release tag: `v0.1.0`

### Phase 7: Deployment

- [ ] Verify Cloud Run service is deployed
- [ ] Note Cloud Run service URL
- [ ] Verify Vercel deployment
- [ ] Note Vercel deployment URL
- [ ] Test production endpoints

### Phase 8: Firebase Rules

- [ ] Review `firebase/firestore.rules`
- [ ] Deploy rules: `firebase deploy --only firestore`
- [ ] Test rules with authenticated requests

### Phase 9: Optional - Stripe

- [ ] Create Stripe account
- [ ] Create product and price
- [ ] Set up webhook endpoint
- [ ] Add Stripe secrets to GitHub
- [ ] Test with test cards

### Phase 10: Optional - Custom Domain

- [ ] Add domain to Vercel
- [ ] Add domain mapping to Cloud Run
- [ ] Update CORS configuration
- [ ] Update frontend API URL
- [ ] Verify SSL certificates

### Final Verification

- [ ] End-to-end test: Sign in → Complete learning step → Sign out
- [ ] Check Firestore for user document
- [ ] Check Cloud Run logs for errors
- [ ] Monitor OpenAI usage

---

## 17. Appendix

### A: Complete Environment Variable Reference

#### Backend (`backend/.env`)

```bash
# REQUIRED
GOOGLE_APPLICATION_CREDENTIALS=serviceAccountKey.json
FIREBASE_DATABASE_URL=https://PROJECT.firebaseio.com
FIREBASE_STORAGE_BUCKET=PROJECT.appspot.com
PORT=8080
ENVIRONMENT=development
JWT_SECRET=your-secret-here
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081
GOOGLE_WEB_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_IOS_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID=xxx.apps.googleusercontent.com
OPENAI_API_KEY=sk-...

# OPTIONAL
OPENAI_BASE_URL=https://api.openai.com/v1
FIRESTORE_COLLECTION_PREFIX=
SELF_HOSTED_MODE=false
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
APP_URL=https://yourdomain.com
RATE_LIMIT_STANDARD_RPS=10.0
RATE_LIMIT_AUTH_RPS=5.0
RATE_LIMIT_EXPENSIVE_RPS=2.0
```

#### Frontend (`frontend/.env.local`)

```bash
# REQUIRED
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=PROJECT.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=PROJECT
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=PROJECT.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123:web:abc
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=xxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=xxx.apps.googleusercontent.com
EXPO_PUBLIC_API_URL=http://localhost:8080/api

# OPTIONAL
EXPO_PUBLIC_USE_STAGING=false
EXPO_PUBLIC_SELF_HOSTED=false
```

### B: Troubleshooting Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `GOOGLE_APPLICATION_CREDENTIALS not found` | Missing service account key | Download from Firebase Console |
| `CORS error in browser` | Backend ALLOWED_ORIGINS wrong | Add frontend URL to ALLOWED_ORIGINS |
| `401 Unauthorized` | JWT expired or invalid | Check JWT_SECRET matches, refresh token |
| `Google Sign-In popup closes immediately` | OAuth origins misconfigured | Add localhost to authorized origins |
| `Firestore permission denied` | Security rules blocking | Check rules match auth.uid |
| `OpenAI rate limit` | Too many requests | Add retry logic or reduce frequency |
| `Cloud Run cold start slow` | Min instances = 0 | Set min instances = 1 for production |
| `Stripe webhook 400` | Wrong webhook secret | Copy correct whsec_ from Stripe dashboard |

### C: Useful Commands

```bash
# View Cloud Run logs
gcloud run services logs read ishkul-backend --limit=50 --region=northamerica-northeast1

# Update Cloud Run env var
gcloud run services update ishkul-backend --set-env-vars="KEY=value" --region=northamerica-northeast1

# Deploy Firebase rules
firebase deploy --only firestore:rules --project=your-project

# Generate new JWT secret
openssl rand -base64 32

# Check service account permissions
gcloud projects get-iam-policy YOUR_PROJECT_ID --flatten="bindings[].members" --filter="bindings.members:github-actions@"

# Kill process on port 8080
lsof -i :8080 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Test API endpoint
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"googleIdToken": "..."}'
```

### D: Security Best Practices

1. **Never commit secrets** - Use `.env` files and GitHub Secrets
2. **Rotate keys regularly** - Service account keys, JWT secrets
3. **Use least privilege** - Only grant necessary IAM roles
4. **Enable audit logging** - Cloud Audit Logs for compliance
5. **Set up alerts** - Budget alerts, error rate alerts
6. **Use HTTPS everywhere** - Enforced by Vercel and Cloud Run
7. **Validate all inputs** - Backend should never trust client data
8. **Rate limit APIs** - Already configured in this setup
9. **Keep dependencies updated** - `npm audit`, `go mod tidy`
10. **Review Firestore rules** - Before every production deploy

### E: Scaling Considerations

| Users | Cloud Run Config | Firestore | OpenAI Tier |
|-------|------------------|-----------|-------------|
| 1-100 | Min: 0, Max: 2, 512MB | Free tier | Pay-as-you-go |
| 100-1K | Min: 1, Max: 10, 1GB | Pay-as-you-go | Tier 1 |
| 1K-10K | Min: 2, Max: 50, 2GB | Pay-as-you-go | Tier 2 |
| 10K+ | Min: 5, Max: 100, 4GB | Consider caching | Tier 3+ |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-12-04 | Initial comprehensive guide |

---

*This document is designed to be self-contained. If you're reading this in 2034 and some services have changed, the core concepts (OAuth, JWT, NoSQL, serverless containers) should still apply. Adapt the specific steps to whatever platforms exist then.*
