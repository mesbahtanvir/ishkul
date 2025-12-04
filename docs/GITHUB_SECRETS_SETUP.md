# GitHub Secrets Setup for Automated Deployments

## Overview

This document explains how to set up GitHub Secrets so environment variables are **automatically synced to Cloud Run** during deployments. No more manual `./scripts/update-backend-env.sh` needed!

## How It Works

1. **You set secrets in GitHub** - Store sensitive values in your repository settings
2. **GitHub Actions passes them to Cloud Run** - During deployment, the workflow uses these secrets
3. **Automatic on every push** - Each deployment automatically syncs all configured variables

```
Your .env file (local)
    ↓ (local dev only)

GitHub Secrets (for CI/CD)
    ↓ (GitHub Actions)

Cloud Run Environment Variables (production)
```

## Setup Instructions

### Step 1: Go to GitHub Secrets Settings

1. Navigate to your repository: https://github.com/mesbahtanvir/ishkul
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

### Step 2: Add Required Secrets

Add each secret from `backend/.env.example` that you want to sync to Cloud Run:

#### Production Secrets

| Secret Name | Value | Source |
|---|---|---|
| `GCP_PROJECT_ID` | `ishkul-org` | Google Cloud Console → Project ID |
| `GCP_SA_KEY` | `{...}` | Service account JSON key |
| `FIREBASE_DATABASE_URL` | `https://ishkul-org.firebaseio.com` | Firebase Console → Realtime Database → Data |
| `FIREBASE_STORAGE_BUCKET` | `ishkul-org.appspot.com` | Firebase Console → Storage → Settings |
| `OPENAI_API_KEY` | `sk-...` | OpenAI Platform → API Keys |
| `GOOGLE_WEB_CLIENT_ID` | `xxx.apps.googleusercontent.com` | Google Cloud Console → APIs & Services → Credentials |
| `GOOGLE_IOS_CLIENT_ID` | `xxx.apps.googleusercontent.com` | Google Cloud Console → APIs & Services → Credentials |
| `GOOGLE_ANDROID_CLIENT_ID` | `xxx.apps.googleusercontent.com` | Google Cloud Console → APIs & Services → Credentials |
| `ALLOWED_ORIGINS` | `https://ishkul.vercel.app,https://ishkul.org` | Your app domains |
| `JWT_SECRET` | `your-secure-random-string` | Generate a random secret (for production) |
| `APP_URL` | `https://ishkul.org` | Production app URL |

#### Staging Secrets (Separate Firebase Project)

Staging uses a completely separate Firebase/GCP project for full data isolation:

| Secret Name | Value | Source |
|---|---|---|
| `STAGING_GCP_PROJECT_ID` | `ishkul-staging` | Staging GCP project ID |
| `STAGING_GCP_SA_KEY` | `{...}` | Staging service account JSON key |
| `STAGING_FIREBASE_DATABASE_URL` | `https://ishkul-staging.firebaseio.com` | Staging Firebase Console |
| `STAGING_FIREBASE_STORAGE_BUCKET` | `ishkul-staging.appspot.com` | Staging Firebase Console |
| `STAGING_GOOGLE_WEB_CLIENT_ID` | `xxx.apps.googleusercontent.com` | Staging OAuth credentials |
| `STAGING_GOOGLE_IOS_CLIENT_ID` | `xxx.apps.googleusercontent.com` | Staging OAuth credentials |
| `STAGING_GOOGLE_ANDROID_CLIENT_ID` | `xxx.apps.googleusercontent.com` | Staging OAuth credentials |
| `STAGING_APP_URL` | `https://staging.ishkul.org` | Staging app URL |
| `STAGING_OPENAI_API_KEY` | `sk-...` (optional) | Separate OpenAI key for cost tracking |
| `STAGING_JWT_SECRET` | `random-string` (optional) | Separate JWT secret for token isolation |
| `STAGING_ENCRYPTION_KEY` | `base64-key` (optional) | Separate encryption key for PII |

**Note:** Security secrets (`JWT_SECRET`, `ENCRYPTION_KEY`) fall back to production values if staging-specific secrets are not set. For complete isolation, set staging-specific values.

### Step 3: Add to GitHub Actions Workflow

The workflow file ([`.github/workflows/deploy-backend.yml`](.github/workflows/deploy-backend.yml)) already includes these secrets. If you add new ones:

1. Open the workflow file
2. Find the "Prepare environment variables for Cloud Run" step
3. Add a new conditional block:

```yaml
if [ -n "${{ secrets.YOUR_NEW_SECRET }}" ]; then
  ENV_VARS="${ENV_VARS},YOUR_NEW_SECRET=${{ secrets.YOUR_NEW_SECRET }}"
fi
```

### Step 4: Verify Setup

After adding secrets:

1. Push a commit to trigger the workflow
2. Check GitHub Actions to verify deployment succeeded
3. View Cloud Run logs to confirm variables are set:

```bash
gcloud run services describe ishkul-backend \
  --region=europe-west1 \
  --format='value(spec.template.spec.containers[0].env)'
```

## Adding New Secrets

When you need to add a new environment variable:

### Local Development
1. Add to `backend/.env.example` with a placeholder
2. Add to your local `backend/.env` with the real value
3. Code uses it via `os.Getenv()`

### Production Deployment
1. Add the secret to GitHub Secrets
2. Update `.github/workflows/deploy-backend.yml` to include it
3. Next push automatically syncs it to Cloud Run

## Important Notes

### .env File Security
- **Local `.env`** - Contains real secrets, NOT in Git (ignored by .gitignore)
- **`.env.example`** - Contains placeholders only, IS in Git (documentation)
- **GitHub Secrets** - Encrypted storage for CI/CD (only readable in Actions)
- **Cloud Run** - Receives decrypted values during deployment

### Environment Variable vs. Secret Manager

This workflow uses **environment variables** for most config. If you need:

**Environment Variables** (current approach):
- Open text values
- Firebase URLs, API endpoints, OAuth IDs
- Use: `os.Getenv("VAR_NAME")`

**Secret Manager** (for sensitive values):
- Encrypted values
- Database passwords, webhook secrets
- Prefix with `_` in `.env` to mark as secret
- Special handling: `JWT_SECRET` always goes to Secret Manager

### Special Case: JWT_SECRET

`JWT_SECRET` is handled specially - it's stored in Google Secret Manager:

```bash
# View JWT_SECRET in Secret Manager
gcloud secrets versions list JWT_SECRET --project=ishkul-org

# Manually set JWT_SECRET (rarely needed)
echo -n "your-secret" | gcloud secrets create JWT_SECRET --data-file=-
```

## Workflow

### Typical Deployment Flow

```
1. Edit code and push to main branch
         ↓
2. GitHub Actions workflow triggers
         ↓
3. "Prepare environment variables" step builds ENV_VARS string
   - Reads all secrets from GitHub
   - Builds: ENVIRONMENT=production,FIREBASE_DATABASE_URL=...,etc
         ↓
4. "Deploy to Cloud Run" step passes ENV_VARS to gcloud command
         ↓
5. Cloud Run service updates with new variables
         ↓
6. Backend loads variables with os.Getenv() in Go code
         ↓
7. Done! No manual scripts needed
```

## Troubleshooting

### Secret Not Appearing in Cloud Run

**Problem**: Variable is in GitHub Secrets but not in Cloud Run

**Solution**:
1. Check workflow file includes the secret in the "Prepare environment variables" step
2. Re-add the secret to GitHub (sometimes GitHub UI doesn't save immediately)
3. Trigger workflow manually: **Actions** → **Deploy Backend to Cloud Run** → **Run workflow**

### Deployment Fails with "Secret Not Found"

**Problem**: Workflow fails with `Error: invalid secret`

**Solution**:
1. Verify secret name matches exactly (case-sensitive)
2. Make sure you added it to GitHub Secrets (not Actions Variables)
3. Check the workflow references it with `${{ secrets.SECRET_NAME }}`

### Need to Update a Secret

**To change a secret's value**:
1. Go to GitHub Settings → Secrets → Click the secret name
2. Click **Update**
3. Paste new value and save
4. Push a new commit or manually trigger the workflow

**Secrets update immediately** - no need to wait or restart anything.

## Best Practices

1. **Use strong secrets**: `OPENAI_API_KEY`, `JWT_SECRET`, etc. should be cryptographically random
2. **Rotate regularly**: Update API keys, JWT secrets periodically
3. **Document sources**: Keep track of where each secret comes from (for team knowledge)
4. **Use ENVIRONMENT variable**: Always set `ENVIRONMENT=production` in Cloud Run via workflow
5. **Test locally first**: Always test with `.env` file locally before deploying

## Advanced: Custom Secrets Handler

If you want to add support for more secrets in the workflow:

```bash
# In .github/workflows/deploy-backend.yml

# Add this in the "Prepare environment variables" step:
if [ -n "${{ secrets.MY_CUSTOM_SECRET }}" ]; then
  ENV_VARS="${ENV_VARS},MY_CUSTOM_SECRET=${{ secrets.MY_CUSTOM_SECRET }}"
fi
```

Then:
1. Add `MY_CUSTOM_SECRET` to GitHub Secrets
2. Use in code: `value := os.Getenv("MY_CUSTOM_SECRET")`

## Migration from update-backend-env.sh

If you were using `./scripts/update-backend-env.sh`:

**Old way:**
```bash
# Had to manually sync local .env to Cloud Run
./scripts/update-backend-env.sh
./scripts/update-backend-env.sh prod  # For production
```

**New way (GitHub Actions):**
```bash
# Just push your code - everything syncs automatically!
git push origin main
```

The script still exists for local development, but **you don't need to run it** for Cloud Run deployments anymore.

## Related Documentation

- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Full deployment process
- [Environment Sync Guide](./ENV_SYNC_GUIDE.md) - Local .env management
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Google Cloud Secrets](https://cloud.google.com/secret-manager/docs)

---

**Last Updated**: 2025-12-02
**Status**: Ready for Implementation
