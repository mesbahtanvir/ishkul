# Manual API Testing Guide

## Prerequisites

1. **Backend running**: `go run backend/cmd/server/main.go`
2. **Backend logs visible**: Check startup messages for Firebase and LLM initialization

## Testing Flow

### 1. Check Backend Health

```bash
curl http://localhost:8080/health
```

**Expected Response:**
```json
{"status":"healthy","timestamp":"...","service":"ishkul-backend"}
```

### 2. Register User

You need Firebase to be properly initialized. If registration fails with "INTERNAL_ERROR", it means:
- Firebase Auth client is not initialized
- The serviceAccountKey.json path is incorrect
- Firebase project credentials are invalid

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "myuser@gmail.com",
    "password": "MyPass123!"
  }'
```

**Expected Response:**
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "refresh_...",
  "expiresIn": 3600,
  "user": {
    "id": "firebase_uid_...",
    "email": "myuser@gmail.com",
    ...
  }
}
```

### 3. Create Learning Path

Replace `YOUR_ACCESS_TOKEN` with token from step 2:

```bash
curl -X POST http://localhost:8080/api/learning-paths \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "goal": "Learn Python",
    "level": "beginner",
    "topic": "Programming"
  }'
```

**Expected Response:**
```json
{
  "path": {
    "id": "path_id_123",
    "goal": "Learn Python",
    "level": "beginner",
    ...
  }
}
```

### 4. Get Next Step (The Critical Test)

Replace `PATH_ID` and `YOUR_ACCESS_TOKEN`:

```bash
curl -X POST http://localhost:8080/api/learning-paths/PATH_ID/next \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Success Response:**
```json
{
  "step": {
    "id": "step_id_...",
    "type": "lesson",
    "topic": "Python Basics",
    "title": "Introduction to Python",
    "content": "Python is...",
    ...
  },
  "stepIndex": 0
}
```

**If LLM Not Initialized:**
```json
{
  (error response with 500 status)
  "Failed to generate next step: LLM not initialized"
}
```

## Troubleshooting

### Firebase Auth Not Working

**Symptom**: Registration returns `INTERNAL_ERROR`

**Check:**
1. Is `serviceAccountKey.json` in `backend/`?
   ```bash
   ls -la backend/serviceAccountKey.json
   ```

2. Is `GOOGLE_APPLICATION_CREDENTIALS` set in `backend/.env`?
   ```bash
   grep GOOGLE_APPLICATION_CREDENTIALS backend/.env
   # Should show: serviceAccountKey.json
   ```

3. Check Firebase initialization in backend logs:
   ```bash
   # Backend should output:
   # "firebase_initialized"
   # OR
   # "firebase_initialization_failed"
   ```

### LLM Not Initialized

**Symptom**: Next step API returns "LLM not initialized"

**Check:**
1. Is `OPENAI_API_KEY` set in `backend/.env`?
   ```bash
   grep OPENAI_API_KEY backend/.env | head -c 50
   ```

2. Do prompt files exist?
   ```bash
   ls -la prompts/learning/next-step.prompt.yml
   ```

3. Check backend startup logs for:
   - `llm_initialization_attempt`
   - `openai_client_initialized` (✅) or `openai_client_init_failed` (❌)
   - `prompt_loader_initialized`

## Key Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/health` | GET | ❌ | Health check |
| `/api/auth/register` | POST | ❌ | Create user |
| `/api/auth/login` | POST | ❌ | Get tokens |
| `/api/learning-paths` | GET | ✅ | List paths |
| `/api/learning-paths` | POST | ✅ | Create path |
| `/api/learning-paths/{id}/next` | POST | ✅ | Generate next step |

## Notes

- **Authorization Header Format**: `Bearer YOUR_ACCESS_TOKEN`
- **Content-Type**: Always `application/json`
- **Tokens expire after 1 hour** (use refresh endpoint to get new ones)
- **Learning path IDs** are from Firestore documents

