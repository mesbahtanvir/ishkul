# Backend Deployment and Local Build Guide

This guide explains the differences between local development and production deployment,
with step-by-step instructions for both.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Local Development Setup](#local-development-setup)
3. [Production Deployment](#production-deployment)
4. [Important Caveats](#important-caveats)
5. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Local Development (5 minutes)

```bash
cd backend

# 1. Get your service account key
gcloud iam service-accounts keys create serviceAccountKey.json \
  --iam-account=firebase-adminsdk-fbsvc@ishkul-org.iam.gserviceaccount.com \
  --project=ishkul-org

# 2. Start the backend
docker-compose up -d

# 3. Check logs
docker-compose logs -f

# 4. Test it works
curl http://localhost:8080/health
```

### Production Deployment

```bash
cd backend

# Push to main branch (automatic deployment via GitHub Actions)
git push origin main

# Or manual deployment to Cloud Run
gcloud run deploy ishkul-backend --source .
```

---

## Local Development Setup

### Prerequisites

- Docker Desktop installed and running
- `gcloud` CLI configured with ishkul-org project
- Go 1.23 (optional, only needed for local testing without Docker)

### Step 1: Generate Service Account Key

The service account key is required to authenticate with Firebase during local development.

```bash
cd backend

# Generate the key from the Firebase Admin SDK service account
gcloud iam service-accounts keys create serviceAccountKey.json \
  --iam-account=firebase-adminsdk-fbsvc@ishkul-org.iam.gserviceaccount.com \
  --project=ishkul-org
```

**Why this is needed:**
- Firebase requires authentication to read/write to Firestore
- Local development uses explicit credentials file (serviceAccountKey.json)
- This file is **never** committed to git or included in Docker images

**Security note:**
- The file is in `.gitignore` and `.dockerignore`
- Keep it safe - it has full Firebase permissions
- Delete old keys from GCP Console if you regenerate

### Step 2: Configure Environment Variables

```bash
# Copy example to .env (if not already present)
cp .env.example .env

# Edit .env with your project values
nano .env
```

**Required variables:**
```env
FIREBASE_DATABASE_URL=https://ishkul-org-default-rtdb.firebaseio.com/
FIREBASE_STORAGE_BUCKET=gs://ishkul-org.appspot.com
ALLOWED_ORIGINS=http://localhost:3000
PORT=8080
ENVIRONMENT=development
JWT_SECRET=your-local-secret-key
GOOGLE_WEB_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### Step 3: Start Docker Compose

```bash
# Build and start in the background
docker-compose up -d

# Or start in foreground to see logs
docker-compose up

# Check status
docker-compose ps
```

**Expected output:**
```
ishkul-backend-dev  | Using credentials file: /app/serviceAccountKey.json
ishkul-backend-dev  | Firebase initialized successfully
ishkul-backend-dev  | Server starting on port 8080
```

### Step 4: Test the Backend

```bash
# Health check endpoint
curl http://localhost:8080/health

# Expected response:
# {"status":"healthy","timestamp":"2025-11-27T09:16:27.898142386Z","service":"ishkul-backend"}
```

### Step 5: Make Code Changes

When you modify Go code:

```bash
# Rebuild the Docker image
docker-compose build

# Restart the container with new image
docker-compose up -d

# Or do both in one command
docker-compose up -d --build

# View logs to see if it started
docker-compose logs -f
```

### Step 6: Stop the Backend

```bash
docker-compose down
```

---

## Production Deployment

### Architecture

Production deployment uses a different credential mechanism:

```
GitHub Push → Cloud Build → Cloud Run Service Account (ADC)
```

**Key differences from local:**
- No service account key file in the image
- Cloud Run automatically provides credentials (Application Default Credentials)
- Secrets like JWT_SECRET come from Google Secret Manager

### Deployment Methods

#### Method 1: Automatic (Recommended)

Push to main branch - GitHub Actions automatically triggers deployment:

```bash
# Make your changes
git add backend/
git commit -m "Fix backend issue"

# Push to trigger automatic deployment
git push origin main

# Monitor deployment
# Option A: Watch Cloud Build
gcloud builds list --limit=5

# Option B: Watch Cloud Run revisions
gcloud run revisions list --service=ishkul-backend --region=europe-west1 --project=ishkul-org

# Option C: Check logs
gcloud run services logs read ishkul-backend --region=europe-west1 --project=ishkul-org --limit=100
```

#### Method 2: Manual Deployment

For testing or emergency fixes:

```bash
cd backend

# Deploy directly to Cloud Run
gcloud run deploy ishkul-backend \
  --source . \
  --region=europe-west1 \
  --project=ishkul-org
```

### Update Environment Variables

After deployment, if you need to update environment variables:

```bash
# Use the provided script
./scripts/update-backend-env.sh          # Development mode
./scripts/update-backend-env.sh prod     # Production mode (with checks)

# Or manually
gcloud run services update ishkul-backend \
  --set-env-vars=FIREBASE_DATABASE_URL=value \
  --region=europe-west1 \
  --project=ishkul-org
```

---

## Important Caveats

### ⚠️ Caveat 1: Service Account Key is Local Only

**The Problem:**
- `serviceAccountKey.json` is needed for local development
- It CANNOT be in Docker images (security risk)
- It CANNOT be committed to git

**The Solution:**
```
LOCAL DEVELOPMENT              PRODUCTION
─────────────────────────────────────────

serviceAccountKey.json         Not in image
        ↓                            ↓
Docker volume mount            Cloud Run Service Account
        ↓                            ↓
GOOGLE_APPLICATION_CREDENTIALS  Application Default
=/app/serviceAccountKey.json   Credentials (automatic)
        ↓                            ↓
Backend reads file             Backend uses service account
```

**How to check it's safe:**
```bash
# Verify it's in .gitignore
grep serviceAccountKey.json .gitignore

# Verify it's in .dockerignore
grep serviceAccountKey.json .dockerignore

# Build image and verify file is NOT included
docker build -t test . && docker run test ls -la /app/serviceAccountKey.json
# Should show: No such file or directory
```

---

### ⚠️ Caveat 2: Environment Variables Differ Between Local and Production

**Local Development (.env file):**
- All variables in `.env` file
- `GOOGLE_APPLICATION_CREDENTIALS` points to mounted file
- `ENVIRONMENT=development`

**Production (Cloud Run):**
- Variables set via `gcloud run services update --set-env-vars`
- `GOOGLE_APPLICATION_CREDENTIALS` is NOT set (uses ADC)
- `ENVIRONMENT=production`
- Secrets come from Google Secret Manager

**Check variables in running container:**
```bash
# Local development
docker-compose exec backend env | grep -E "FIREBASE|ENVIRONMENT|GOOGLE"

# Production
gcloud run services describe ishkul-backend --region=europe-west1 --project=ishkul-org
```

---

### ⚠️ Caveat 3: Docker Image Must Work in Both Environments

**The requirement:**
The same Docker image must work locally AND in production without modifications.

**Why this matters:**
- Cloud Build creates one image
- Image is used locally (with mounted credentials)
- Same image deployed to Cloud Run (with service account)

**How the backend handles it:**
```go
// firebase.go - Smart credential detection
credentialsPath := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS")
if credentialsPath != "" {
    // Local development: use file
    opt = option.WithCredentialsFile(credentialsPath)
} else {
    // Production: use Application Default Credentials
    // (Cloud Run service account)
}
```

**Testing both modes locally:**
```bash
# Mode 1: With credentials file (development)
docker-compose up

# Mode 2: Without credentials (simulates production)
docker run --rm \
  -e ENVIRONMENT=production \
  -e PORT=8080 \
  -p 8080:8080 \
  backend-backend

# Should fail gracefully with ADC error (expected without service account)
```

---

### ⚠️ Caveat 4: .dockerignore Prevents Secrets from Reaching Images

**The Problem:**
Without `.dockerignore`, secrets could accidentally get into Docker images:

**The Solution:**
[.dockerignore](backend/.dockerignore) explicitly excludes:
```
serviceAccountKey.json    # Service account credentials
credentials.json          # Google credentials
.env                      # Environment files
.env.*                    # All .env variations
*.pem, *.key, *.crt       # Certificate files
```

**Verify it works:**
```bash
# Build image
docker build -t test .

# Check image contents
docker run test ls -la /app/ | grep -E "\.env|serviceAccount|credentials"

# Should find nothing - good!
```

---

### ⚠️ Caveat 5: Volume Mounts Only Work Locally

**Local Docker Compose:**
```yaml
volumes:
  - ./serviceAccountKey.json:/app/serviceAccountKey.json:ro
```

This works because the file exists on your machine.

**Cloud Run:**
No volume mounts available - it's a managed service. Must use Application Default Credentials instead.

---

## Troubleshooting

### Problem: "Permission denied" on serviceAccountKey.json

**Cause:** File exists but has wrong permissions

**Fix:**
```bash
# Check current permissions
ls -la backend/serviceAccountKey.json

# Should be readable by your user
# Fix if needed (might be too restrictive from gcloud)
chmod 600 backend/serviceAccountKey.json
```

### Problem: "Cannot find credentials file" in Docker

**Cause:** Mounted volume path doesn't match

**Check:**
```bash
# In docker-compose.yml, verify volume mount:
# - ./serviceAccountKey.json:/app/serviceAccountKey.json:ro

# And env var matches:
# - GOOGLE_APPLICATION_CREDENTIALS=/app/serviceAccountKey.json

# Test mounted file is readable
docker-compose exec backend test -r /app/serviceAccountKey.json && echo "OK" || echo "Not found"
```

### Problem: Backend fails in production with "could not find default credentials"

**Cause:** Cloud Run service account doesn't have Firebase permissions

**Fix:**
```bash
# Check service account has Firestore permissions
gcloud projects get-iam-policy ishkul-org \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:*-compute@developer.gserviceaccount.com" \
  --format="value(bindings.role)"

# Should see Editor or custom Firebase role
# If missing, grant permissions:
PROJECT_NUMBER=$(gcloud projects describe ishkul-org --format='value(projectNumber)')
gcloud projects add-iam-policy-binding ishkul-org \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/editor"
```

### Problem: Docker image is very large (hundreds of MB)

**Cause:** Go dependencies or build artifacts in image

**Check:**
```bash
# Verify multi-stage build is working
docker build -t test . --progress=plain 2>&1 | grep -E "FROM|COPY|RUN"

# Should see two stages: golang:1.23-alpine (builder) and alpine:latest (runtime)
```

### Problem: "Address already in use" on port 8080

**Cause:** Another service running on that port

**Fix:**
```bash
# Find what's using port 8080
lsof -i :8080

# Kill it or use different port in docker-compose.yml
# Change:
# ports:
#   - "8080:8080"
# To:
#   - "8081:8080"
```

---

## Verification Checklist

### Before Local Development

- [ ] `serviceAccountKey.json` generated and present in `backend/`
- [ ] `.env` file configured with correct values
- [ ] Docker Desktop running
- [ ] `docker-compose ps` shows no conflicts

### Before Committing Code

- [ ] `docker-compose build` completes successfully
- [ ] `docker-compose up -d` starts without errors
- [ ] `curl http://localhost:8080/health` returns 200
- [ ] `git status` shows serviceAccountKey.json is NOT listed (in .gitignore)

### Before Pushing to Production

- [ ] Code tested locally with `docker-compose up`
- [ ] No hardcoded credentials in code
- [ ] Environment variables use generic names (FIREBASE_DATABASE_URL, not hardcoded URLs)
- [ ] Backend logs show "Firebase initialized successfully"

### After Production Deployment

- [ ] `gcloud run services describe ishkul-backend` shows healthy status
- [ ] `gcloud run services logs read ishkul-backend --limit=20` shows no errors
- [ ] Service URL in Cloud Run Console is accessible
- [ ] Frontend can connect to `https://ishkul-backend-xxx.run.app/health`

---

## Reference Commands

### Local Development
```bash
docker-compose up -d          # Start backend
docker-compose logs -f        # View logs
docker-compose build          # Rebuild after code changes
docker-compose down           # Stop backend
docker-compose exec backend sh # Shell into container
```

### Production Monitoring
```bash
gcloud run services list                                    # List all services
gcloud run services describe ishkul-backend                 # Service details
gcloud run services logs read ishkul-backend --limit=50     # View logs
gcloud run revisions list --service=ishkul-backend          # Deployment history
gcloud run services update ishkul-backend --set-env-vars=KEY=value  # Update env vars
```

### Credential Management
```bash
# Generate new service account key (local development)
gcloud iam service-accounts keys create serviceAccountKey.json \
  --iam-account=firebase-adminsdk-fbsvc@ishkul-org.iam.gserviceaccount.com

# Check service account permissions (production)
gcloud projects get-iam-policy ishkul-org --flatten="bindings[].members"

# Grant permissions to Cloud Run service account
gcloud projects add-iam-policy-binding ishkul-org \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/editor"
```

---

## FAQ

**Q: Do I need to regenerate serviceAccountKey.json regularly?**
A: No, the key doesn't expire. Only regenerate if you suspect it's compromised or when rotating
credentials for security best practices.

**Q: Can I use the same docker-compose.yml in production?**
A: No. Production uses Cloud Run managed service, not Docker Compose. The Dockerfile works the same,
but Cloud Run handles orchestration.

**Q: What if I accidentally commit serviceAccountKey.json?**
A:
1. Regenerate the key immediately in GCP Console
2. Run `git rm --cached serviceAccountKey.json` and commit
3. The old key is now invalidated by the new one

**Q: How do I test production credentials locally?**
A: Use Application Default Credentials:
```bash
gcloud auth application-default login
docker run --rm \
  -v ~/.config/gcloud:/root/.config/gcloud \
  -e GOOGLE_APPLICATION_CREDENTIALS=/root/.config/gcloud/application_default_credentials.json \
  backend-backend
```

**Q: Can I run the backend without Docker locally?**
A: Yes:
```bash
cd backend
export GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
go run cmd/server/main.go
```

---

## Additional Resources

- [Dockerfile](backend/Dockerfile) - Container configuration
- [docker-compose.yml](backend/docker-compose.yml) - Local development setup
- [cloudbuild.yaml](../cloudbuild.yaml) - Production build pipeline (in project root)
- [Firebase Admin SDK Setup](https://firebase.google.com/docs/admin/setup)
- [Cloud Run Credentials](https://cloud.google.com/docs/authentication)

---

**Last Updated:** 2025-11-27
**Version:** 1.0.0
**Status:** Production Ready
