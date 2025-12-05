# GitHub Workflows Environment Migration

This document summarizes the migration of GitHub Actions workflows to use GitHub Environments for secret management and deployment protection.

## Overview

All deployment workflows now use GitHub Environments to:
- Gate deployments with environment protection rules
- Load environment-specific secrets securely
- Require approval for production deployments (if configured)
- Maintain audit trails of all deployments
- Simplify secret management (no more `STAGING_*` prefixes)

## Changes Made

### 1. Production Backend Deployment (`.github/workflows/deploy-backend.yml`)

**Added**: Environment protection job

```yaml
check-environment:
  name: Check Production Environment
  runs-on: ubuntu-latest
  needs: prepare
  environment: production  # ← Gates with production environment
  outputs:
    approved: 'true'
```

**Updated**: Deploy job now depends on environment check

```yaml
deploy:
  needs: [prepare, check-environment]  # ← Waits for environment to approve
```

**Effect**:
- Production deployments now require the `production` environment to be configured
- If required reviewers are set up, deployment waits for approval
- Secrets are loaded from the production environment

### 2. Staging Backend Deployment (`.github/workflows/deploy-backend-staging.yml`)

**Added**: Environment protection job

```yaml
check-environment:
  name: Check Staging Environment
  runs-on: ubuntu-latest
  needs: prepare
  environment: staging  # ← Gates with staging environment
```

**Updated**: Deploy job now depends on environment check

```yaml
deploy:
  needs: [prepare, check-environment]  # ← Waits for environment
```

**Effect**:
- Staging deployments now require the `staging` environment to be configured
- No approval needed (staging environment typically doesn't have required reviewers)
- Secrets are loaded from the staging environment

### 3. Firebase Rules Deployment (`.github/workflows/deploy.yml`)

**Added**: Environment protection job

```yaml
check-environment:
  name: Check Production Environment
  runs-on: ubuntu-latest
  environment: production  # ← Gates Firebase deployments
```

**Updated**: Both deploy jobs now depend on environment check

```yaml
deploy-firestore:
  needs: check-environment
  env:
    GCP_PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}

deploy-storage:
  needs: check-environment
  env:
    GCP_PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
```

**Moved**: Environment variables from workflow root to individual jobs

**Effect**:
- Firebase rule deployments are gated by production environment
- Secrets are loaded from production environment
- Both Firestore and Storage rules use the same environment gate

### 4. Release/Production Deployment (`.github/workflows/prod-deploy.yml`)

**Added**: Environment protection job

```yaml
check-environment:
  name: Check Production Environment
  runs-on: ubuntu-latest
  environment: production  # ← Gates release deployments
```

**Updated**: Release job now depends on environment check

```yaml
release:
  needs: check-environment  # ← Waits for environment
```

**Effect**:
- Release deployments (git tags) are gated by production environment
- If required reviewers are configured, deployment waits for approval
- Secrets are loaded from production environment

## Architecture

### Before Migration

```
Workflow File
    ↓
Uses: secrets.STAGING_* or secrets.*
    ↓
Repository-level secrets (36 total with prefix)
    ↓
Deployment (no approval gates)
```

**Issues**:
- No deployment gates or approvals
- Confusing prefix scheme for secrets
- No easy way to separate environments
- All secrets at repository level

### After Migration

```
Workflow File
    ↓
check-environment job
    ↓
GitHub Environment (production, staging, etc.)
    ↓
Environment-specific secrets (12 per environment)
    ↓
Optional: Required reviewer approval
    ↓
Deploy job
    ↓
Deployment with auditing
```

**Benefits**:
- Clear environment separation
- Deployment gates with optional approval
- Environment-specific secrets
- Full audit trail
- Easier to add new environments

## Setup Required

### 1. Create GitHub Environments

Go to: `https://github.com/mesbahtanvir/ishkul/settings/environments`

Create two environments:
- **staging**: For testing deployments (no approvals needed)
- **production**: For production deployments (require approvals recommended)

### 2. Add Secrets to Environments

For each environment, add the 12 required secrets:

```bash
# Add to staging environment
gh secret set SECRET_NAME --env staging --body "value"

# Add to production environment
gh secret set SECRET_NAME --env production --body "value"
```

Required secrets:
- `GCP_PROJECT_ID`
- `GCP_SA_KEY`
- `FIREBASE_DATABASE_URL`
- `FIREBASE_STORAGE_BUCKET`
- `OPENAI_API_KEY`
- `GOOGLE_WEB_CLIENT_ID`
- `GOOGLE_IOS_CLIENT_ID`
- `GOOGLE_ANDROID_CLIENT_ID`
- `ALLOWED_ORIGINS`
- `STRIPE_SECRET_KEY` (production) or `STRIPE_TEST_SECRET_KEY` (staging)
- `STRIPE_WEBHOOK_SECRET` (production) or `STRIPE_TEST_WEBHOOK_SECRET` (staging)
- `STRIPE_PRO_PRICE_ID` (production) or `STRIPE_TEST_PRO_PRICE_ID` (staging)

And optional:
- `APP_URL`
- `JWT_SECRET`
- `ENCRYPTION_KEY`

### 3. (Recommended) Set Up Required Reviewers

For the production environment:

1. Go to: `Settings > Environments > production`
2. Enable "Required reviewers"
3. Add yourself or team members as required reviewers
4. Save protection rules

Now production deployments will require approval before running.

## Deployment Flow

### Staging Deployments
1. Push to `main` branch
2. `check-environment` job runs, loads staging environment
3. `deploy` job waits for environment check to pass
4. Deployment proceeds immediately (no approval)
5. Secrets from staging environment are injected

### Production Deployments (Release)
1. Create git tag: `git tag v1.0.0 && git push origin v1.0.0`
2. `check-environment` job runs, loads production environment
3. **If required reviewers set up**: Workflow pauses
   - Go to Actions tab
   - Click on running workflow
   - Click "Review deployments"
   - Approve to continue
4. `release` job runs and deploys to production
5. Secrets from production environment are injected

### Firebase Deployments
1. Push to `main` branch
2. `check-environment` job runs, loads production environment
3. **If required reviewers set up**: Workflow pauses
4. `deploy-firestore` and `deploy-storage` jobs run in parallel
5. Firebase rules are deployed

## Security Benefits

1. **Separation of Concerns**: Each environment has its own secrets
2. **Approval Gates**: Production deployments require approval
3. **Audit Trail**: All deployments are logged in GitHub
4. **Secret Isolation**: Staging secrets separate from production
5. **Granular Control**: Can restrict deployments by branch/tag
6. **Environment-Specific Configs**: Different resources per environment

## Migration Checklist

- [ ] Create `staging` and `production` environments in GitHub UI
- [ ] Add 12 secrets to staging environment
- [ ] Add 12 secrets to production environment
- [ ] (Optional) Set up required reviewers for production
- [ ] Test staging deployment: `git push origin main`
- [ ] Test production deployment: `git tag v0.0.1 && git push origin v0.0.1`
- [ ] Verify deployments use environment secrets in logs
- [ ] Delete old `STAGING_*` repository secrets (once confident)
- [ ] Update CI/CD documentation

## Troubleshooting

### "Environment not found" error

**Solution**: Ensure environments are created in Settings > Environments

```bash
# List environments
gh secret list --env staging  # Should show staging secrets
```

### Deployment stuck waiting for approval

**Solution**: Go to workflow run and click "Review deployments"

```bash
# Check pending approvals
gh run list --workflow prod-deploy.yml
```

### Secrets appear empty in logs

**Solution**: Verify secrets are added to the correct environment

```bash
# Check staging secrets
gh secret list --env staging

# Check production secrets
gh secret list --env production
```

## Related Documentation

- [GITHUB_ENVIRONMENTS_SETUP.md](GITHUB_ENVIRONMENTS_SETUP.md) - Full setup guide
- [ENVIRONMENTS_ARCHITECTURE.md](ENVIRONMENTS_ARCHITECTURE.md) - Architecture details
- [GITHUB_SECRETS_SETUP.md](GITHUB_SECRETS_SETUP.md) - Secret management

## Timeline

- **Created**: December 4, 2025
- **Status**: Ready for deployment
- **Changes**: 5 workflow files updated, 173 lines added, 51 lines removed
