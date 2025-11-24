# GitHub Actions Workflows

Automated CI/CD pipelines for Ishkul deployment.

## 🚀 Workflows

### `deploy.yml` - Main Deployment Pipeline

Automatically deploys the entire application to Firebase and Google Cloud when you push to `main`.

**Triggers:**
- Push to `main` branch
- Manual trigger via GitHub Actions UI

**Jobs:**

1. **deploy-backend** - Builds and deploys Go backend to Cloud Run
2. **deploy-frontend** - Builds and deploys React Native web app to Firebase Hosting
3. **deploy-firestore** - Deploys Firestore security rules and indexes
4. **deploy-storage** - Deploys Storage security rules
5. **notify-deployment** - Posts deployment summary

## 🔐 Required Secrets

Set these up in **GitHub Repository Settings → Secrets and variables → Actions**:

### 1. `GCP_PROJECT_ID`
Your Firebase/Google Cloud project ID.

```bash
# Get it from:
gcloud config get-value project
# Or from .firebaserc
```

### 2. `GCP_SA_KEY`
Google Cloud Service Account key with permissions to deploy to Cloud Run.

**To create:**

```bash
# 1. Create service account
gcloud iam service-accounts create github-actions \
  --display-name "GitHub Actions Deployer" \
  --project YOUR_PROJECT_ID

# 2. Grant permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# 3. Create and download key
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com

# 4. Copy the contents of github-actions-key.json
cat github-actions-key.json

# 5. Add to GitHub Secrets as GCP_SA_KEY
# 6. Delete the local file
rm github-actions-key.json
```

### 3. `FIREBASE_SERVICE_ACCOUNT`
Firebase service account for deploying to Firebase Hosting.

**To create:**

```bash
# 1. Go to Firebase Console → Project Settings → Service Accounts
# 2. Click "Generate New Private Key"
# 3. Copy the contents of the downloaded JSON file
# 4. Add to GitHub Secrets as FIREBASE_SERVICE_ACCOUNT
```

**Or use the same key as GCP_SA_KEY:**

Just set `FIREBASE_SERVICE_ACCOUNT` to the same value as `GCP_SA_KEY`.

## 📝 Setup Instructions

### Quick Setup Script

Run this to set up all secrets automatically:

```bash
#!/bin/bash
# setup-github-secrets.sh

PROJECT_ID="your-project-id"
REPO="mesbahtanvir/ishkul"

# Create service account
gcloud iam service-accounts create github-actions \
  --display-name "GitHub Actions Deployer" \
  --project $PROJECT_ID

# Grant permissions
ROLES=(
  "roles/run.admin"
  "roles/iam.serviceAccountUser"
  "roles/storage.admin"
  "roles/secretmanager.secretAccessor"
  "roles/cloudscheduler.admin"
  "roles/cloudbuild.builds.editor"
)

for ROLE in "${ROLES[@]}"; do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="$ROLE"
done

# Create key
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions@${PROJECT_ID}.iam.gserviceaccount.com

# Add secrets to GitHub (requires gh CLI)
gh secret set GCP_PROJECT_ID --body "$PROJECT_ID" --repo $REPO
gh secret set GCP_SA_KEY < github-actions-key.json --repo $REPO
gh secret set FIREBASE_SERVICE_ACCOUNT < github-actions-key.json --repo $REPO

# Cleanup
rm github-actions-key.json

echo "✅ GitHub Actions secrets configured!"
```

### Manual Setup

1. **Create Service Account:**
   ```bash
   gcloud iam service-accounts create github-actions \
     --display-name "GitHub Actions Deployer"
   ```

2. **Grant Permissions:**
   ```bash
   PROJECT_ID="your-project-id"
   SA_EMAIL="github-actions@${PROJECT_ID}.iam.gserviceaccount.com"

   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:${SA_EMAIL}" \
     --role="roles/run.admin"

   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:${SA_EMAIL}" \
     --role="roles/iam.serviceAccountUser"

   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:${SA_EMAIL}" \
     --role="roles/storage.admin"

   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:${SA_EMAIL}" \
     --role="roles/secretmanager.secretAccessor"
   ```

3. **Create Key:**
   ```bash
   gcloud iam service-accounts keys create key.json \
     --iam-account="${SA_EMAIL}"
   ```

4. **Add to GitHub:**
   - Go to GitHub repo → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Add `GCP_PROJECT_ID` with your project ID
   - Add `GCP_SA_KEY` with contents of `key.json`
   - Add `FIREBASE_SERVICE_ACCOUNT` with contents of `key.json`

5. **Cleanup:**
   ```bash
   rm key.json
   ```

## 🎯 Usage

### Automatic Deployment

Simply push to `main`:

```bash
git add .
git commit -m "Update application"
git push origin main
```

The workflow will automatically:
1. Build backend Docker image
2. Deploy to Cloud Run
3. Build frontend
4. Deploy to Firebase Hosting
5. Deploy Firestore and Storage rules

### Manual Deployment

Go to GitHub → Actions → Deploy to Firebase & Cloud Run → Run workflow

### View Deployment Status

- GitHub → Actions tab
- Click on the workflow run
- See deployment summary at the bottom

## 🔍 Monitoring

### View Logs

**GitHub Actions:**
- Go to Actions tab
- Click on workflow run
- Click on individual job to see logs

**Cloud Run:**
```bash
gcloud run services logs read ishkul-backend --region us-central1
```

**Firebase Hosting:**
```bash
firebase hosting:channel:list
```

## 🐛 Troubleshooting

### "Permission denied" errors

Grant the service account additional permissions:

```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/MISSING_ROLE"
```

### "Secret not found"

Make sure you've run `./scripts/setup-secrets.sh` to set up Secret Manager.

### Build fails

Check:
1. All secrets are set correctly in GitHub
2. Service account has proper permissions
3. APIs are enabled in Google Cloud

### Frontend deployment fails

Ensure `FIREBASE_SERVICE_ACCOUNT` secret is set and valid.

## 📊 Workflow Features

✅ **Parallel Jobs** - Firestore and Storage deploy in parallel
✅ **Backend URL Injection** - Frontend automatically gets backend URL
✅ **Deployment Summary** - Clear summary posted after deployment
✅ **Secret Manager Support** - Automatically uses secrets if available
✅ **Image Tagging** - Uses Git SHA for versioning
✅ **Manual Trigger** - Can trigger deployment manually

## 🔄 Comparison: GitHub Actions vs deploy.sh

| Feature | GitHub Actions | deploy.sh |
|---------|---------------|-----------|
| **Trigger** | Git push | Manual command |
| **Environment** | GitHub runners | Your machine |
| **Credentials** | GitHub Secrets | Local gcloud auth |
| **Automation** | Fully automated | Manual execution |
| **Best for** | Production CI/CD | Local testing |

**Recommendation:** Use GitHub Actions for production, `deploy.sh` for testing.

## 📚 Learn More

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Cloud Run CI/CD](https://cloud.google.com/run/docs/continuous-deployment)
- [Firebase Hosting GitHub Action](https://github.com/FirebaseExtended/action-hosting-deploy)
