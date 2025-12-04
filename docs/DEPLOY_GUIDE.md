# Ishkul Deployment Guide (No .env Required!)

Deploy both frontend and backend to Firebase/Google Cloud with modern best practices - no deprecated `.env` files needed!

## 🎯 Modern Configuration Approach

This project uses:
- ✅ **Firebase Config File** (`firebase/config.ts`) - committed to git, safe public identifiers
- ✅ **Google Cloud Secret Manager** - for sensitive backend credentials
- ✅ **Expo Environment Variables** - only for runtime API URL
- ❌ **No `.env` files** - deprecated by Firebase

## Prerequisites

### 1. Install Tools

```bash
# Firebase CLI
npm install -g firebase-tools

# Google Cloud CLI
# macOS:
brew install --cask google-cloud-sdk

# Other platforms:
# https://cloud.google.com/sdk/docs/install
```

### 2. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Blaze (pay-as-you-go)** plan for Cloud Run
4. Note your project ID

### 3. Enable APIs

```bash
# Login
firebase login
gcloud auth login

# Enable required Google Cloud APIs
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  firestore.googleapis.com \
  storage-component.googleapis.com \
  secretmanager.googleapis.com
```

## 🚀 Quick Start (3 Steps)

### Step 1: Configure Project ID

Edit [`.firebaserc`](.firebaserc):

```json
{
  "projects": {
    "default": "your-actual-project-id"
  }
}
```

Set gcloud project:

```bash
gcloud config set project your-actual-project-id
```

### Step 2: Configure Firebase

Run the configuration helper:

```bash
./scripts/configure-firebase.sh
```

Or manually update [`firebase/config.ts`](firebase/config.ts):

1. Go to [Firebase Console](https://console.firebase.google.com) → Your Project → Settings
2. Scroll to "Your apps"
3. Add a Web app if you haven't
4. Copy the config values
5. Update `firebase/config.ts`:

```typescript
export const firebaseConfig = {
  apiKey: "AIza...",  // From Firebase Console
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
};
```

**Note:** These values are safe to commit! They're public identifiers. Security is handled by Firestore/Storage rules.

### Step 3: Setup Backend Secrets (Optional but Recommended)

```bash
# Download service account key from Firebase Console
# Project Settings → Service Accounts → Generate New Private Key
# Save as: backend/serviceAccountKey.json

# Store in Secret Manager
./scripts/setup-secrets.sh
```

This stores your service account key securely in Google Cloud Secret Manager.

**Alternative:** Skip this step and use Cloud Run's default service account (less secure but simpler).

### Step 4: Deploy!

```bash
git push origin main  # Triggers GitHub Actions deployment
```

That's it! The script will:
1. Build frontend
2. Deploy to Firebase Hosting
3. Build backend Docker image
4. Deploy to Cloud Run (with secrets from Secret Manager)
5. Deploy Firestore & Storage rules

## 📁 Configuration Files

### Frontend Config: `firebase/config.ts`

```typescript
export const firebaseConfig = {
  // Public Firebase identifiers - safe to commit
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

export const apiConfig = {
  // Auto-set during deployment or use for local dev
  baseURL: process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080/api",
};
```

### Backend Secrets: Google Cloud Secret Manager

Sensitive credentials are stored in Secret Manager:
- `firebase-service-account` - Firebase Admin SDK credentials
- `storage-bucket` - Storage bucket name

Cloud Run automatically mounts these at runtime.

## 🛠 Available Commands

```bash
# Deploy everything
git push origin main  # Triggers GitHub Actions deployment

# Deploy components individually
git push origin main  # Triggers GitHub Actions deployment:frontend    # Frontend to Firebase Hosting
git push origin main  # Triggers GitHub Actions deployment:backend     # Backend to Cloud Run
git push origin main  # Triggers GitHub Actions deployment:firestore   # Firestore rules
git push origin main  # Triggers GitHub Actions deployment:storage     # Storage rules

# Setup
./scripts/setup-secrets.sh        # Configure Secret Manager
./scripts/configure-firebase.sh   # Help configure Firebase

# Local development
npm run dev:frontend       # Start Expo dev server
npm run dev:backend        # Start Go backend locally

# Build locally
npm run build:frontend
npm run build:backend
```

## 🔄 Update Workflow

### After First Deployment

1. Get your backend URL from deployment output
2. For production builds, set the API URL:

```bash
# Option 1: Build with environment variable
cd frontend
EXPO_PUBLIC_API_URL=https://your-backend-url.run.app/api npm run build
cd ..
git push origin main  # Triggers GitHub Actions deployment:frontend

# Option 2: Update firebase/config.ts (for production)
# Change apiConfig.baseURL to your Cloud Run URL
```

### Updating Frontend

```bash
# Make changes, then:
git push origin main  # Triggers GitHub Actions deployment:frontend
```

### Updating Backend

```bash
# Make changes, then:
git push origin main  # Triggers GitHub Actions deployment:backend
```

#### Updating Backend Environment Variables

Update Cloud Run environment variables without redeploying:

```bash
# Quick update with defaults
./scripts/update-backend-env.sh

# Update to staging environment
./scripts/update-backend-env.sh --environment staging

# Update with custom Firebase URL
./scripts/update-backend-env.sh --firebase-db-url https://my-db.firebaseio.com

# View all options
./scripts/update-backend-env.sh --help
```

**Environment Variables Available:**
- `FIREBASE_DATABASE_URL` - Firebase Realtime Database URL
- `FIREBASE_STORAGE_BUCKET` - Firebase Storage Bucket
- `ENVIRONMENT` - Current environment (development/staging/production)

**What this does:**
- Updates Cloud Run service without rebuilding
- Changes take effect in ~10 seconds
- No downtime
- No need to commit and push changes

### Updating Database Rules

```bash
# Edit firestore.rules or storage.rules, then:
git push origin main  # Triggers GitHub Actions deployment:firestore
git push origin main  # Triggers GitHub Actions deployment:storage
```

## 🔐 Security Best Practices

### ✅ What's Safe to Commit

- `firebase/config.ts` - Public Firebase identifiers
- `firebase.json`, `firestore.rules`, `storage.rules` - Configuration
- `.firebaserc` - Project references

### ❌ Never Commit

- `backend/serviceAccountKey.json` - Use Secret Manager instead
- `.env` files with secrets - Deprecated anyway

### 🛡️ Security Layers

1. **Firestore Rules** - Control database access
2. **Storage Rules** - Control file access
3. **CORS Configuration** - Only allow your domains
4. **Firebase App Check** - Protect against abuse (recommended for production)
5. **Secret Manager** - Secure credential storage

## 🌍 Environment-Specific Deploys

### Development

```bash
# Use local backend
cd frontend
npm run dev  # Uses http://localhost:8080/api

# In another terminal
cd backend
go run cmd/server/main.go
```

### Staging (Optional)

```bash
# Create staging project in .firebaserc
firebase use --add

# Deploy to staging
firebase use staging
git push origin main  # Triggers GitHub Actions deployment
```

### Production

```bash
firebase use production
git push origin main  # Triggers GitHub Actions deployment
```

## 📊 Monitoring & Logs

### View Backend Logs

```bash
# Real-time logs
gcloud run services logs read ishkul-backend \
  --region us-central1 \
  --limit 50 \
  --follow

# Error logs only
gcloud run services logs read ishkul-backend \
  --region us-central1 \
  --filter "severity>=ERROR"
```

### View Frontend Hosting Logs

Firebase Console → Hosting → Usage

### View Secret Access Logs

```bash
gcloud logging read "resource.type=secretmanager.googleapis.com/Secret" \
  --limit 50
```

## 💰 Cost Estimates

### Free Tier Limits (Per Month)
- Firebase Hosting: 10 GB storage, 360 MB/day transfer
- Firestore: 50K reads, 20K writes, 20K deletes/day
- Cloud Run: 2M requests, 360K GB-seconds, 180K vCPU-seconds
- Secret Manager: 6 active secret versions free

### Expected Monthly Costs
- **Small app** (<1K users): $0-5
- **Medium app** (1K-10K users): $5-20
- **Growing app** (10K-100K users): $20-100

Cloud Run only charges when requests are being processed!

## 🐛 Troubleshooting

### "Permission denied" on scripts

```bash
chmod +x deploy.sh scripts/*.sh
```

### "Secret not found"

```bash
# Setup secrets first
./scripts/setup-secrets.sh
```

### "API not enabled"

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com
```

### CORS Errors

```bash
# Add your custom domain to allowed origins
gcloud run services update ishkul-backend \
  --region us-central1 \
  --update-env-vars "ALLOWED_ORIGINS=https://yourdomain.com,https://YOUR_PROJECT.web.app"
```

### Frontend can't connect to backend

1. Check backend URL in deployment output
2. Update `firebase/config.ts` apiConfig.baseURL
3. Rebuild and redeploy frontend

### Secrets not accessible

```bash
# Grant Cloud Run access to secrets
PROJECT_ID=$(gcloud config get-value project)
SERVICE_ACCOUNT="${PROJECT_ID}@appspot.gserviceaccount.com"

gcloud secrets add-iam-policy-binding firebase-service-account \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"
```

## 📚 Architecture Overview

```
Ishkul Platform
│
├── firebase/                       # Firebase configuration folder
│   ├── config.ts                   # Client config (safe to commit)
│   ├── firebase.json               # Project configuration
│   ├── .firebaserc                 # Project aliases
│   ├── firestore.rules             # Database security rules
│   ├── firestore.indexes.json      # Database indexes
│   └── storage.rules               # Storage security rules
│
├── Frontend (React Native/Expo)
│   ├── Uses firebase/config.ts     # Firebase config
│   ├── Web → Firebase Hosting      # Static site
│   └── Mobile → Expo/EAS Build     # Native apps
│
├── Backend (Go)
│   ├── Cloud Run                   # Containerized API
│   ├── Secrets from Secret Manager # Credentials
│   └── Uses Firebase Admin SDK     # Database access
│
├── Firebase Services
│   ├── Firestore                   # Database
│   ├── Storage                     # File storage
│   ├── Authentication              # User auth
│   └── Hosting                     # Web hosting
│
└── Google Cloud
    ├── Cloud Run                   # Backend hosting
    ├── Secret Manager              # Credential storage
    └── Cloud Build                 # CI/CD
```

## 🎓 Next Steps

1. ✅ Deploy your app
2. ✅ Set up [Firebase App Check](https://firebase.google.com/docs/app-check) for production
3. ✅ Configure [custom domain](https://firebase.google.com/docs/hosting/custom-domain)
4. ✅ Set up [monitoring alerts](https://cloud.google.com/monitoring/alerts)
5. ✅ Enable [Cloud Armor](https://cloud.google.com/armor) for DDoS protection
6. ✅ Implement [rate limiting](https://cloud.google.com/run/docs/configuring/rate-limits)

## 📖 Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Expo Documentation](https://docs.expo.dev)

## 🎯 Production Release Process (Unified Workflow)

### Quick Release (No Manual Steps Required!)

```bash
# 1. Create a release tag
git tag v1.0.3

# 2. Push tag to GitHub
git push origin v1.0.3

# Done! ✅ Everything deploys automatically
```

### What Happens Automatically

When you push a release tag (v*), the `prod-deploy.yml` workflow:

1. **Validates** the tag is properly formatted
2. **Updates** the `prod` branch to the tagged commit
3. **Builds** the backend Docker image
4. **Pushes** image to Google Artifact Registry
5. **Deploys** to Cloud Run with production configuration:
   - Environment: Production
   - Stripe Mode: Live (real payments)
   - Min Instances: 1 (always running)
   - Max Instances: 100 (auto-scales)
   - Memory: 1Gi per instance
   - CPU: 2 vCPU per instance
6. **Triggers** Vercel frontend deployment (via prod branch webhook)
7. **Posts** deployment summary with URLs and status

### Timeline

- **Total time**: ~5-10 minutes from tag push to live
  - Docker build: 2-3 min
  - Cloud Run deploy: 1-2 min
  - Frontend deploy: 2-3 min
  - Health checks: 1 min

### Version Scheme

- **Major/Minor releases**: `git tag v1.0.3`
- **Patch/Hotfix releases**: `git tag v1.0.3.1`
- **Pre-releases** (if needed): `git tag v1.0.3-rc1`

All follow the same unified workflow.

### Verify Production Deployment

```bash
# Check GitHub Actions status
gh run list --workflow prod-deploy.yml -L 1

# View deployment details
gh run view <run-id> --log

# Test backend health
curl https://ishkul-backend-*.run.app/health

# Check live frontend
open https://ishkul.org
```

### Rollback (Emergency)

If you need to rollback to a previous version:

```bash
# 1. Check available versions
git tag -l "v*"

# 2. Find the previous version (e.g., v1.0.2)
# 3. Create a new tag pointing to the old version
git tag v1.0.2.1 v1.0.2

# 4. Push to trigger rollback deployment
git push origin v1.0.2.1

# Wait for deployment to complete
```

### Edge Cases

#### Wrong commit tagged
```bash
# Delete local tag
git tag -d v1.0.3

# Delete remote tag
git push origin --delete v1.0.3

# Create correct tag
git tag v1.0.3
git push origin v1.0.3
```

#### Need to redeploy same version
```bash
# Can't reuse same tag (Git restriction)
# Instead, bump patch version:
git tag v1.0.3.1 v1.0.3^  # Points to commit before v1.0.3
git push origin v1.0.3.1
```

#### Emergency hotfix without frontend
```bash
# This rarely happens (frontend is just static files)
# But if needed, manually trigger backend-only:
gh workflow run deploy-backend.yml --ref prod -F confirm_production=production
```

### Monitoring Production

After release, monitor:

1. **GitHub Actions**: https://github.com/mesbahtanvir/ishkul/actions?workflow=prod-deploy.yml
2. **Cloud Run**: https://console.cloud.google.com/run?project=ishkul-org
3. **Vercel**: https://vercel.com/mesbahtanvir/ishkul
4. **Errors**: Check Cloud Run logs for any issues

### Troubleshooting

**"Tag push didn't trigger deployment"**
- Verify tag matches pattern: `v*` (e.g., `v1.0.3`, not `version-1.0.3`)
- Check Actions tab: https://github.com/mesbahtanvir/ishkul/actions

**"Deployment succeeded but frontend not updating"**
- Vercel webhook updates on `prod` branch changes
- Manual trigger: https://vercel.com/mesbahtanvir/ishkul > Deployments > Redeploy

**"Health check failing after deployment"**
- Might need warm-up time (Cloud Run cold starts)
- Check logs: `gcloud run services logs read ishkul-backend --limit=50`

---

**Questions?** Check [CICD_SETUP.md](CICD_SETUP.md) for automated deployment with GitHub Actions.

**Ready to release?** Run `git tag v1.0.X && git push origin v1.0.X` 🚀
