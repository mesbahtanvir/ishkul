# GitHub Environments Migration - Quick Start

## 30-Minute Migration Guide

You're migrating from `STAGING_*` prefix-based secrets to GitHub's native **Environments** feature.

### What's Already Done ✅

- ✅ Workflows updated to use `environment:` property
- ✅ Helper scripts created (`scripts/add-*-env-secrets.sh`)
- ✅ Comprehensive documentation provided

---

## Step 1: Create Environments (2 minutes)

Go to: https://github.com/mesbahtanvir/ishkul/settings/environments

**Create `staging` environment:**
1. Click "New environment"
2. Type: `staging`
3. Click "Configure environment"
4. Save (no protection rules needed)

**Create `production` environment:**
1. Click "New environment"
2. Type: `production`
3. Click "Configure environment"
4. Enable "Required reviewers" (recommended)
5. Save

---

## Step 2: Add Staging Secrets (5 minutes)

```bash
chmod +x scripts/add-staging-env-secrets.sh
./scripts/add-staging-env-secrets.sh
```

Follow the prompts to enter:
- Stripe TEST keys
- OpenAI API key
- Other optional values

Verify:
```bash
gh secret list --env staging
# Should show: 12 secrets
```

---

## Step 3: Add Production Secrets (5 minutes)

```bash
chmod +x scripts/add-production-env-secrets.sh
./scripts/add-production-env-secrets.sh
```

Follow the prompts to enter production values.

Verify:
```bash
gh secret list --env production
# Should show: 12 secrets
```

---

## Step 4: Test Staging (5 minutes)

Push a test commit:
```bash
git commit --allow-empty -m "test: verify staging deployment"
git push origin main
```

Monitor: https://github.com/mesbahtanvir/ishkul/actions

Verify service:
```bash
curl https://ishkul-backend-staging.run.app/health
```

---

## Step 5: Test Production (5 minutes)

Create a release tag:
```bash
git tag v1.0.0
git push origin v1.0.0
```

Monitor: https://github.com/mesbahtanvir/ishkul/actions

If approval is enabled:
1. Go to workflow run
2. Click "Review deployments"
3. Approve and deploy

Verify service:
```bash
curl https://ishkul.org/health
```

---

## Step 6: Clean Up (5 minutes)

Once both deployments work, delete old secrets:

```bash
chmod +x scripts/cleanup-old-secrets.sh
./scripts/cleanup-old-secrets.sh
```

Verify:
```bash
gh secret list | grep STAGING
# Should show: (nothing)
```

---

## Summary

| Phase | Time | What to Do |
|-------|------|-----------|
| 1 | 2 min | Create GitHub environments (web UI) |
| 2 | 5 min | Run add-staging-env-secrets.sh |
| 3 | 5 min | Run add-production-env-secrets.sh |
| 4 | 5 min | Test staging deployment |
| 5 | 5 min | Test production deployment |
| 6 | 5 min | Run cleanup-old-secrets.sh |
| **Total** | **27 min** | **Full migration** |

---

## Troubleshooting

### Environment not found
- Wait 30 seconds and refresh
- Check Settings > Environments page

### Secret not found in workflow
- Verify: `gh secret list --env staging`
- Check spelling matches exactly

### Workflow still using STAGING_*
- Verify `.github/workflows/deploy-backend-staging.yml` updated
- Check for `environment: staging` property
- Verify `secrets: inherit` is used

### Can't approve production deployment
- Go to Settings > Environments > production
- Check "Required reviewers" is enabled
- Ensure your GitHub user is in reviewers list

---

## More Info

- **Full Setup:** [docs/GITHUB_ENVIRONMENTS_SETUP.md](docs/GITHUB_ENVIRONMENTS_SETUP.md)
- **Architecture:** [docs/ENVIRONMENTS_ARCHITECTURE.md](docs/ENVIRONMENTS_ARCHITECTURE.md)
- **Detailed Plan:** [docs/ENVIRONMENTS_MIGRATION_PLAN.md](docs/ENVIRONMENTS_MIGRATION_PLAN.md)

---

**Status:** 🟢 Ready to Execute
**Estimated Time:** 27 minutes
**Next Step:** Create GitHub environments via web UI
