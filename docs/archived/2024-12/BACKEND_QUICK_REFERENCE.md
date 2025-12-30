# Backend Quick Reference Card

## Local Development in 3 Commands

```bash
# 1. Generate credentials (one-time)
gcloud iam service-accounts keys create serviceAccountKey.json \
  --iam-account=firebase-adminsdk-fbsvc@ishkul-org.iam.gserviceaccount.com --project=ishkul-org

# 2. Start backend
docker-compose up -d

# 3. Test it
curl http://localhost:8080/health
```

---

## Common Tasks

| Task | Command |
|------|---------|
| **Start backend** | `docker-compose up -d` |
| **Stop backend** | `docker-compose down` |
| **View logs** | `docker-compose logs -f` |
| **Rebuild after code change** | `docker-compose build && docker-compose up -d` |
| **Access container shell** | `docker-compose exec backend sh` |
| **Check health** | `curl http://localhost:8080/health` |
| **Deploy to production** | `git push origin main` (automatic) |
| **View prod logs** | `gcloud run services logs read ishkul-backend --limit=50` |
| **Update prod env vars** | `./scripts/update-backend-env.sh prod` |

---

## File Locations

| File | Purpose | Commit? |
|------|---------|---------|
| `.env` | Local environment variables | ✅ Yes |
| `.env.example` | Template for .env | ✅ Yes |
| `serviceAccountKey.json` | Firebase credentials | ❌ No (gitignored) |
| `Dockerfile` | Container image definition | ✅ Yes |
| `docker-compose.yml` | Local development setup | ✅ Yes |
| `../cloudbuild.yaml` | Production build pipeline (project root) | ✅ Yes |

---

## Key Differences: Local vs Production

| Aspect | Local | Production |
|--------|-------|-----------|
| **Credentials** | `serviceAccountKey.json` file | Cloud Run service account |
| **Env var path** | `/app/serviceAccountKey.json` | None (ADC) |
| **Orchestration** | Docker Compose | Cloud Run (managed) |
| **Starting** | `docker-compose up` | `git push` |
| **Logs** | `docker-compose logs` | `gcloud run logs` |
| **Environment** | DEVELOPMENT | PRODUCTION |

---

## Troubleshooting Checklist

**Backend won't start?**
- [ ] `docker-compose ps` - container running?
- [ ] `docker-compose logs` - what's the error?
- [ ] `ls -la serviceAccountKey.json` - file exists?
- [ ] `.env` - all required vars set?

**Cannot reach http://localhost:8080?**
- [ ] `docker-compose ps` - status is "Up"?
- [ ] Port 8080 free? (`lsof -i :8080`)
- [ ] Docker Desktop running?
- [ ] Firewall blocking?

**After code changes, still see old code?**
- [ ] Rebuilt image? (`docker-compose build`)
- [ ] Restarted container? (`docker-compose restart`)
- [ ] Better: `docker-compose up -d --build`

**Production deployment failing?**
- [ ] Latest code pushed? (`git log` shows your commit)
- [ ] GCP permissions? (Can run Cloud Build)
- [ ] Service exists? (`gcloud run services list`)
- [ ] Check build logs: `gcloud builds log <BUILD_ID>`

---

## Environment Variables Reference

### Required in .env
```env
FIREBASE_DATABASE_URL=https://ishkul-org-default-rtdb.firebaseio.com/
FIREBASE_STORAGE_BUCKET=gs://ishkul-org.appspot.com
ALLOWED_ORIGINS=http://localhost:3000
GOOGLE_WEB_CLIENT_ID=863006625304-xxx.apps.googleusercontent.com
```

### Optional
```env
GOOGLE_IOS_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID=xxx.apps.googleusercontent.com
```

### Auto-configured
```env
PORT=8080                    # Set in docker-compose.yml
ENVIRONMENT=development      # Set in docker-compose.yml
GOOGLE_APPLICATION_CREDENTIALS=/app/serviceAccountKey.json  # Set in docker-compose.yml
```

---

## Credential Security Checklist

- [ ] `serviceAccountKey.json` is in `.gitignore`
- [ ] `serviceAccountKey.json` is in `.dockerignore`
- [ ] Never commit credentials to git
- [ ] Never hardcode credentials in code
- [ ] Delete old keys from GCP Console after regeneration
- [ ] Use different keys for different environments (dev, staging, prod)

---

## Performance Tips

| Task | Tip |
|------|-----|
| **Faster rebuilds** | Use `docker-compose build --no-cache=false` |
| **Smaller images** | Multi-stage Dockerfile (already done) ✅ |
| **Better logs** | Use `docker-compose logs --tail=100 -f` |
| **Debug container** | `docker-compose exec backend env \| head` |

---

## Links

- **Documentation:** See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed instructions
- **Docker Compose Guide:** See [DOCKER_COMPOSE_GUIDE.md](DOCKER_COMPOSE_GUIDE.md) for all features
- **Project Readme:** See [../../README.md](../../README.md) for architecture overview
- **Cloud Run Dashboard:** [Console](https://console.cloud.google.com/run/detail/northamerica-northeast1/ishkul-backend)
- **Firebase Console:** [Console](https://console.firebase.google.com/project/ishkul-org)

---

## One-Liners

```bash
# Full local setup
gcloud iam service-accounts keys create serviceAccountKey.json --iam-account=firebase-adminsdk-fbsvc@ishkul-org.iam.gserviceaccount.com --project=ishkul-org && docker-compose up -d && sleep 2 && curl http://localhost:8080/health

# Check everything is running
docker-compose ps && echo "---" && docker-compose logs --tail=5

# Rebuild and restart
docker-compose build && docker-compose restart

# Stop everything
docker-compose down

# Deploy to production
git push origin main

# Monitor production
watch -n 5 'gcloud run services logs read ishkul-backend --region=northamerica-northeast1 --limit=20'

# List all service account keys
gcloud iam service-accounts keys list --iam-account=firebase-adminsdk-fbsvc@ishkul-org.iam.gserviceaccount.com
```

---

**Quick Check:** Is your backend ready?
```bash
docker-compose exec backend curl -s http://localhost:8080/health | jq .status
```
Should return: `"healthy"` ✅

---

*Last Updated: 2025-11-27*
