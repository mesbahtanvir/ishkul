# GitHub Environments Setup Guide

Complete guide for setting up and managing GitHub Environments for Ishkul's staging and production deployments.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup Steps](#setup-steps)
4. [Secret Management](#secret-management)
5. [Deployment Workflow](#deployment-workflow)
6. [Troubleshooting](#troubleshooting)

---

## Overview

GitHub Environments provide a secure way to manage environment-specific secrets and deployment approvals. Instead of cluttering the repository with `STAGING_*` prefixed secrets, you can:

- Create named environments (staging, production)
- Store environment-specific secrets
- Require approvals before production deployments
- Audit all secret access and deployments
- Use `secrets: inherit` in workflows for automatic injection

### Benefits

| Feature | Before | After |
|---------|--------|-------|
| Secret organization | 36 repository secrets with STAGING_* prefix | 12 secrets per environment |
| Production safety | No approval gates | Required reviewer approvals |
| Clarity | Confusing prefix scheme | Named environments |
| Auditing | Limited tracking | Full audit trail |
| Scalability | Hard to add new environments | Simple to create new ones |

---

## Architecture

### How It Works

```
Workflow File (.github/workflows/deploy-backend-staging.yml)
    ↓
Uses: environment: staging
    ↓
GitHub loads: staging environment secrets
    ↓
Injects via: secrets: inherit
    ↓
Workflow accesses: ${{ secrets.SECRET_NAME }}
    ↓
Cloud Run deployment with secrets
```

### Environment Structure

```
Repository: mesbahtanvir/ishkul
├── Staging Environment
│   ├── Secrets (12):
│   │   ├── STRIPE_SECRET_KEY_TEST
│   │   ├── OPENAI_API_KEY
│   │   ├── FIREBASE_PRIVATE_KEY
│   │   ├── FIREBASE_CLIENT_EMAIL
│   │   └── ... (8 more)
│   └── No deployment approvals needed
│
└── Production Environment
    ├── Secrets (12):
    │   ├── STRIPE_SECRET_KEY
    │   ├── OPENAI_API_KEY (production key)
    │   ├── FIREBASE_PRIVATE_KEY (prod project)
    │   ├── FIREBASE_CLIENT_EMAIL (prod project)
    │   └── ... (8 more)
    └── Deployment approval required (recommended)
```

---

## Setup Steps

### Step 1: Create Environments in GitHub UI

Go to: https://github.com/mesbahtanvir/ishkul/settings/environments

#### Create Staging Environment

1. Click **"New environment"**
2. Enter name: `staging`
3. Click **"Configure environment"**
4. (Optional) Add deployment branches: Leave empty or set to `main`
5. Click **"Save protection rules"**

#### Create Production Environment

1. Click **"New environment"**
2. Enter name: `production`
3. Click **"Configure environment"**
4. Under "Deployment branches", select: `main`
5. (Recommended) Enable **"Required reviewers"**
   - Click the checkbox
   - Add your GitHub user or a team as reviewer
6. Click **"Save protection rules"**

**Verification**: Both environments should now appear at https://github.com/mesbahtanvir/ishkul/settings/environments

### Step 2: Update Workflow Files

The workflow files have already been updated to use `environment:` and `secrets: inherit`:

#### `.github/workflows/deploy-backend-staging.yml`
```yaml
deploy:
  name: Deploy to Cloud Run (Staging)
  runs-on: ubuntu-latest
  environment: staging  # ← Uses staging environment

  steps:
    # ... build steps ...

    - name: Deploy to Cloud Run
      run: gcloud run deploy ishkul-backend-staging ...
      env:
        STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY_TEST }}
        OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        # ... other secrets from environment ...
```

#### `.github/workflows/deploy-backend.yml`
```yaml
deploy:
  name: Deploy to Cloud Run (Production)
  runs-on: ubuntu-latest
  environment: production  # ← Uses production environment

  steps:
    # ... build steps ...

    - name: Deploy to Cloud Run
      run: gcloud run deploy ishkul-backend ...
      env:
        STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
        OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        # ... other secrets from environment ...
```

### Step 3: Add Secrets to Environments

Use the provided helper scripts to add secrets.

#### For Staging Secrets

```bash
chmod +x scripts/add-staging-env-secrets.sh
./scripts/add-staging-env-secrets.sh
```

The script will prompt for:
- Stripe test secret key
- OpenAI API key (staging)
- Firebase private key
- Firebase client email
- Firebase project ID
- GCP project number
- GCP region
- And 5 more optional values

#### For Production Secrets

```bash
chmod +x scripts/add-production-env-secrets.sh
./scripts/add-production-env-secrets.sh
```

The script will prompt for the **production** versions of all secrets.

#### Verify Secrets Were Added

```bash
# List staging secrets
gh secret list --env staging

# List production secrets
gh secret list --env production

# Count should be 12 for each
```

---

## Secret Management

### All Required Secrets (12 per environment)

These secrets are needed for Cloud Run deployments:

| Secret Name | Purpose | Example |
|-------------|---------|---------|
| `STRIPE_SECRET_KEY_TEST` (staging) or `STRIPE_SECRET_KEY` (prod) | Stripe API authentication | `sk_test_...` or `sk_live_...` |
| `OPENAI_API_KEY` | OpenAI LLM service | `sk-proj-...` |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK auth | (multi-line PEM key) |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin SDK email | `firebase-adminsdk-...@ishkul-org.iam.gserviceaccount.com` |
| `FIREBASE_PROJECT_ID` | Firestore project | `ishkul-org` (staging) or `ishkul-org` (prod) |
| `GCP_PROJECT_NUMBER` | Cloud Run project ID | `863006625304` |
| `GCP_REGION` | Cloud Run deployment region | `northamerica-northeast1` |
| `GOOGLE_OAUTH_CLIENT_ID` | OAuth web client | `863006625304-....apps.googleusercontent.com` |
| `GOOGLE_OAUTH_CLIENT_SECRET` | OAuth secret | `GOCSPX-...` |
| `WEBHOOK_SECRET` | Stripe webhook signature | `whsec_test_...` or `whsec_...` |
| `DATABASE_NAME` | Firestore database (optional) | `(default)` or custom |
| `LOG_LEVEL` | Backend logging level | `info`, `debug`, `error` |

### Adding a Secret Manually

If you prefer to add secrets manually via the GitHub UI:

```bash
# 1. Go to Settings → Environments → staging (or production)
# 2. Click "Add secret" button
# 3. Name: SECRET_NAME
# 4. Value: (paste the secret)
# 5. Click "Add secret"

# Or use gh CLI:
gh secret set SECRET_NAME --env staging --body "secret value"
```

### Updating a Secret

```bash
# Update a staging secret
gh secret set STRIPE_SECRET_KEY_TEST --env staging --body "new_value"

# Update a production secret
gh secret set STRIPE_SECRET_KEY --env production --body "new_value"
```

### Removing a Secret

```bash
# From staging
gh secret delete STRIPE_SECRET_KEY_TEST --env staging

# From production
gh secret delete STRIPE_SECRET_KEY --env production
```

---

## Deployment Workflow

### Staging Deployments

**Trigger**: Push to `main` branch

```bash
git commit -m "feat: update backend"
git push origin main
```

**What happens**:
1. GitHub Actions runs `deploy-backend-staging.yml`
2. Loads secrets from `staging` environment
3. Builds and deploys to `ishkul-backend-staging` on Cloud Run
4. **No approval needed** - deploys immediately

**Monitor**:
```bash
# Check workflow status
gh run list --workflow deploy-backend-staging.yml --limit 1

# View logs
gh run view <RUN_ID> --log

# Or visit: https://github.com/mesbahtanvir/ishkul/actions
```

**Verify**:
```bash
curl https://ishkul-backend-staging.run.app/health
```

### Production Deployments

**Trigger**: Create a git tag (release)

```bash
git tag v1.0.0
git push origin v1.0.0
```

**What happens**:
1. GitHub Actions runs `deploy-backend.yml`
2. Loads secrets from `production` environment
3. **If approval enabled**: Waits for reviewer approval
   - Go to workflow run page
   - Click "Review deployments"
   - Select "production"
   - Approve and deploy
4. Builds and deploys to `ishkul-backend` on Cloud Run
5. Updates `prod` branch with new version

**Monitor**:
```bash
# Check workflow status
gh run list --workflow deploy-backend.yml --limit 1

# View pending approvals
gh run view <RUN_ID> --exit-status

# Or visit: https://github.com/mesbahtanvir/ishkul/actions
```

**Verify**:
```bash
curl https://ishkul.org/health
```

---

## Troubleshooting

### Problem: "Environment not found"

**Error in workflow**:
```
Error: Environment 'staging' not found
```

**Solution**:
1. Go to https://github.com/mesbahtanvir/ishkul/settings/environments
2. Verify both `staging` and `production` exist
3. Wait 30 seconds for GitHub to sync
4. Refresh page and re-run workflow

### Problem: "Secret not found" in workflow

**Error**:
```
${{ secrets.STRIPE_SECRET_KEY }} returns empty
```

**Solutions**:
1. Verify secret exists:
   ```bash
   gh secret list --env staging | grep STRIPE
   ```

2. Check spelling exactly matches workflow
   - Secrets are case-sensitive
   - `STRIPE_SECRET_KEY_TEST` ≠ `STRIPE_SECRET_KEY_test`

3. Verify you added to correct environment
   ```bash
   gh secret list --env staging  # for staging workflow
   gh secret list --env production  # for production workflow
   ```

### Problem: Production deployment not waiting for approval

**Solution**:
1. Go to Settings → Environments → production
2. Verify "Required reviewers" is enabled
3. Verify your GitHub account is listed as a reviewer
4. Re-run workflow - should now show approval prompt

### Problem: Can't create environment

**Solution**:
- Verify you have admin permissions on the repository
- Only repository admins can create/modify environments
- Check with repository owner if you don't have access

### Problem: Deployment fails with "Permission denied"

**Error**:
```
ERROR: (gcloud.run.deploy) User does not have permission [run.services.update]
```

**Solution**:
1. Verify Cloud Run service account has proper IAM roles:
   ```bash
   gcloud iam service-accounts list --project=ishkul-org
   ```

2. Check service account has roles:
   - `Cloud Run Admin`
   - `Service Account User`
   - `Cloud Build Service Account`

3. If using workload identity federation:
   ```bash
   gcloud iam workload-identity-pools list --location=global
   ```

---

## Quick Reference

### Common Commands

```bash
# List all secrets in staging
gh secret list --env staging

# List all secrets in production
gh secret list --env production

# Add a secret
gh secret set SECRET_NAME --env staging --body "value"

# Delete a secret
gh secret delete SECRET_NAME --env staging

# View recent deployments
gh run list --workflow deploy-backend.yml

# Check workflow status
gh run view <RUN_ID>

# View workflow logs
gh run view <RUN_ID> --log
```

### Environment URLs

- **Staging Dashboard**: https://console.cloud.google.com/run/detail/northamerica-northeast1/ishkul-backend-staging/metrics?project=ishkul-org
- **Production Dashboard**: https://console.cloud.google.com/run/detail/northamerica-northeast1/ishkul-backend/metrics?project=ishkul-org
- **GitHub Environments**: https://github.com/mesbahtanvir/ishkul/settings/environments

### Workflow Files

- **Staging**: `.github/workflows/deploy-backend-staging.yml`
- **Production**: `.github/workflows/deploy-backend.yml`

---

## Next Steps

1. ✅ Create GitHub environments (staging and production)
2. ✅ Add secrets using helper scripts
3. ✅ Test staging deployment (push to main)
4. ✅ Test production deployment (create tag)
5. ✅ Monitor Cloud Run dashboards
6. ⏳ Clean up old `STAGING_*` repository secrets (see [SECRETS_QUICK_REFERENCE.md](SECRETS_QUICK_REFERENCE.md))

For quick start, see: [ENVIRONMENTS_MIGRATION_QUICK_START.md](../ENVIRONMENTS_MIGRATION_QUICK_START.md)
