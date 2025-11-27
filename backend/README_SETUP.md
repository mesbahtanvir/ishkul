# Backend Setup Guide

Welcome to the Ishkul backend! This guide helps you get the backend running locally and understand how it's deployed to production.

## 🚀 Get Started in 3 Commands

```bash
# 1. Run the automated setup
./scripts/setup-backend-local.sh

# 2. Wait for backend to start and verify
docker-compose logs --tail=5

# 3. Test the backend
curl http://localhost:8080/health
```

**Expected output:**
```json
{"status":"healthy","timestamp":"2025-11-27T09:16:27Z","service":"ishkul-backend"}
```

If successful, your backend is running! 🎉

## 📚 Complete Documentation

We've created comprehensive documentation for every aspect of backend development:

### For Quick Reference
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Commands, tasks, and troubleshooting (5 min read)

### For Understanding Everything
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Complete setup, deployment, and caveats (30 min read)
  - Local development step-by-step
  - Production deployment methods
  - **5 critical caveats** explained with solutions
  - Detailed troubleshooting

### For Docker Compose Details
- **[DOCKER_COMPOSE_GUIDE.md](DOCKER_COMPOSE_GUIDE.md)** - All Docker Compose features and tips (20 min read)

### For Overview
- **[SETUP_SUMMARY.md](SETUP_SUMMARY.md)** - Highlights and navigation (10 min read)

## 🎯 Choose Your Path

### Path 1: Quick Setup (5 minutes)
1. Run: `./scripts/setup-backend-local.sh`
2. Test: `curl http://localhost:8080/health`
3. Done! Start coding

### Path 2: Understanding Everything (30 minutes)
1. Read: [QUICK_REFERENCE.md](QUICK_REFERENCE.md) (5 min)
2. Read: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) (20 min)
3. Run: `./scripts/setup-backend-local.sh`
4. Explore the codebase

### Path 3: Deep Dive (1 hour)
1. [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Quick overview
2. [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Detailed setup
3. [DOCKER_COMPOSE_GUIDE.md](DOCKER_COMPOSE_GUIDE.md) - Docker details
4. [SETUP_SUMMARY.md](SETUP_SUMMARY.md) - Key concepts
5. Run the setup script
6. Explore [cmd/server/main.go](cmd/server/main.go) to understand the code

## 🔑 Key Concepts at a Glance

### Local Development
```
You → serviceAccountKey.json → Docker Compose → Firebase
```

### Production
```
GitHub Push → Cloud Build → Cloud Run Service Account → Firebase
```

### Same Code, Different Auth
```go
if GOOGLE_APPLICATION_CREDENTIALS is set:
    Use file (local: development)
else:
    Use Cloud Run service account (production)
```

## ⚠️ 5 Things to Know

1. **Service Account Key is Local Only**
   - Never commit `serviceAccountKey.json` to git
   - Automatically generated from Firebase service account
   - Protected by `.gitignore` and `.dockerignore`

2. **Environment Variables Differ**
   - Local: Stored in `.env` file
   - Production: Set via `gcloud run services update`

3. **Same Docker Image Works Everywhere**
   - No special builds needed
   - Backend auto-detects environment

4. **.dockerignore Protects Secrets**
   - `serviceAccountKey.json` excluded from image
   - `*.env*` files excluded
   - Credentials files excluded

5. **Volume Mounts Local Only**
   - Docker Compose can mount credentials
   - Cloud Run uses service account IAM

## 📋 Common Tasks

| Task | Command |
|------|---------|
| Start backend | `docker-compose up -d` |
| View logs | `docker-compose logs -f` |
| Stop backend | `docker-compose down` |
| Rebuild after code change | `docker-compose build && docker-compose up -d` |
| Test health | `curl http://localhost:8080/health` |
| Deploy to production | `git push origin main` |
| Monitor production | `gcloud run services logs read ishkul-backend --follow` |

See [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for more commands.

## 🆘 Troubleshooting

**Backend won't start?**
1. Check logs: `docker-compose logs`
2. Is `serviceAccountKey.json` present? (Run setup script if not)
3. Check `.env` has required variables
4. See [DEPLOYMENT_GUIDE.md#troubleshooting](DEPLOYMENT_GUIDE.md#troubleshooting)

**Can't reach http://localhost:8080?**
1. Is container running? `docker-compose ps`
2. Is port 8080 free? `lsof -i :8080`
3. Check logs: `docker-compose logs`

**Code changes not showing up?**
1. Rebuild image: `docker-compose build`
2. Restart container: `docker-compose restart`
3. Or both: `docker-compose up -d --build`

For detailed troubleshooting, see [DEPLOYMENT_GUIDE.md#troubleshooting](DEPLOYMENT_GUIDE.md#troubleshooting).

## 📦 Project Structure

```
backend/
├── cmd/server/main.go          # Entry point
├── internal/
│   ├── handlers/               # API endpoint handlers
│   ├── middleware/             # Auth, CORS middleware
│   └── models/                 # Data structures
├── pkg/firebase/               # Firebase integration
├── Dockerfile                  # Container definition
├── docker-compose.yml          # Local dev setup
├── cloudbuild.yaml             # Production build
├── .env.example                # Environment template
├── .dockerignore                # Files excluded from image
├── README_SETUP.md             # This file
├── QUICK_REFERENCE.md          # Command reference
├── DEPLOYMENT_GUIDE.md         # Detailed guide
└── DOCKER_COMPOSE_GUIDE.md     # Docker Compose details
```

## 🔐 Security Checklist

Before your first commit:
- [ ] `serviceAccountKey.json` is in `.gitignore`
- [ ] `serviceAccountKey.json` is in `.dockerignore`
- [ ] `.env` is in `.gitignore`
- [ ] No credentials hardcoded in `.go` files

## ✅ Verification

After setup, verify everything works:

```bash
# 1. Container is running
docker-compose ps
# Expected: ishkul-backend-dev  Up

# 2. Backend responds
curl http://localhost:8080/health
# Expected: {"status":"healthy",...}

# 3. Credentials are protected
grep serviceAccountKey.json .gitignore
# Expected: serviceAccountKey.json

# 4. No hardcoded secrets
grep -r "your-secret\|your-key" cmd/ internal/ pkg/
# Expected: (no output)
```

## 🚢 Deployment to Production

1. **Automatic** (recommended):
   ```bash
   git push origin main
   # GitHub Actions triggers Cloud Build
   # Cloud Build deploys to Cloud Run
   ```

2. **Manual**:
   ```bash
   gcloud run deploy ishkul-backend --source .
   ```

See [DEPLOYMENT_GUIDE.md#production-deployment](DEPLOYMENT_GUIDE.md#production-deployment) for details.

## 📖 Documentation Map

```
Start here
    ↓
README_SETUP.md (this file)
    ↓
Choose your path:
├─ Quick → QUICK_REFERENCE.md
├─ Complete → DEPLOYMENT_GUIDE.md
└─ Deep → All 4 docs
```

## 🤔 FAQ

**Q: Why do we need `serviceAccountKey.json` for local development?**
A: Firebase requires authentication. Locally we use an explicit credentials file.
Production uses Cloud Run's service account instead.

**Q: Can I use the same credentials in staging and production?**
A: Recommended to create separate service account keys for each environment, but one key works
for all. For security, use different keys.

**Q: Do I need to restart the container after every code change?**
A: Yes, you need to rebuild: `docker-compose build && docker-compose up -d`
(Hot reload is possible with Air tool - see DOCKER_COMPOSE_GUIDE.md)

**Q: How do I check if my deployment to production succeeded?**
A: `gcloud run revisions list --service=ishkul-backend --region=europe-west1`
And check logs: `gcloud run services logs read ishkul-backend --limit=50`

**Q: What if I accidentally commit `serviceAccountKey.json`?**
A: Run: `git rm --cached serviceAccountKey.json && git commit -m "Remove credentials"`
Then regenerate the key in GCP Console.

## 📞 Getting Help

1. **Can't start backend?** → [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md#troubleshooting)
2. **Docker Compose question?** → [DOCKER_COMPOSE_GUIDE.md](DOCKER_COMPOSE_GUIDE.md)
3. **Need a command?** → [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
4. **Understanding deployment?** → [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md#important-caveats)

## 📚 Additional Resources

- [Go Best Practices](https://golang.org/doc/effective_go)
- [Docker Documentation](https://docs.docker.com/)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Project README](../README.md) - Full project overview

## ✨ Quick Stats

- **Setup Time**: 3-5 minutes
- **Documentation**: 4 guides + 1 setup script
- **Coverage**: Local dev, Docker, production deployment, troubleshooting
- **Security**: Service account key protected, no secrets in images
- **Status**: ✅ Production ready

---

**You're all set!** Run `./scripts/setup-backend-local.sh` to get started. 🚀

For detailed information, read [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md).
For quick lookups, bookmark [QUICK_REFERENCE.md](QUICK_REFERENCE.md).

Happy coding! 👨‍💻
