# GitHub Environments Migration Plan

Complete execution plan for migrating from repository-level `STAGING_*` secrets to GitHub's native Environments feature.

## Executive Summary

**Objective**: Move all environment-specific secrets from repository-level STAGING_* prefix scheme to GitHub's native Environments feature.

**Timeline**: ~27 minutes for complete migration

**Deliverables**:
- 2 GitHub Environments created (staging, production)
- 24 secrets migrated (12 per environment)
- All workflows updated to use environments
- Old secrets cleaned up from repository
- Production deployment approval gates enabled

**Status**: ✅ Ready to Execute

---

## Current State Assessment

### Existing Setup

```
Repository Secrets (36 total):
├─ Staging Secrets (18):
│   ├─ STAGING_STRIPE_SECRET_KEY_TEST
│   ├─ STAGING_OPENAI_API_KEY
│   ├─ STAGING_FIREBASE_PRIVATE_KEY
│   ├─ ... (15 more)
│
└─ Production Secrets (18):
    ├─ STRIPE_SECRET_KEY
    ├─ OPENAI_API_KEY
    ├─ FIREBASE_PRIVATE_KEY
    ├─ ... (15 more)

Workflows:
├─ deploy-backend-staging.yml
│   └─ Manual secret mapping: STAGING_* → local vars
│
└─ deploy-backend.yml
    └─ Uses secrets directly
```

### Problems with Current Approach

| Issue | Impact | Severity |
|-------|--------|----------|
| 36 secrets cluttering repository | Difficult to manage | Medium |
| STAGING_* prefix confusion | Easy to use wrong secret | High |
| No approval gates | Anyone can deploy to prod | High |
| Manual secret mapping | Prone to errors | Medium |
| No environment isolation | Secrets visible everywhere | Medium |
| Hard to rotate | Must update all STAGING_* | Low |

---

## Target State

### After Migration

```
GitHub Environments:
├─ staging
│   ├─ 12 secrets (test/staging values)
│   ├─ No approval needed
│   ├─ Triggered by: push to main
│
└─ production
    ├─ 12 secrets (live/production values)
    ├─ Approval required
    ├─ Triggered by: version tags

Workflows:
├─ deploy-backend-staging.yml
│   ├─ environment: staging
│   └─ secrets: inherit
│
└─ deploy-backend.yml
    ├─ environment: production
    └─ secrets: inherit

Benefits:
✅ Only 12 secrets visible per environment
✅ Clear environment separation
✅ Approval gates for production
✅ Automatic secret injection (secrets: inherit)
✅ Audit trail for all deployments
✅ Easy to rotate secrets
```

---

## Migration Phases

### Phase 1: Create GitHub Environments (2 minutes)

**Objective**: Set up the staging and production environments in GitHub

**Steps**:

1. Go to: https://github.com/mesbahtanvir/ishkul/settings/environments

2. Create `staging` environment:
   - Click "New environment"
   - Enter name: `staging`
   - Click "Configure environment"
   - Leave defaults (no protection rules)
   - Click "Save protection rules"

3. Create `production` environment:
   - Click "New environment"
   - Enter name: `production`
   - Click "Configure environment"
   - Select deployment branches: `main`
   - Enable "Required reviewers"
   - Add your GitHub user as reviewer
   - Click "Save protection rules"

**Verification**:
```bash
# List environments
gh api repos/mesbahtanvir/ishkul/environments

# Should show: staging and production
```

**Time**: 2 minutes

---

### Phase 2: Add Staging Secrets (5 minutes)

**Objective**: Migrate 12 staging secrets to the staging environment

**Steps**:

1. Run the staging secrets helper script:
   ```bash
   chmod +x scripts/add-staging-env-secrets.sh
   ./scripts/add-staging-env-secrets.sh
   ```

2. Follow prompts for each secret:
   - Stripe test secret key (from Stripe dashboard)
   - OpenAI API key (from OpenAI dashboard)
   - Firebase private key (from Firebase console)
   - Firebase client email (from Firebase console)
   - Firebase project ID (from Firebase console)
   - GCP project number (from GCP console)
   - GCP region (default: northamerica-northeast1)
   - Google OAuth client ID
   - Google OAuth client secret
   - Webhook secret (test version)
   - Database name (optional)
   - Log level (optional, default: info)

3. For any skipped values:
   ```bash
   gh secret set SECRET_NAME --env staging --body "value"
   ```

**Verification**:
```bash
# List all staging secrets
gh secret list --env staging

# Count should be 12
# Example output:
# STRIPE_SECRET_KEY_TEST
# OPENAI_API_KEY
# FIREBASE_PRIVATE_KEY
# ... (9 more)
```

**Time**: 5 minutes

**Notes**:
- Test secret values (e.g., `sk_test_...` for Stripe)
- Use staging/non-production API keys
- Values are encrypted at GitHub and never returned in full

---

### Phase 3: Add Production Secrets (5 minutes)

**Objective**: Migrate 12 production secrets to the production environment

**Steps**:

1. Run the production secrets helper script:
   ```bash
   chmod +x scripts/add-production-env-secrets.sh
   ./scripts/add-production-env-secrets.sh
   ```

2. Follow prompts for each secret:
   - Same 12 secrets as staging, but with **production values**:
     - `sk_live_...` instead of `sk_test_...` for Stripe
     - Production OpenAI API key
     - Production Firebase project credentials
     - Production webhook secret
     - etc.

3. For any skipped values:
   ```bash
   gh secret set SECRET_NAME --env production --body "value"
   ```

**Verification**:
```bash
# List all production secrets
gh secret list --env production

# Count should be 12
```

**Time**: 5 minutes

**Important**: Use **LIVE/PRODUCTION** credentials for this phase
- Do NOT use test keys
- Do NOT use staging API keys
- Double-check before adding

---

### Phase 4: Test Staging Deployment (5 minutes)

**Objective**: Verify staging environment works correctly

**Steps**:

1. Make a test commit:
   ```bash
   git commit --allow-empty -m "test: verify staging deployment"
   git push origin main
   ```

2. Monitor the workflow:
   ```bash
   # Watch workflow run
   gh run watch --workflow=deploy-backend-staging.yml

   # Or visit: https://github.com/mesbahtanvir/ishkul/actions
   ```

3. Verify deployment succeeded:
   - Check workflow status: ✅ All jobs passed
   - Check service is running:
     ```bash
     curl https://ishkul-backend-staging.run.app/health
     ```
   - Expected response: `{"status": "healthy"}`

4. If deployment failed:
   - Check error logs: `gh run view {RUN_ID} --log`
   - Common issues:
     - Missing secrets in staging environment
     - Wrong secret names or values
     - Go test failures
   - Fix and retry: `git push origin main` (empty commit)

**Time**: 5 minutes

**Success Criteria**:
- ✅ Workflow shows "Deploy to Cloud Run" step passed
- ✅ Cloud Run service revision updated
- ✅ `/health` endpoint returns 200 OK

---

### Phase 5: Test Production Deployment (5 minutes)

**Objective**: Verify production environment and approval gates work

**Steps**:

1. Create a release tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. Monitor the workflow:
   ```bash
   # Watch workflow
   gh run watch --workflow=deploy-backend.yml

   # Or visit: https://github.com/mesbahtanvir/ishkul/actions
   ```

3. Approve the deployment:
   - If "Required reviewers" is enabled, workflow will pause
   - Go to the workflow run page in GitHub
   - Click "Review deployments"
   - Select "production"
   - Click "Approve and deploy"

4. If approval is NOT enabled:
   - Deployment proceeds automatically
   - To enable approval: Go to Settings → Environments → production → Toggle "Required reviewers"

5. Verify deployment succeeded:
   ```bash
   # Check workflow status
   curl https://ishkul.org/health
   ```

6. If deployment failed:
   - Check logs: `gh run view {RUN_ID} --log`
   - Fix and create new tag: `git tag v1.0.1 && git push origin v1.0.1`

**Time**: 5 minutes

**Success Criteria**:
- ✅ Workflow shows approval waiting (if enabled)
- ✅ Deployment proceeds after approval
- ✅ Production service updated
- ✅ `/health` endpoint returns 200 OK

---

### Phase 6: Clean Up Old Secrets (5 minutes)

**Objective**: Remove all old STAGING_* secrets from repository

**Steps**:

1. Run the cleanup script:
   ```bash
   chmod +x scripts/cleanup-old-secrets.sh
   ./scripts/cleanup-old-secrets.sh
   ```

2. The script will delete all secrets matching pattern `STAGING_*`:
   - STAGING_STRIPE_SECRET_KEY_TEST
   - STAGING_OPENAI_API_KEY
   - STAGING_FIREBASE_PRIVATE_KEY
   - ... (15 more)

3. Verify cleanup:
   ```bash
   # List all repository secrets
   gh secret list

   # Grep for any remaining STAGING_*
   gh secret list | grep STAGING_

   # Should return: (nothing)
   ```

4. If cleanup was interrupted:
   ```bash
   # Delete specific secret
   gh secret delete STAGING_SECRET_NAME

   # Delete all STAGING_* manually
   gh secret list | grep STAGING | awk '{print $1}' | xargs -I {} gh secret delete {}
   ```

**Time**: 5 minutes

**Safety Notes**:
- Only deletes repository-level secrets
- Environment secrets (staging/production) are NOT deleted
- Staging environment is still fully functional
- Production environment is still fully functional

---

## Parallel Tasks (Alternative Approach)

If you want to speed up the migration, you can run some tasks in parallel:

```bash
# Terminal 1: Add staging secrets
./scripts/add-staging-env-secrets.sh

# Terminal 2: While ^C1 is running, create environments (browser)
# Open: https://github.com/mesbahtanvir/ishkul/settings/environments
# Create: staging and production environments

# After Terminal 1: Add production secrets
./scripts/add-production-env-secrets.sh

# After Terminal 2: Continue with testing
git push origin main  # Test staging
git tag v1.0.0 && git push origin v1.0.0  # Test production
```

---

## Rollback Plan

If something goes wrong during migration:

### Scenario 1: Staging deployment fails

**Problem**: Staging environment secrets are wrong

**Rollback**:
```bash
# Don't worry - old STAGING_* repository secrets still exist
# Revert workflow changes temporarily
git revert {COMMIT_SHA}  # Revert deploy-backend-staging.yml

# Or fix the secret
gh secret set SECRET_NAME --env staging --body "correct_value"

# Re-test
git push origin main
```

### Scenario 2: Production deployment never succeeds

**Problem**: Production environment secrets are wrong

**Rollback**:
```bash
# Don't deploy - wait until issues are fixed
# Fix production secrets
gh secret set SECRET_NAME --env production --body "correct_value"

# Create new tag with fixed code/secrets
git tag v1.0.0-fixed
git push origin v1.0.0-fixed
```

### Scenario 3: Need to go back to STAGING_* approach

**Rollback**:
```bash
# Revert workflow files
git revert {COMMIT_SHA}  # Revert workflow changes

# Delete environment secrets (if needed)
gh secret delete SECRET_NAME --env staging
gh secret delete SECRET_NAME --env production

# Delete environments
# (Manual via GitHub UI: Settings → Environments → Delete)

# Old STAGING_* secrets remain in repository
```

---

## Validation Checklist

After completing all 6 phases, verify:

### Environment Configuration
- [ ] `staging` environment exists
- [ ] `production` environment exists
- [ ] Production has "Required reviewers" enabled
- [ ] Production has `main` deployment branch restriction

### Secrets
- [ ] `gh secret list --env staging` shows 12 secrets
- [ ] `gh secret list --env production` shows 12 secrets
- [ ] All secret names match workflow references
- [ ] No `STAGING_*` secrets remain in repository

### Deployments
- [ ] Staging deployment succeeds (push to main)
- [ ] Production deployment succeeds (with approval)
- [ ] `/health` endpoints return 200 OK
- [ ] Cloud Run metrics show recent traffic
- [ ] No errors in Cloud Run logs

### Cleanup
- [ ] `gh secret list | grep STAGING` returns nothing
- [ ] Old STAGING_* secrets are deleted
- [ ] Repository secret count reduced from 36 to 0

### Documentation
- [ ] [ENVIRONMENTS_MIGRATION_QUICK_START.md](../ENVIRONMENTS_MIGRATION_QUICK_START.md) reviewed
- [ ] [GITHUB_ENVIRONMENTS_SETUP.md](GITHUB_ENVIRONMENTS_SETUP.md) reviewed
- [ ] [ENVIRONMENTS_ARCHITECTURE.md](ENVIRONMENTS_ARCHITECTURE.md) reviewed
- [ ] Team members notified of new process

---

## Timeline Summary

| Phase | Task | Time |
|-------|------|------|
| 1 | Create GitHub environments | 2 min |
| 2 | Add staging secrets | 5 min |
| 3 | Add production secrets | 5 min |
| 4 | Test staging deployment | 5 min |
| 5 | Test production deployment | 5 min |
| 6 | Clean up old secrets | 5 min |
| **Total** | **Complete migration** | **27 min** |

---

## Post-Migration

### Daily Operations

**For staging deployments**:
```bash
git push origin main
# Automatically deploys staging
```

**For production deployments**:
```bash
git tag v1.0.1
git push origin v1.0.1
# Waits for approval → Then deploys
```

### Maintenance

**Rotating secrets**:
```bash
# Get new secret from source (Stripe, OpenAI, etc.)
gh secret set STRIPE_SECRET_KEY --env production --body "new_key"

# Trigger re-deployment to apply new secret
git tag v1.0.0-security
git push origin v1.0.0-security
```

**Adding new team members**:
```bash
# Add as production reviewer
# Go to: Settings → Environments → production → Required reviewers
# Search and add GitHub username
```

**Monitoring**:
```bash
# View recent deployments
gh run list --workflow deploy-backend.yml

# Check service health
curl https://ishkul.org/health
curl https://ishkul-backend-staging.run.app/health
```

---

## Troubleshooting During Migration

### Q: "Environment not found" error

**Solution**:
- Wait 30 seconds for GitHub to sync
- Refresh GitHub UI
- Verify environments exist: https://github.com/mesbahtanvir/ishkul/settings/environments

### Q: "Secret not found" in workflow

**Solution**:
```bash
# Verify secret was created
gh secret list --env staging | grep SECRET_NAME

# Check spelling exactly matches
# Secrets are case-sensitive
```

### Q: Workflow still can't find secrets

**Solution**:
- Clear browser cache
- Try adding secret again: `gh secret set SECRET_NAME --env staging --body "value"`
- Check workflow file references exact secret name

### Q: Can't approve production deployment

**Solution**:
- Verify your GitHub user is listed in production reviewers
- Go to: Settings → Environments → production
- Under "Required reviewers", verify your name is there
- If not, add yourself as reviewer

### Q: Old STAGING_* secrets still exist after cleanup

**Solution**:
```bash
# Manually delete remaining secrets
gh secret list | grep STAGING_ | awk '{print $1}' | xargs -I {} gh secret delete {}

# Verify cleanup
gh secret list | wc -l
# Should return low number (only non-STAGING_* secrets)
```

---

## Success Criteria

Migration is successful when:

✅ **GitHub Environments**
- 2 environments exist (staging, production)
- Production has approval gates enabled

✅ **Secrets**
- 12 secrets in staging environment
- 12 secrets in production environment
- 0 STAGING_* secrets in repository

✅ **Deployments**
- Staging deploys on push to main
- Production deploys on version tags (with approval)
- Both services healthy (`/health` returns 200)

✅ **Documentation**
- Team understands new process
- Quick-start guide is accessible
- Troubleshooting guide covers common issues

---

## Conclusion

This 27-minute migration replaces a confusing STAGING_* prefix scheme with GitHub's native Environments feature, providing:

- Cleaner secret management
- Production deployment approvals
- Better audit trails
- Easier scaling to new environments

**Ready to start?** See [ENVIRONMENTS_MIGRATION_QUICK_START.md](../ENVIRONMENTS_MIGRATION_QUICK_START.md)
