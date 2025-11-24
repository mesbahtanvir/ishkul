# Ishkul Quick Deployment Guide

Deploy both frontend and backend to Firebase/Google Cloud with one command!

## Prerequisites

1. **Install Required Tools:**
   ```bash
   # Firebase CLI
   npm install -g firebase-tools

   # Google Cloud CLI
   # macOS: brew install --cask google-cloud-sdk
   # Or download from: https://cloud.google.com/sdk/docs/install
   ```

2. **Create Firebase Project:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Blaze (pay-as-you-go) plan for Cloud Run

3. **Enable Required APIs:**
   ```bash
   # Login to Firebase
   firebase login

   # Login to Google Cloud
   gcloud auth login

   # Enable required APIs
   gcloud services enable \
     run.googleapis.com \
     cloudbuild.googleapis.com \
     firestore.googleapis.com \
     storage-component.googleapis.com
   ```

## One-Time Setup

### 1. Configure Firebase Project

Edit [.firebaserc](.firebaserc) and replace `YOUR_PROJECT_ID` with your Firebase project ID:

```json
{
  "projects": {
    "default": "your-actual-project-id"
  }
}
```

### 2. Set Google Cloud Project

```bash
gcloud config set project your-actual-project-id
```

### 3. Configure Frontend Environment

Create `frontend/.env`:

```env
# Firebase Config (get from Firebase Console → Project Settings)
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id

# Backend API URL (will be updated after first deployment)
EXPO_PUBLIC_API_URL=https://your-backend-url.run.app/api
```

### 4. Enable Firestore

```bash
# This will be done automatically during deployment
# Or manually enable in Firebase Console → Firestore Database → Create Database
```

## Deploy Everything

### Option 1: One Command Deployment (Recommended)

```bash
./deploy.sh
```

This will:
1. ✅ Build the frontend (Expo web)
2. ✅ Deploy frontend to Firebase Hosting
3. ✅ Build backend Docker image
4. ✅ Deploy backend to Cloud Run
5. ✅ Deploy Firestore rules and indexes
6. ✅ Deploy Storage rules

### Option 2: Using npm Scripts

```bash
# Deploy everything
npm run deploy

# Or deploy individually
npm run deploy:frontend
npm run deploy:backend
npm run deploy:firestore
npm run deploy:storage
```

## After First Deployment

1. **Update Frontend API URL:**

   After the first deployment, you'll get a backend URL like:
   ```
   https://ishkul-backend-xxx-uc.a.run.app
   ```

   Update `frontend/.env`:
   ```env
   EXPO_PUBLIC_API_URL=https://ishkul-backend-xxx-uc.a.run.app/api
   ```

2. **Redeploy Frontend:**
   ```bash
   npm run deploy:frontend
   ```

## Verify Deployment

### Check Frontend
```bash
# Your app will be at:
# https://YOUR_PROJECT_ID.web.app
# or
# https://YOUR_PROJECT_ID.firebaseapp.com

# Open in browser
open https://YOUR_PROJECT_ID.web.app
```

### Check Backend
```bash
# Get backend URL
gcloud run services describe ishkul-backend \
  --region us-central1 \
  --format 'value(status.url)'

# Test health endpoint
curl https://your-backend-url.run.app/health
```

### Check Firestore
```bash
# View Firestore data
firebase firestore:read

# Or go to Firebase Console → Firestore Database
```

## Local Development

### Frontend
```bash
cd frontend
npm run dev
```

### Backend
```bash
cd backend
go run cmd/server/main.go
```

### Both (in separate terminals)
```bash
# Terminal 1
npm run dev:frontend

# Terminal 2
npm run dev:backend
```

## Common Issues

### Issue: "Permission denied" when running deploy.sh
```bash
chmod +x deploy.sh
```

### Issue: "Project not found"
```bash
# Make sure you're authenticated
firebase login
gcloud auth login

# Set the correct project
firebase use YOUR_PROJECT_ID
gcloud config set project YOUR_PROJECT_ID
```

### Issue: "API not enabled"
```bash
# Enable all required APIs
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  firestore.googleapis.com \
  storage-component.googleapis.com
```

### Issue: CORS errors
The backend is configured to allow requests from your Firebase Hosting domains.
If you need to add custom domains:

```bash
gcloud run services update ishkul-backend \
  --region us-central1 \
  --set-env-vars "ALLOWED_ORIGINS=https://your-domain.com,https://YOUR_PROJECT_ID.web.app"
```

## Project Structure

```
ishkul/
├── frontend/               # React Native/Expo app
│   ├── src/               # Source code
│   ├── package.json       # Frontend dependencies
│   └── .env              # Frontend environment variables
├── backend/               # Go backend
│   ├── cmd/server/        # Server entrypoint
│   ├── internal/          # Internal packages
│   ├── pkg/               # Public packages
│   ├── Dockerfile         # Docker configuration
│   └── go.mod             # Go dependencies
├── firebase.json          # Firebase configuration
├── firestore.rules        # Firestore security rules
├── storage.rules          # Storage security rules
├── deploy.sh              # One-command deployment script
└── package.json           # Root package.json with scripts
```

## Cost Estimates

### Free Tier (good for development and small apps)
- Firebase Hosting: 10 GB storage, 360 MB/day transfer
- Firestore: 50K reads, 20K writes, 20K deletes per day
- Cloud Run: 2M requests, 360K GB-seconds per month
- Storage: 5GB storage, 1GB/day download

### Expected Costs for Small Production App (<10K users)
- Hosting: Free
- Firestore: $0-5/month
- Cloud Run: $5-10/month
- Storage: $0-2/month
- **Total: ~$5-20/month**

## Security Checklist

Before going to production:

- [ ] Updated `.firebaserc` with correct project ID
- [ ] Configured all environment variables in `frontend/.env`
- [ ] Reviewed and customized Firestore rules
- [ ] Reviewed and customized Storage rules
- [ ] Set up proper CORS origins
- [ ] Enabled Firebase Authentication
- [ ] Set up monitoring and alerts
- [ ] Configure custom domain (optional)

## Monitoring

### View Logs
```bash
# Backend logs
gcloud run services logs read ishkul-backend --region us-central1

# Firebase Functions logs (if using)
firebase functions:log

# Firestore usage
firebase firestore:usage
```

### Set Up Alerts
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to Monitoring → Alerting
3. Create alerts for:
   - High error rates
   - High latency
   - Budget thresholds

## Next Steps

1. ✅ Deploy your application
2. ✅ Test all features
3. ✅ Set up authentication
4. ✅ Add sample data to Firestore
5. ✅ Configure custom domain (optional)
6. ✅ Set up CI/CD with GitHub Actions (see DEPLOYMENT.md)
7. ✅ Enable monitoring and alerts

## Support

- [Firebase Documentation](https://firebase.google.com/docs)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Expo Documentation](https://docs.expo.dev)

## Quick Reference Commands

```bash
# Deploy everything
./deploy.sh

# Deploy only frontend
npm run deploy:frontend

# Deploy only backend
npm run deploy:backend

# Deploy only database rules
npm run deploy:firestore

# Deploy only storage rules
npm run deploy:storage

# Local development
npm run dev:frontend    # Start frontend dev server
npm run dev:backend     # Start backend dev server

# Build locally
npm run build:frontend  # Build frontend for production
npm run build:backend   # Build backend binary

# View logs
gcloud run services logs read ishkul-backend --region us-central1

# Get backend URL
gcloud run services describe ishkul-backend --region us-central1 --format 'value(status.url)'
```

---

**Ready to deploy?** Run `./deploy.sh` and you're good to go! 🚀
