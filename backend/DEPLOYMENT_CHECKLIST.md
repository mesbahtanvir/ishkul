# Backend Deployment Checklist

Use this checklist before pushing code to production or sharing your backend setup.

## Pre-Deployment (Before git push)

### Code Quality
- [ ] Backend compiles: `go build -o server cmd/server/main.go`
- [ ] No hardcoded credentials in code
- [ ] No `serviceAccountKey.json` in git history: `git log --all --oneline -- serviceAccountKey.json | wc -l` should be 0
- [ ] No `.env` file in git (only `.env.example`)
- [ ] Sensitive env vars documented in `.env.example` (without values)

### Local Testing
- [ ] Backend starts locally: `docker-compose up -d`
- [ ] Health endpoint responds: `curl http://localhost:8080/health`
- [ ] Firebase initializes: `docker-compose logs | grep "Firebase initialized"`
- [ ] No errors in logs: `docker-compose logs | grep -i error` (should be empty or only expected errors)
- [ ] Backend stops gracefully: `docker-compose down`

### Docker Configuration
- [ ] Dockerfile builds successfully: `docker build -t test .`
- [ ] Built image doesn't contain secrets:
  ```bash
  docker run test ls -la /app/ | grep -i "\.env\|serviceAccount\|credentials"
  # Should show nothing
  ```
- [ ] `serviceAccountKey.json` is in `.dockerignore`
- [ ] `serviceAccountKey.json` is in `.gitignore`
- [ ] `.env*` files are in `.dockerignore` and `.gitignore`

### Security Audit
- [ ] No AWS/GCP/database credentials in code
- [ ] No API keys in code
- [ ] No JWT secrets in code
- [ ] No OAuth client secrets in code
- [ ] All secrets use environment variables

## Before Pushing to Production (git push main)

### Git Status
- [ ] All changes committed: `git status` shows clean working tree
- [ ] No uncommitted service account keys: `git status | grep serviceAccountKey`
- [ ] No uncommitted .env files: `git status | grep "\.env"`
- [ ] Commit message is descriptive

### Environment Variables
- [ ] `.env` is gitignored (not in staging area)
- [ ] `.env.example` is committed with template values
- [ ] Production values are in Cloud Run (not in git)
- [ ] All required variables documented

### Documentation
- [ ] Code changes documented in commit message
- [ ] API endpoint changes documented
- [ ] Breaking changes flagged in commit message
- [ ] CLAUDE.md or relevant docs updated if architecture changed

## After Push to Production

### Monitor Deployment
- [ ] Cloud Build triggers: `gcloud builds list --limit=5`
- [ ] Build succeeds: `gcloud builds log <BUILD_ID>` shows "SUCCESS"
- [ ] Cloud Run deployment completes: `gcloud run revisions list --service=ishkul-backend`
- [ ] New revision is active

### Verify Production
- [ ] Health endpoint responds:
  ```bash
  curl https://ishkul-backend-xxx.run.app/health
  ```
- [ ] No errors in logs:
  ```bash
  gcloud run services logs read ishkul-backend --limit=50 --region=europe-west1
  ```
- [ ] Service is healthy in Cloud Run Console
- [ ] All environment variables set correctly:
  ```bash
  gcloud run services describe ishkul-backend --region=europe-west1 | grep "env-vars:"
  ```

### Test Critical Endpoints
- [ ] GET /health returns 200
- [ ] API endpoints respond correctly
- [ ] Firebase operations work (check logs for errors)
- [ ] CORS is configured correctly

## Ongoing Monitoring

### Daily
- [ ] Check Cloud Run logs for errors: `gcloud run services logs read ishkul-backend --limit=20`
- [ ] Monitor error rates and performance

### Weekly
- [ ] Review Cloud Run metrics: Cost, latency, error rate
- [ ] Check for security updates in Go dependencies
- [ ] Verify backups are working (if applicable)

### Monthly
- [ ] Rotate service account keys if needed
- [ ] Review IAM permissions
- [ ] Update documentation with new features/changes
- [ ] Plan major updates or migrations

## Troubleshooting During Deployment

### If Build Fails
```bash
# Check build logs
gcloud builds log <BUILD_ID> --stream

# Common issues:
# - Go compilation errors: Check go build locally first
# - Docker build errors: Try `docker build -t test .` locally
# - Missing dependencies: Run `go mod tidy` locally
```

### If Deployment Fails
```bash
# Check revision details
gcloud run revisions list --service=ishkul-backend

# Check logs
gcloud run services logs read ishkul-backend --limit=100

# Common issues:
# - Service account permissions: Check IAM
# - Environment variable issues: Check --set-env-vars
# - Image pull errors: Check Artifact Registry access
```

### If Production Crashes After Deployment
```bash
# Rollback to previous revision
gcloud run services update-traffic ishkul-backend --to-revisions <PREVIOUS_REVISION>=100

# OR deploy previous version
git revert <COMMIT>
git push origin main
```

## Security Reminders

### Every Commit
- [ ] No `serviceAccountKey.json` in staged files
- [ ] No `.env` file with actual values in git
- [ ] No credentials in code

### Every Deployment
- [ ] Cloud Run service account has minimal permissions
- [ ] Firestore security rules are correct
- [ ] CORS allows only expected origins
- [ ] Authentication middleware is enabled

### Every Month
- [ ] Review who has access to Cloud Run service
- [ ] Check service account permissions in IAM
- [ ] Verify no stale API keys or credentials
- [ ] Update CLAUDE.md if processes changed

## Key Files to Keep Protected

| File | Protect | Why |
|------|---------|-----|
| `serviceAccountKey.json` | `.gitignore` + `.dockerignore` | Contains Firebase admin credentials |
| `.env` | `.gitignore` | Contains local secrets |
| `.env.*` | `.gitignore` + `.dockerignore` | All env variants protected |
| `credentials.json` | `.dockerignore` | Credentials should never be in image |

## Quick Commands for This Checklist

```bash
# Check for secrets in code
git log -S "secret\|password\|key\|credentials" --oneline | head -10

# Verify Docker doesn't have secrets
docker run backend-backend ls -la /app/ | grep -E "\.env|credentials|secret"

# Check production deployment status
gcloud run services describe ishkul-backend --region=europe-west1 --format=json | jq '.status'

# View production logs
gcloud run services logs read ishkul-backend --limit=100 --follow

# Compare local vs production env vars
echo "=== Local ===" && grep -E "^[A-Z_]+=" backend/.env | cut -d= -f1 | sort
echo "=== Production ===" && gcloud run services describe ishkul-backend --format=json | jq -r '.spec.template.spec.containers[0].env[] | .name' | sort
```

## Emergency Contacts

If production is down:
1. Check Cloud Run logs: `gcloud run services logs read ishkul-backend --limit=100`
2. Check Cloud Build: `gcloud builds list --limit=5`
3. Check recent commits: `git log --oneline -10`
4. Check GCP status: https://status.cloud.google.com

## Sign-Off

- [ ] I have reviewed all sections
- [ ] I understand the deployment process
- [ ] I know how to monitor production
- [ ] I know how to rollback if needed
- [ ] I know where to find documentation
- [ ] Code has been tested locally
- [ ] I'm ready to deploy to production

---

**Last Updated:** 2025-11-27
**Version:** 1.0.0
**For:** Backend developers and DevOps engineers

Keep this checklist handy for every deployment!
