# Quick Start Guide

Get your Ishkul app deployed in 5 minutes!

## 🎯 Choose Your Path

### Path 1: Automated CI/CD (Recommended)
**Setup once, deploy automatically on every push**

```bash
# 1. Setup GitHub Actions
./scripts/setup-github-actions.sh

# 2. Push to GitHub
git push origin main

# 3. Done! Check GitHub Actions tab for deployment status
```

### Path 2: Manual Deployment
**Deploy components individually from your machine**

```bash
# 1. One-time configuration
# Edit .firebaserc with your project ID
# Edit firebase/config.ts with your Firebase config

# 2. Setup secrets (optional but recommended)
./scripts/setup-secrets.sh

# 3. Deploy components
npm run deploy:frontend    # Deploy frontend only
npm run deploy:backend     # Deploy backend only
npm run deploy:firestore   # Deploy database rules
npm run deploy:storage     # Deploy storage rules
```

## 📋 Prerequisites

- [ ] Firebase project created ([Create one](https://console.firebase.google.com))
- [ ] Billing enabled on Firebase (required for Cloud Run)
- [ ] Tools installed:
  ```bash
  npm install -g firebase-tools
  # macOS: brew install --cask google-cloud-sdk
  ```
- [ ] Authenticated:
  ```bash
  firebase login
  gcloud auth login
  ```

## 🔧 Configuration Checklist

### 1. Firebase Project ID

Edit [`.firebaserc`](.firebaserc):
```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

Set gcloud project:
```bash
gcloud config set project your-project-id
```

### 2. Firebase Config

Get from [Firebase Console](https://console.firebase.google.com) → Project Settings → Your apps

Edit [`firebase/config.ts`](firebase/config.ts):
```typescript
export const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
};
```

### 3. Enable APIs

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  firestore.googleapis.com \
  storage-component.googleapis.com \
  secretmanager.googleapis.com
```

## 🚀 Deploy

### Option 1: GitHub Actions (Automated)

```bash
# Setup (one time)
./scripts/setup-github-actions.sh

# Push to deploy
git push origin main
```

View deployment: GitHub → Actions tab

### Option 2: Individual Components

```bash
npm run deploy:frontend    # Frontend only
npm run deploy:backend     # Backend only
npm run deploy:firestore   # Database rules
npm run deploy:storage     # Storage rules
```

## 🌐 Access Your App

After deployment:

**Frontend:** https://YOUR_PROJECT_ID.web.app

**Backend API:**
```bash
gcloud run services describe ishkul-backend \
  --region us-central1 \
  --format 'value(status.url)'
```

## 🔄 Update Backend URL

After first deployment, update frontend with backend URL:

Edit [`firebase/config.ts`](firebase/config.ts):
```typescript
export const apiConfig = {
  baseURL: "https://your-backend-url.run.app/api",
};
```

Then redeploy frontend:
```bash
npm run deploy:frontend
```

## 🧪 Test Locally

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open: http://localhost:8081

### Backend
```bash
cd backend
go run cmd/server/main.go
```

Test: http://localhost:8080/health

## 📚 Documentation

- [CICD_SETUP.md](CICD_SETUP.md) - GitHub Actions setup guide
- [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md) - Complete deployment guide
- [firebase/README.md](firebase/README.md) - Firebase configuration
- [.github/workflows/README.md](.github/workflows/README.md) - Workflow docs

## 🆘 Common Issues

### "Project not found"
```bash
# Make sure you're authenticated
firebase login
gcloud auth login

# Set the correct project
firebase use YOUR_PROJECT_ID
gcloud config set project YOUR_PROJECT_ID
```

### "Permission denied"
```bash
# Make scripts executable
chmod +x deploy.sh scripts/*.sh
```

### "API not enabled"
```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com
```

### CORS errors
```bash
# Update allowed origins in Cloud Run
gcloud run services update ishkul-backend \
  --region us-central1 \
  --set-env-vars "ALLOWED_ORIGINS=https://your-domain.com"
```

## 💡 Tips

**Use GitHub Actions for production:**
- Automated deployments
- Consistent environment
- Deployment history

**Use deploy.sh for development:**
- Quick testing
- Local control
- No GitHub setup needed

**Use npm scripts for specific updates:**
- Deploy only what changed
- Faster iteration
- Selective deployments

## 🎉 You're Done!

Your app is now deployed! Here's what you can do:

1. ✅ Visit your frontend: https://YOUR_PROJECT_ID.web.app
2. ✅ Test the API: https://your-backend-url.run.app/health
3. ✅ Set up authentication in Firebase Console
4. ✅ Customize Firestore and Storage rules
5. ✅ Monitor in Google Cloud Console

## 🔗 Next Steps

- Set up custom domain
- Configure Firebase Authentication
- Add test data to Firestore
- Set up monitoring and alerts
- Enable Firebase App Check for security

---

**Need help?** Check the [full documentation](DEPLOY_GUIDE.md) or open an issue!
