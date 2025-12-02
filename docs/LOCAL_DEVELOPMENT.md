# Local Development Setup

This guide explains how to set up and run both frontend and backend locally with proper configuration.

## Quick Start (One-Time Setup)

### Backend Setup

```bash
# 1. Navigate to backend
cd backend

# 2. Copy environment template
cp .env.example .env

# 3. Edit .env with your values
nano .env
# Update: Firebase credentials, OpenAI API key, Google OAuth IDs, etc.

# 4. Return to root
cd ..
```

### Frontend Setup

```bash
# 1. Navigate to frontend
cd frontend

# 2. Copy environment template
cp .env.example .env

# 3. Environment file already configured for local development!
# EXPO_PUBLIC_API_URL=http://localhost:8080/api

# 4. Install dependencies
npm install
```

## Running Locally

### Terminal 1: Start Backend

```bash
# From project root
go run backend/cmd/server/main.go
```

**Expected output:**
```json
{"msg":"application_startup","environment":"development",...}
{"msg":"firebase_initialized",...}
{"msg":"server_starting","port":"8080",...}
```

The backend is now running at `http://localhost:8080`

### Terminal 2: Start Frontend

```bash
# From project root
npm start
# or for web specifically
npm run web
```

**Expected output:**
```
LAN: exp://192.168.x.x:19000
```

Frontend is now running and **automatically connects to `http://localhost:8080/api`**

## Configuration Files

### Backend (`backend/.env`)

**Controlled by environment variable:** `ENVIRONMENT`

| Mode | What Happens |
|------|--------------|
| `ENVIRONMENT=development` (or empty) | ✅ Loads `.env` file |
| `ENVIRONMENT=production` | ❌ Ignores `.env` file, uses Cloud Run vars |

**Example local `.env`:**
```bash
# Local development
ENVIRONMENT=development

# Firebase
GOOGLE_APPLICATION_CREDENTIALS=serviceAccountKey.json
FIREBASE_DATABASE_URL=https://ishkul-org.firebaseio.com

# OAuth
GOOGLE_WEB_CLIENT_ID=863006625304-dvpija96roc5ki00ebl58pe6qi6bmop8.apps.googleusercontent.com

# LLM (optional)
OPENAI_API_KEY=sk-...

# Server
PORT=8080
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081,http://localhost:19006
```

### Frontend (`frontend/.env`)

**NOT committed to Git** - contains local development configuration

```bash
# Always configured for local development
EXPO_PUBLIC_API_URL=http://localhost:8080/api

# Firebase (public - safe to commit)
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyDC-AtXHpF7jZ1iLIpsvhM6zzGF8WCPHFM
EXPO_PUBLIC_FIREBASE_PROJECT_ID=ishkul-org

# Google OAuth
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=863006625304-dvpija96roc5ki00ebl58pe6qi6bmop8.apps.googleusercontent.com
```

## How API Communication Works

### Local Development Flow

```
Frontend (localhost:19000)
    ↓ (API calls to)
http://localhost:8080/api
    ↓
Backend (Go server on port 8080)
    ↓ (reads environment from)
backend/.env (because ENVIRONMENT=development)
```

### Key Points

1. **Frontend has `EXPO_PUBLIC_API_URL=http://localhost:8080/api`** in `frontend/.env`
   - This is read at build time
   - No manual configuration needed

2. **Backend loads `backend/.env` automatically** in development
   - `godotenv.Load()` loads environment variables
   - Only happens when `ENVIRONMENT` is empty or "development"
   - This is in `backend/cmd/server/main.go`

3. **Environment variables already configured**
   - You don't need to set `EXPO_PUBLIC_API_URL` manually
   - Just ensure both services are running on the correct ports

## Common Issues

### Frontend Can't Connect to Backend

**Problem:** `Network error` when making API requests

**Causes & Solutions:**

1. **Backend not running**
   ```bash
   # Terminal 1: Check if backend is running
   go run backend/cmd/server/main.go
   # Should see: "server_starting" in logs
   ```

2. **Wrong API URL in frontend**
   ```bash
   # Check frontend/.env
   grep EXPO_PUBLIC_API_URL frontend/.env
   # Should be: EXPO_PUBLIC_API_URL=http://localhost:8080/api
   ```

3. **CORS blocking requests**
   - Check backend logs for CORS errors
   - Verify `ALLOWED_ORIGINS` includes your frontend URL
   - Backend defaults include `http://localhost:*` domains

### Backend Won't Start

**Problem:** `Failed to initialize Firebase` or `OPENAI_API_KEY not set`

**Solutions:**

1. **Check `.env` file exists**
   ```bash
   ls backend/.env
   # If missing:
   cp backend/.env.example backend/.env
   ```

2. **Verify required variables**
   ```bash
   # These are required:
   grep -E "GOOGLE_APPLICATION_CREDENTIALS|FIREBASE_DATABASE_URL" backend/.env
   ```

3. **Check ENVIRONMENT variable**
   ```bash
   # If ENVIRONMENT is set to "production", .env won't load!
   echo $ENVIRONMENT
   # Should be empty or "development"
   ```

### Environment Variables Not Loading

**Problem:** Backend can't find `OPENAI_API_KEY` or other variables

**Debug:**

1. **Verify `.env` file syntax**
   ```bash
   # Should be: KEY=value (no spaces around =)
   cat backend/.env | grep OPENAI_API_KEY
   ```

2. **Check if ENVIRONMENT is "production"**
   ```bash
   # Production mode skips .env loading
   echo $ENVIRONMENT
   # Unset if it says "production"
   unset ENVIRONMENT
   ```

3. **Restart backend**
   - `Ctrl+C` to stop
   - `go run backend/cmd/server/main.go` to restart

## Testing API Connection

### From Frontend

```bash
# Use Expo CLI to test
cd frontend
npm start

# Login with Google
# Try to create/view learning paths
# Check browser console for API calls
```

### From Terminal

```bash
# Test backend health check
curl http://localhost:8080/health

# Test with auth (requires token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8080/api/me
```

## Port Reference

| Service | Port | URL |
|---------|------|-----|
| Backend (Go) | 8080 | `http://localhost:8080` |
| Frontend Web | 3000 | `http://localhost:3000` |
| Frontend Expo | 19000+ | `exp://192.168.x.x:19000` |

## Production Deployment

When deploying to production:

1. **Backend (`backend/.env`):**
   - Don't need to set anything manually
   - GitHub Actions sets `ENVIRONMENT=production`
   - Cloud Run environment variables are used instead

2. **Frontend:**
   - `EXPO_PUBLIC_API_URL` is overridden during deployment
   - Points to your Cloud Run service URL
   - Set via deployment environment variables

## Never Commit These Files

These are excluded by `.gitignore`:

- `backend/.env` - Contains API keys and secrets
- `frontend/.env` - Contains local development config
- `frontend/.env.local` - Contains local overrides

## Making Changes

### Adding a New Environment Variable

**Backend:**
1. Add to `backend/.env`
2. Add to `backend/.env.example` with placeholder
3. Update GitHub Secrets for production
4. Restart backend: `Ctrl+C` then re-run

**Frontend:**
1. Add to `frontend/.env`
2. Add to `frontend/.env.example` with placeholder
3. Use in code: `process.env.EXPO_PUBLIC_VAR_NAME`
4. Restart: `npm start`

## Related Documentation

- [Environment Variable Management](./GITHUB_SECRETS_SETUP.md) - Production secrets
- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Cloud Run & Vercel
- [Backend Logging Guide](../LOGGING_GUIDE.md) - Understanding logs

---

**TL;DR:**
- Run `go run backend/cmd/server/main.go` in one terminal
- Run `npm start` in another terminal
- Frontend automatically connects to `http://localhost:8080/api`
- No manual configuration needed each time!
