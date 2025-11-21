# Ishkul Deployment Guide

This guide covers deploying the Ishkul platform with a React Native frontend and Go backend integrated with Firebase.

## Architecture Overview

```
Ishkul Platform
├── Frontend (React Native/Expo)
│   ├── Web (Vercel/Netlify)
│   ├── iOS (App Store)
│   └── Android (Play Store)
└── Backend (Go + Firebase)
    ├── Firebase Functions (Serverless)
    ├── Cloud Run (Containerized)
    └── Firestore (Database)
    └── Firebase Storage (File Storage)
```

## Prerequisites

- Firebase Project (with Billing enabled for Cloud Functions)
- Go 1.21 or higher
- Node.js 18 or higher
- Firebase CLI: `npm install -g firebase-tools`
- Google Cloud CLI: https://cloud.google.com/sdk/docs/install

## Part 1: Firebase Setup

### 1.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Enter project name (e.g., "ishkul")
4. Enable Google Analytics (optional)
5. Click "Create Project"

### 1.2 Enable Required Services

```bash
# Login to Firebase
firebase login

# Select your project
firebase use --add

# Enable required services in Firebase Console:
# - Authentication (Email/Password, Google Sign-In)
# - Firestore Database
# - Storage
# - Functions
```

### 1.3 Configure Firestore

1. Go to Firebase Console → Firestore Database
2. Click "Create Database"
3. Choose "Start in production mode"
4. Select a location (choose closest to your users)
5. Click "Enable"

Update Firestore rules for security:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Progress collection
    match /progress/{progressId} {
      allow read: if request.auth != null &&
                     request.auth.uid == resource.data.userId;
      allow write: if request.auth != null &&
                      request.auth.uid == request.resource.data.userId;
    }

    // Lessons collection (public read, admin write)
    match /lessons/{lessonId} {
      allow read: if true;
      allow write: if request.auth != null &&
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

### 1.4 Configure Storage

1. Go to Firebase Console → Storage
2. Click "Get Started"
3. Use production mode rules
4. Update Storage rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /uploads/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 1.5 Generate Service Account Key

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Save as `serviceAccountKey.json` in the backend directory
4. **IMPORTANT**: Add to `.gitignore` (already done)

## Part 2: Backend Deployment

### Option A: Deploy to Firebase Functions (Recommended)

Firebase Functions is serverless and scales automatically.

#### 2.1 Prepare Backend for Functions

Create `backend/function.go`:

```go
package backend

import (
    "net/http"
    "github.com/mesbahtanvir/ishkul/backend/cmd/server"
)

// Handler is the Cloud Function entry point
func Handler(w http.ResponseWriter, r *http.Request) {
    // Your existing main.go HTTP handler logic
    server.ServeHTTP(w, r)
}
```

#### 2.2 Initialize Firebase Functions

```bash
# From project root
firebase init functions

# Select:
# - Use existing project
# - Language: Go (if available) or Node.js with exec
# - Install dependencies: Yes
```

#### 2.3 Configure firebase.json

```json
{
  "functions": {
    "source": "backend",
    "runtime": "go121",
    "region": "us-central1"
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

#### 2.4 Deploy Functions

```bash
# Set environment variables
firebase functions:config:set \
  backend.storage_bucket="your-project.appspot.com" \
  backend.allowed_origins="https://your-frontend-url.com"

# Deploy
firebase deploy --only functions
```

### Option B: Deploy to Google Cloud Run (Alternative)

Cloud Run gives you more control and supports any containerized application.

#### 2.1 Create Dockerfile

Create `backend/Dockerfile`:

```dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server ./cmd/server

FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy binary and credentials
COPY --from=builder /app/server .
COPY serviceAccountKey.json .

EXPOSE 8080

CMD ["./server"]
```

#### 2.2 Build and Deploy

```bash
# Set your project ID
export PROJECT_ID="your-project-id"
export REGION="us-central1"

# Enable Cloud Run API
gcloud services enable run.googleapis.com

# Build container
gcloud builds submit --tag gcr.io/$PROJECT_ID/ishkul-backend backend/

# Deploy to Cloud Run
gcloud run deploy ishkul-backend \
  --image gcr.io/$PROJECT_ID/ishkul-backend \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars FIREBASE_STORAGE_BUCKET=your-project.appspot.com \
  --set-env-vars ALLOWED_ORIGINS=https://your-frontend-url.com

# Get the service URL
gcloud run services describe ishkul-backend --region $REGION --format 'value(status.url)'
```

### 2.3 Set Environment Variables

For Cloud Run:
```bash
gcloud run services update ishkul-backend \
  --region $REGION \
  --set-env-vars FIREBASE_CREDENTIALS_PATH=/root/serviceAccountKey.json \
  --set-env-vars FIREBASE_STORAGE_BUCKET=your-project.appspot.com \
  --set-env-vars ALLOWED_ORIGINS=https://your-frontend.com
```

For Firebase Functions:
```bash
firebase functions:config:set \
  firebase.credentials_path="serviceAccountKey.json" \
  firebase.storage_bucket="your-project.appspot.com" \
  cors.allowed_origins="https://your-frontend.com"
```

## Part 3: Frontend Deployment

### 3.1 Configure Frontend

Update `frontend/.env`:

```env
EXPO_PUBLIC_API_URL=https://your-backend-url.com/api
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
```

Get these values from Firebase Console → Project Settings → Your apps → Web app

### 3.2 Web Deployment (Vercel)

```bash
cd frontend

# Install Vercel CLI
npm install -g vercel

# Build for web
npm run build

# Deploy
vercel --prod
```

Or connect your GitHub repo to Vercel:
1. Go to [Vercel Dashboard](https://vercel.com)
2. Import Git Repository
3. Select your repo
4. Configure:
   - Framework Preset: Other
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Add environment variables from `.env`
6. Deploy

### 3.3 Mobile App Deployment

#### iOS (App Store)

```bash
cd frontend

# Build for iOS
eas build --platform ios

# Submit to App Store
eas submit --platform ios
```

#### Android (Play Store)

```bash
cd frontend

# Build for Android
eas build --platform android

# Submit to Play Store
eas submit --platform android
```

## Part 4: Database Initialization

### 4.1 Create Sample Data

Create `backend/scripts/seed.go`:

```go
package main

import (
    "context"
    "log"

    "github.com/mesbahtanvir/ishkul/backend/internal/models"
    "github.com/mesbahtanvir/ishkul/backend/pkg/firebase"
)

func main() {
    ctx := context.Background()

    if err := firebase.Initialize(ctx); err != nil {
        log.Fatal(err)
    }
    defer firebase.Cleanup()

    fs := firebase.GetFirestore()

    // Create sample lessons
    lessons := []models.Lesson{
        {
            ID: "lesson-1",
            Title: "Introduction to Arabic Alphabet",
            Description: "Learn the basics of Arabic letters",
            Level: "beginner",
            Category: "alphabet",
            Order: 1,
            Duration: 15,
        },
        // Add more lessons...
    }

    for _, lesson := range lessons {
        _, err := fs.Collection("lessons").Doc(lesson.ID).Set(ctx, lesson)
        if err != nil {
            log.Printf("Error adding lesson: %v", err)
        }
    }

    log.Println("Database seeded successfully")
}
```

Run:
```bash
cd backend
go run scripts/seed.go
```

## Part 5: CI/CD Setup

### 5.1 GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.21'

      - name: Deploy to Cloud Run
        uses: google-github-actions/deploy-cloudrun@v1
        with:
          service: ishkul-backend
          region: us-central1
          source: ./backend
          credentials: ${{ secrets.GCP_SA_KEY }}

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: cd frontend && npm ci

      - name: Build
        run: cd frontend && npm run build
        env:
          EXPO_PUBLIC_API_URL: ${{ secrets.API_URL }}

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./frontend
```

### 5.2 Add Secrets to GitHub

1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Add:
   - `GCP_SA_KEY`: Service account key JSON
   - `VERCEL_TOKEN`: Vercel auth token
   - `VERCEL_ORG_ID`: Vercel organization ID
   - `VERCEL_PROJECT_ID`: Vercel project ID
   - `API_URL`: Backend API URL

## Part 6: Monitoring and Logs

### 6.1 Cloud Logging

View logs:
```bash
# Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ishkul-backend" --limit 50

# Firebase Functions logs
firebase functions:log
```

### 6.2 Error Reporting

Enable in Google Cloud Console:
1. Go to Error Reporting
2. View errors and stack traces
3. Set up notifications

### 6.3 Performance Monitoring

Firebase Console → Performance:
- Monitor API response times
- Track database queries
- Monitor app performance

## Part 7: Backup and Security

### 7.1 Firestore Backup

```bash
# Export Firestore data
gcloud firestore export gs://your-backup-bucket/$(date +%Y%m%d)

# Schedule daily backups
gcloud scheduler jobs create http firestore-backup \
  --schedule="0 2 * * *" \
  --uri="https://firestore.googleapis.com/v1/projects/your-project/databases/(default):exportDocuments" \
  --message-body='{"outputUriPrefix":"gs://your-backup-bucket"}'
```

### 7.2 Security Checklist

- [ ] Service account key not in Git
- [ ] Firestore rules properly configured
- [ ] Storage rules properly configured
- [ ] CORS configured for your domains only
- [ ] Environment variables set securely
- [ ] HTTPS enforced
- [ ] Authentication required for sensitive endpoints
- [ ] Rate limiting enabled (via Cloud Armor or Firebase App Check)

## Costs Estimate

### Firebase (Free Tier + Usage)
- Firestore: Free tier (50K reads, 20K writes, 20K deletes per day)
- Storage: Free tier (5GB, 1GB transfer per day)
- Functions: Free tier (2M invocations, 400K GB-seconds per month)

### Cloud Run (If used)
- ~$5-20/month for low traffic
- Scales with usage

### Total Estimated Cost
- Small app: $0-10/month (within free tiers)
- Medium app (10K users): $20-50/month
- Large app (100K+ users): $100-500/month

## Troubleshooting

### Backend won't start
```bash
# Check logs
gcloud run services logs ishkul-backend --region us-central1

# Common issues:
# - Missing service account key
# - Wrong environment variables
# - Firestore not initialized
```

### CORS errors
```bash
# Update allowed origins
gcloud run services update ishkul-backend \
  --set-env-vars ALLOWED_ORIGINS=https://your-domain.com
```

### Database connection issues
```bash
# Verify Firestore is enabled
# Check service account has Firestore permissions
# Verify credentials path is correct
```

## Support

- Firebase Documentation: https://firebase.google.com/docs
- Cloud Run Documentation: https://cloud.google.com/run/docs
- Expo Documentation: https://docs.expo.dev

---

**Next Steps:**
1. Complete Firebase setup
2. Deploy backend to Cloud Run or Functions
3. Deploy frontend to Vercel
4. Test end-to-end functionality
5. Set up monitoring and alerts
6. Configure CI/CD pipeline
