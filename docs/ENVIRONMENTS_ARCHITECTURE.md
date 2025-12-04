# GitHub Environments Architecture

Detailed technical architecture of how GitHub Environments integrate with Ishkul's deployment pipeline.

## Architecture Overview

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Developer Workflows                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Push to main              Create Release Tag                  │
│  (git push origin main)    (git tag v1.0.0 && git push)        │
│        ↓                           ↓                            │
│     Staging                    Production                       │
│     Workflow                    Workflow                        │
└─────────────────────────────────────────────────────────────────┘
         ↓                           ↓
┌──────────────────────────────────────────────────────────────────┐
│           GitHub Actions & Environments                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  deploy-backend-staging.yml          deploy-backend.yml        │
│  ├─ environment: staging             ├─ environment: production │
│  ├─ needs: check                     ├─ needs: build            │
│  └─ secrets: inherit                 ├─ [APPROVAL GATE]        │
│      ↓                               ├─ secrets: inherit        │
│  Load: staging secrets               │   ↓                      │
│  (12 secrets)                        Load: production secrets    │
│                                      (12 secrets)              │
└──────────────────────────────────────────────────────────────────┘
         ↓                                    ↓
┌──────────────────────────────────────────────────────────────────┐
│                    Secret Management                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Staging Secrets              Production Secrets               │
│  ├─ STRIPE_SECRET_KEY_TEST    ├─ STRIPE_SECRET_KEY            │
│  ├─ OPENAI_API_KEY            ├─ OPENAI_API_KEY               │
│  ├─ FIREBASE_PRIVATE_KEY      ├─ FIREBASE_PRIVATE_KEY         │
│  ├─ FIREBASE_CLIENT_EMAIL     ├─ FIREBASE_CLIENT_EMAIL        │
│  ├─ FIREBASE_PROJECT_ID       ├─ FIREBASE_PROJECT_ID          │
│  ├─ GCP_PROJECT_NUMBER        ├─ GCP_PROJECT_NUMBER           │
│  ├─ GCP_REGION                ├─ GCP_REGION                   │
│  ├─ GOOGLE_OAUTH_CLIENT_ID    ├─ GOOGLE_OAUTH_CLIENT_ID       │
│  ├─ GOOGLE_OAUTH_CLIENT_SECRET├─ GOOGLE_OAUTH_CLIENT_SECRET   │
│  ├─ WEBHOOK_SECRET            ├─ WEBHOOK_SECRET               │
│  ├─ DATABASE_NAME             ├─ DATABASE_NAME                │
│  └─ LOG_LEVEL                 └─ LOG_LEVEL                    │
│                                                                  │
│  (Managed via GitHub UI or gh CLI)                             │
└──────────────────────────────────────────────────────────────────┘
         ↓                                    ↓
┌──────────────────────────────────────────────────────────────────┐
│                  Cloud Run Deployment                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Service: ishkul-backend-staging    Service: ishkul-backend    │
│  Project: ishkul-org                Project: ishkul-org        │
│  Region: northamerica-northeast1    Region: northamerica...    │
│  Env vars: (from staging secrets)   Env vars: (from prod...)   │
│  URL: ishkul-backend-staging...     URL: ishkul.org/api       │
│                                                                  │
│  [HEALTH CHECK]                     [HEALTH CHECK]             │
│  GET /health → 200 OK               GET /health → 200 OK      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Staging Deployment Flow

```
Developer Action: git push origin main
         ↓
GitHub Detects: Push to main branch
         ↓
Trigger: .github/workflows/deploy-backend-staging.yml
         ↓
Checkout Code & Build Backend
         ↓
Load Environment: staging
         ↓
Retrieve Secrets from: staging environment
         ├─ STRIPE_SECRET_KEY_TEST
         ├─ OPENAI_API_KEY
         ├─ FIREBASE_PRIVATE_KEY
         ├─ ... (9 more secrets)
         ↓
Set as Environment Variables in Workflow Job
         ↓
Deploy to Cloud Run Service: ishkul-backend-staging
         ├─ Pass secrets as container env vars
         ├─ Update service configuration
         ├─ Deploy new revision
         ↓
Health Check
         ├─ Query: /health endpoint
         ├─ Expected: 200 OK
         ↓
Deployment Complete ✅
         ↓
Accessible at: https://ishkul-backend-staging.run.app/api
```

### 2. Production Deployment Flow

```
Developer Action: git tag v1.0.0 && git push origin v1.0.0
         ↓
GitHub Detects: New tag (version release)
         ↓
Trigger: .github/workflows/deploy-backend.yml
         ↓
Checkout Code & Build Backend
         ↓
[APPROVAL GATE] (if enabled)
         ├─ Workflow pauses
         ├─ "Review deployments" prompt appears
         ├─ Reviewer approves/denies
         ├─ If approved → Continue
         ├─ If denied → Workflow stops
         ↓
Load Environment: production
         ↓
Retrieve Secrets from: production environment
         ├─ STRIPE_SECRET_KEY (live key)
         ├─ OPENAI_API_KEY (prod key)
         ├─ FIREBASE_PRIVATE_KEY (prod project)
         ├─ ... (9 more secrets)
         ↓
Set as Environment Variables in Workflow Job
         ↓
Deploy to Cloud Run Service: ishkul-backend
         ├─ Pass secrets as container env vars
         ├─ Update service configuration
         ├─ Deploy new revision
         ↓
Update: prod branch pointer
         ├─ Branch: prod
         ├─ Points to: Tag commit
         ↓
Health Check
         ├─ Query: /health endpoint
         ├─ Expected: 200 OK
         ↓
Deployment Complete ✅
         ↓
Accessible at: https://ishkul.org/api
```

---

## Environment Configuration

### Staging Environment

**Location**: https://github.com/mesbahtanvir/ishkul/settings/environments/staging

```yaml
Name: staging

Protection Rules:
  - Deployment branches: Any branch
  - Required reviewers: (none)
  - Wait timer: (none)
  - Restrict who can deploy: (none)

Secrets: 12 total
  - STRIPE_SECRET_KEY_TEST
  - OPENAI_API_KEY
  - FIREBASE_PRIVATE_KEY
  - FIREBASE_CLIENT_EMAIL
  - FIREBASE_PROJECT_ID
  - GCP_PROJECT_NUMBER
  - GCP_REGION
  - GOOGLE_OAUTH_CLIENT_ID
  - GOOGLE_OAUTH_CLIENT_SECRET
  - WEBHOOK_SECRET
  - DATABASE_NAME
  - LOG_LEVEL

Deployment History:
  - Triggered by: Push to main branch
  - Frequency: Multiple times per day (dev/testing)
  - Duration: ~2-5 minutes per deployment
  - Rollback: Immediate (deploy previous commit)
```

### Production Environment

**Location**: https://github.com/mesbahtanvir/ishkul/settings/environments/production

```yaml
Name: production

Protection Rules:
  - Deployment branches: main only
  - Required reviewers: YES (recommended)
    - Reviewers: [Your GitHub user or team]
  - Wait timer: (none)
  - Restrict who can deploy: (none, but reviewers control approval)

Secrets: 12 total
  - STRIPE_SECRET_KEY (live key)
  - OPENAI_API_KEY (production key)
  - FIREBASE_PRIVATE_KEY (prod project)
  - FIREBASE_CLIENT_EMAIL (prod project)
  - FIREBASE_PROJECT_ID
  - GCP_PROJECT_NUMBER
  - GCP_REGION
  - GOOGLE_OAUTH_CLIENT_ID
  - GOOGLE_OAUTH_CLIENT_SECRET
  - WEBHOOK_SECRET (live)
  - DATABASE_NAME
  - LOG_LEVEL

Deployment History:
  - Triggered by: Version tags (v*.*.*)
  - Frequency: Planned releases (weekly/monthly)
  - Duration: ~2-5 minutes per deployment
  - Rollback: Create hotfix tag (v*.*.*.1)
  - Approval: Required before deployment starts
```

---

## Workflow Integration

### Staging Workflow: `deploy-backend-staging.yml`

```yaml
name: Deploy Backend (Staging)

on:
  push:
    branches: [main]
    paths:
      - backend/**
      - .github/workflows/deploy-backend-staging.yml

jobs:
  build:
    name: Build Backend
    runs-on: ubuntu-latest
    outputs:
      image: ${{ steps.image.outputs.image }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v4
        with:
          go-version: 1.23
      - name: Run tests
        run: cd backend && go test ./...
      - name: Build image
        id: image
        run: |
          docker build -t gcr.io/ishkul-org/ishkul-backend-staging:${{ github.sha }} backend/
          echo "image=gcr.io/ishkul-org/ishkul-backend-staging:${{ github.sha }}" >> $GITHUB_OUTPUT

  deploy:
    name: Deploy to Cloud Run
    needs: build
    runs-on: ubuntu-latest
    environment: staging  # ← Uses staging environment
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_CREDENTIALS }}
      - uses: google-github-actions/setup-gcloud@v1
      - name: Deploy service
        run: |
          gcloud run deploy ishkul-backend-staging \
            --image gcr.io/ishkul-org/ishkul-backend-staging:${{ github.sha }} \
            --region northamerica-northeast1 \
            --project ishkul-org \
            --set-env-vars="STRIPE_SECRET_KEY=${{ secrets.STRIPE_SECRET_KEY_TEST }}" \
            --set-env-vars="OPENAI_API_KEY=${{ secrets.OPENAI_API_KEY }}" \
            --set-env-vars="FIREBASE_PROJECT_ID=${{ secrets.FIREBASE_PROJECT_ID }}" \
            --quiet
```

### Production Workflow: `deploy-backend.yml`

```yaml
name: Deploy Backend (Production)

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    name: Build Backend
    runs-on: ubuntu-latest
    outputs:
      image: ${{ steps.image.outputs.image }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v4
        with:
          go-version: 1.23
      - name: Run tests
        run: cd backend && go test ./...
      - name: Build image
        id: image
        run: |
          docker build -t gcr.io/ishkul-org/ishkul-backend:${GITHUB_REF#refs/tags/} backend/
          echo "image=gcr.io/ishkul-org/ishkul-backend:${GITHUB_REF#refs/tags/}" >> $GITHUB_OUTPUT

  deploy:
    name: Deploy to Cloud Run
    needs: build
    runs-on: ubuntu-latest
    environment: production  # ← Uses production environment
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_CREDENTIALS }}
      - uses: google-github-actions/setup-gcloud@v1
      - name: Deploy service
        run: |
          gcloud run deploy ishkul-backend \
            --image gcr.io/ishkul-org/ishkul-backend:${GITHUB_REF#refs/tags/} \
            --region northamerica-northeast1 \
            --project ishkul-org \
            --set-env-vars="STRIPE_SECRET_KEY=${{ secrets.STRIPE_SECRET_KEY }}" \
            --set-env-vars="OPENAI_API_KEY=${{ secrets.OPENAI_API_KEY }}" \
            --set-env-vars="FIREBASE_PROJECT_ID=${{ secrets.FIREBASE_PROJECT_ID }}" \
            --quiet
```

---

## Secret Scope & Access

### How Secrets Are Isolated

```
Repository Level:
  └─ No environment-specific secrets anymore ✅

Environment Level:
  ├─ staging environment
  │   └─ Secrets only accessible to staging workflows
  │       └─ .github/workflows/deploy-backend-staging.yml
  │
  └─ production environment
      └─ Secrets only accessible to production workflows
          └─ .github/workflows/deploy-backend.yml
```

### Secret Inheritance

```
${{ secrets.SECRET_NAME }}

When used in a job with:
  environment: staging

→ Resolves to SECRET_NAME from staging environment
```

When used in a job with:
  environment: production

→ Resolves to SECRET_NAME from production environment
```

---

## Deployment Approval Process

### Production Approval Workflow

```
1. Developer creates release tag
   $ git tag v1.0.0
   $ git push origin v1.0.0

2. GitHub detects tag and starts deploy-backend.yml

3. Build job completes successfully

4. Deploy job with environment: production
   → Workflow PAUSES
   → "Review deployments" prompt shown at:
      https://github.com/mesbahtanvir/ishkul/actions/runs/{RUN_ID}

5. Reviewer (must be configured in environment)
   → Clicks "Review deployments"
   → Sees: "Choose which environments to deploy to"
   → Selects: "production"
   → Clicks "Approve and deploy"

6. Deployment proceeds with production secrets

7. Service deployed to production Cloud Run

8. All changes logged in:
   → Audit log (Settings → Environments → production → Deployments)
   → GitHub Activity
```

### Bypass Approval (Emergency)

If GitHub approval is failing or stuck:

```bash
# Restart approval workflow via CLI
gh run rerun {RUN_ID} --failed

# Or create a hotfix tag
git tag v1.0.0.1
git push origin v1.0.0.1
```

---

## Secret Rotation Strategy

### Monthly Rotation

1. **Stripe Keys**: Rotate monthly
   ```bash
   # Generate new test/live key in Stripe Dashboard
   gh secret set STRIPE_SECRET_KEY_TEST --env staging --body "new_key"
   gh secret set STRIPE_SECRET_KEY --env production --body "new_key"
   ```

2. **OpenAI Keys**: Rotate quarterly
   ```bash
   # Generate new key in OpenAI dashboard
   gh secret set OPENAI_API_KEY --env staging --body "new_key"
   gh secret set OPENAI_API_KEY --env production --body "new_key"
   ```

3. **Firebase Keys**: Rotate semi-annually
   ```bash
   # Generate new service account key in Firebase Console
   gh secret set FIREBASE_PRIVATE_KEY --env staging --body "new_key"
   gh secret set FIREBASE_PRIVATE_KEY --env production --body "new_key"
   ```

4. **Webhooks**: Rotate after each incident
   ```bash
   gh secret set WEBHOOK_SECRET --env staging --body "new_secret"
   gh secret set WEBHOOK_SECRET --env production --body "new_secret"
   ```

### Validation After Rotation

```bash
# Deploy staging after secret rotation
git commit --allow-empty -m "test: validate staging secrets"
git push origin main

# Monitor deployment
gh run list --workflow deploy-backend-staging.yml --limit 1

# Check health
curl https://ishkul-backend-staging.run.app/health
```

---

## Audit & Monitoring

### Audit Trail

All deployments and approvals are logged:

```bash
# View all deployments to production
gh run list --workflow deploy-backend.yml --limit 10

# View specific deployment details
gh run view {RUN_ID}

# View approval history
# → Manual: Settings → Environments → production → Deployments
```

### Monitoring Deployments

```bash
# Watch deployment progress
gh run watch {RUN_ID}

# View deployment logs
gh run view {RUN_ID} --log

# Check recent deployments
gh run list --limit 5

# Filter by status
gh run list --status completed
gh run list --status failed
gh run list --status in_progress
```

### Cloud Run Monitoring

```bash
# View service metrics
gcloud run services describe ishkul-backend-staging --region northamerica-northeast1 --project ishkul-org

# View recent logs
gcloud run services logs read ishkul-backend-staging --limit 50

# View production logs
gcloud run services logs read ishkul-backend --limit 50
```

---

## Disaster Recovery

### Rollback Procedure

**If production deployment has critical bug**:

```bash
# Option 1: Revert to previous commit and tag
git revert {COMMIT_SHA}
git tag v1.0.1
git push origin v1.0.1

# Option 2: Deploy last known good tag
git tag v1.0.0-hotfix
git push origin v1.0.0-hotfix

# Monitor deployment
gh run watch {RUN_ID}
```

### Secret Recovery

**If a secret is compromised**:

```bash
# 1. Revoke old secret in source system (Stripe, OpenAI, etc.)
# 2. Generate new secret in source system
# 3. Update GitHub secret
gh secret set SECRET_NAME --env production --body "new_secret_value"

# 4. Re-deploy with new secret
git tag v1.0.1-security
git push origin v1.0.1-security
```

---

## Best Practices

1. **Always approve production deployments**
   - Enable "Required reviewers"
   - Have at least 2 people as reviewers
   - Review changes before approval

2. **Keep staging close to production**
   - Use same secrets format for both
   - Test full deployment pipeline in staging first
   - Staging should use staging versions (Stripe TEST keys, etc.)

3. **Rotate secrets regularly**
   - Monthly for API keys
   - Quarterly for service accounts
   - After any security incident

4. **Document all secrets**
   - Keep a list of all 12 secrets
   - Document where each comes from
   - Record rotation schedule

5. **Monitor deployments**
   - Review deploy logs after each deployment
   - Set up Cloud Run alerts
   - Check health endpoints regularly

6. **Use semantic versioning**
   - v1.0.0 for releases
   - v1.0.1 for patches
   - v1.1.0 for minor features
   - v2.0.0 for major changes

---

## Conclusion

GitHub Environments provides:
- ✅ Secure secret management
- ✅ Deployment approvals
- ✅ Audit trails
- ✅ Environment isolation
- ✅ Scalable architecture

For quick start: [ENVIRONMENTS_MIGRATION_QUICK_START.md](../ENVIRONMENTS_MIGRATION_QUICK_START.md)
For detailed setup: [GITHUB_ENVIRONMENTS_SETUP.md](GITHUB_ENVIRONMENTS_SETUP.md)
