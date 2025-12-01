# Backend Setup & Deployment Documentation Summary

This document summarizes all the documentation created for backend setup and deployment.

## 📚 Documentation Files

### 1. [QUICK_REFERENCE.md](QUICK_REFERENCE.md) ⭐ START HERE
**For:** Developers who want quick answers
- Common tasks with single commands
- Quick troubleshooting checklist
- One-liners for common operations
- File locations and purposes
- Read time: 5 minutes

### 2. [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) ⭐ MOST COMPLETE
**For:** Understanding the full picture
- Complete local development setup (step-by-step)
- Production deployment methods (automatic and manual)
- **5 Critical Caveats** with solutions:
  1. Service account key is local only
  2. Environment variables differ
  3. Docker image works in both environments
  4. .dockerignore prevents secrets
  5. Volume mounts only work locally
- Detailed troubleshooting section
- Verification checklist
- Read time: 30 minutes

### 3. [DOCKER_COMPOSE_GUIDE.md](DOCKER_COMPOSE_GUIDE.md)
**For:** Docker Compose specific topics
- All Docker Compose commands
- Firebase credentials setup
- Hot reload configuration
- Resource monitoring
- Network setup
- Read time: 20 minutes

### 4. [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
**For:** Quick lookup and reminders
- Command reference table
- Local vs Production comparison
- Credential security checklist
- Performance tips
- One-liners for common tasks
- Read time: 5 minutes

## 🚀 Setup Scripts

### [scripts/setup-backend-local.sh](../../scripts/setup-backend-local.sh)
Automated setup script that:
- ✅ Checks all prerequisites (Docker, gcloud, git)
- ✅ Generates Firebase service account key
- ✅ Verifies .env configuration
- ✅ Builds Docker image
- ✅ Starts Docker Compose
- ✅ Verifies backend health

**Usage:**
```bash
./scripts/setup-backend-local.sh              # Full setup
./scripts/setup-backend-local.sh --verify     # Only verify
./scripts/setup-backend-local.sh --no-compose # Skip Docker start
```

**What it does:**
1. Checks Docker, Docker Compose, gcloud, and git
2. Verifies gcloud authentication to ishkul-org
3. Creates serviceAccountKey.json from Firebase service account
4. Ensures .env is configured
5. Builds and starts Docker Compose
6. Tests backend health endpoint

## 🎯 Quick Start (3 minutes)

### Option A: Automated Setup (Recommended)
```bash
cd project_root
./scripts/setup-backend-local.sh
```

### Option B: Manual Setup
```bash
cd backend

# 1. Generate credentials
gcloud iam service-accounts keys create serviceAccountKey.json \
  --iam-account=firebase-adminsdk-fbsvc@ishkul-org.iam.gserviceaccount.com \
  --project=ishkul-org

# 2. Start backend
docker-compose up -d

# 3. Test
curl http://localhost:8080/health
```

## 📋 Key Concepts

### Local Development
- Uses `serviceAccountKey.json` file for Firebase authentication
- File mounted via Docker Compose volume
- `GOOGLE_APPLICATION_CREDENTIALS` points to mounted file
- Environment: `ENVIRONMENT=development`

### Production
- Uses Cloud Run service account (Application Default Credentials)
- No service account key file needed
- `GOOGLE_APPLICATION_CREDENTIALS` not set (auto-detected)
- Environment: `ENVIRONMENT=production`
- Secrets stored in Google Secret Manager

### The Same Docker Image Works Everywhere
Your backend's `firebase.go` automatically detects the environment:
```go
if GOOGLE_APPLICATION_CREDENTIALS is set:
    Use file-based credentials (local development)
else:
    Use Application Default Credentials (production)
```

## ⚠️ 5 Critical Caveats

### 1. Service Account Key is Local Only
- Generated from Firebase Admin SDK service account
- Required for local development
- **Never commit** to git or docker image
- Protected by `.gitignore` and `.dockerignore`

### 2. Environment Variables Differ
| Variable | Local | Production |
|----------|-------|-----------|
| `GOOGLE_APPLICATION_CREDENTIALS` | `/app/serviceAccountKey.json` | Not set |
| `ENVIRONMENT` | `development` | `production` |
| How set | `.env` file | `gcloud run services update` |

### 3. Docker Image Works in Both Environments
- Same Dockerfile for local and production
- No conditional builds or special flags
- Backend auto-detects environment via env var presence

### 4. .dockerignore Prevents Secrets from Images
Files excluded from Docker image:
- `serviceAccountKey.json`
- `.env` files
- `credentials.json`
- Certificate files (`.pem`, `.key`, `.crt`)

### 5. Volume Mounts Only Work Locally
- Docker Compose: Can mount `serviceAccountKey.json`
- Cloud Run: No volume mounts available
- Solution: Cloud Run uses service account IAM

## 🔐 Security Checklist

Before committing code:
- [ ] No `serviceAccountKey.json` in git
- [ ] No hardcoded credentials in code
- [ ] No credentials in docker image
- [ ] `.gitignore` includes secret files
- [ ] `.dockerignore` includes secret files

Before deploying to production:
- [ ] Environment variables use generic names
- [ ] Secrets in Google Secret Manager
- [ ] Cloud Run service account has proper IAM roles
- [ ] No localhost in ALLOWED_ORIGINS

## 📖 Reading Guide

**If you have 5 minutes:**
→ Read [QUICK_REFERENCE.md](QUICK_REFERENCE.md)

**If you have 15 minutes:**
→ Read [QUICK_REFERENCE.md](QUICK_REFERENCE.md) + "Quick Start" section above

**If you have 30 minutes:**
→ Read [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) fully

**If you have an hour:**
→ Read all docs in order:
1. [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
2. [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
3. [DOCKER_COMPOSE_GUIDE.md](DOCKER_COMPOSE_GUIDE.md)

**If you're debugging an issue:**
→ Go to [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md#troubleshooting)

## 🔧 Most Common Commands

```bash
# Start backend
docker-compose up -d

# View logs
docker-compose logs -f

# Rebuild after changes
docker-compose build && docker-compose up -d

# Stop backend
docker-compose down

# Test health
curl http://localhost:8080/health

# Deploy to production
git push origin main

# Monitor production
gcloud run services logs read ishkul-backend --limit=50 --follow

# Update production env vars
./scripts/update-backend-env.sh prod
```

## 📝 File Checklist

### Should be committed to git
- ✅ `Dockerfile`
- ✅ `docker-compose.yml`
- ✅ `cloudbuild.yaml` (in project root)
- ✅ `.dockerignore`
- ✅ `.env.example`
- ✅ `*.go` files
- ✅ `go.mod`, `go.sum`
- ✅ Documentation files

### Should NOT be committed to git
- ❌ `serviceAccountKey.json`
- ❌ `.env` (use `.env.example` instead)
- ❌ `.env.local`
- ❌ Any credentials files
- ❌ Build artifacts

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot find credentials file" | Run setup script or generate key: `gcloud iam service-accounts keys create serviceAccountKey.json --iam-account=firebase-adminsdk-fbsvc@ishkul-org.iam.gserviceaccount.com` |
| "Port 8080 already in use" | Change port in docker-compose.yml or kill process: `lsof -i :8080` |
| "Container keeps restarting" | Check logs: `docker-compose logs` - likely Firebase permission issue |
| "Cannot reach localhost:8080" | Is container running? `docker-compose ps` |
| Backend code changes not reflected | Rebuild image: `docker-compose build && docker-compose restart` |

## 🎓 Learning Resources

- [Dockerfile Documentation](https://docs.docker.com/engine/reference/builder/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Firebase Admin SDK for Go](https://firebase.google.com/docs/database/admin/start)
- [Application Default Credentials](https://cloud.google.com/docs/authentication/provide-credentials-adc)

## 📞 Getting Help

1. **Local development issue?** → Check [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md#troubleshooting)
2. **Docker Compose question?** → See [DOCKER_COMPOSE_GUIDE.md](DOCKER_COMPOSE_GUIDE.md)
3. **Quick lookup?** → Check [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
4. **Can't find answer?** → Ask in project issues

## ✅ Verification Checklist

After setup, verify everything works:

```bash
# 1. Backend is running
docker-compose ps
# Should show: Container ishkul-backend-dev Up

# 2. Can reach health endpoint
curl http://localhost:8080/health
# Should return JSON with status: "healthy"

# 3. Can see logs
docker-compose logs --tail=5
# Should show Firebase initialized successfully

# 4. Credentials are protected
ls -la backend/serviceAccountKey.json
grep serviceAccountKey.json backend/.gitignore
grep serviceAccountKey.json backend/.dockerignore
# All should show serviceAccountKey.json is protected
```

## 📅 Document Versions

| Document | Version | Updated | Status |
|----------|---------|---------|--------|
| QUICK_REFERENCE.md | 1.0.0 | 2025-11-27 | ✅ Ready |
| DEPLOYMENT_GUIDE.md | 1.0.0 | 2025-11-27 | ✅ Ready |
| DOCKER_COMPOSE_GUIDE.md | 1.0.0 | 2025-11-27 | ✅ Ready |
| SETUP_SUMMARY.md | 1.0.0 | 2025-11-27 | ✅ You are here |
| setup-backend-local.sh | 1.0.0 | 2025-11-27 | ✅ Ready |

## 🎯 Next Steps

1. Run the setup script: `./scripts/setup-backend-local.sh`
2. Verify backend is healthy: `curl http://localhost:8080/health`
3. Read [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed understanding
4. Keep [QUICK_REFERENCE.md](QUICK_REFERENCE.md) bookmarked for daily use

---

**Last Updated:** 2025-11-27
**Version:** 1.0.0
**Status:** Production Ready ✅
**Audience:** Backend developers, DevOps engineers, project leads
