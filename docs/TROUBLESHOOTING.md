# Troubleshooting Guide

Common issues and solutions for frontend, backend, and deployment.

## Frontend Issues

### Google Sign-In Fails

**Symptoms**: "Sign-in failed" error, redirect loop, blank screen

**Solutions**:

1. Check OAuth Client IDs in `.env.local`:
   ```bash
   grep GOOGLE frontend/.env.local
   ```

2. Verify Client IDs match Google Cloud Console:
   ```
   https://console.cloud.google.com/apis/credentials
   ```

3. Check authorized redirect URIs:
   - Web: `http://localhost:3000`, `https://ishkul.vercel.app`
   - Expo: `https://auth.expo.io/@YOUR_EXPO_USERNAME/ishkul`

4. Clear browser cache and restart:
   ```bash
   npx expo start -c
   ```

5. Check browser console for detailed error (F12 → Console)

### Type Errors at Runtime

**Symptoms**: "Cannot read property X of undefined", type mismatch errors

**Solutions**:

1. Run type checker before commit:
   ```bash
   cd frontend && npm run type-check
   ```

2. Check for missing type definitions:
   ```bash
   grep "any\|as any" src/ -r
   # Try to avoid using 'any'
   ```

3. Update types in `src/types/app.ts` if data structure changed

### Expo Dev Server Won't Start

**Symptoms**: Port already in use, "Cannot bind to port"

**Solutions**:

1. Kill process on port 19000:
   ```bash
   lsof -i :19000 | grep LISTEN | awk '{print $2}' | xargs kill -9
   ```

2. Check Node version (18+ required):
   ```bash
   node --version
   ```

3. Clear Expo cache:
   ```bash
   cd frontend && rm -rf .expo node_modules
   npm install
   npx expo start -c
   ```

### Firestore Permission Denied

**Symptoms**: "Missing or insufficient permissions", auth errors

**Solutions**:

1. Verify user is authenticated:
   ```bash
   # Check Firebase Console → Authentication
   # User should appear there after Google Sign-In
   ```

2. Check Firestore Security Rules:
   ```bash
   # firebase/firestore.rules should allow user reads/writes
   match /users/{uid} {
     allow read, write: if request.auth.uid == uid;
   }
   ```

3. Deploy rules if changed:
   ```bash
   firebase deploy --only firestore:rules --project=ishkul-org
   ```

4. Check network request in DevTools (F12 → Network)

### Build Fails with TypeScript Errors

**Symptoms**: `npm run build` fails, compilation errors

**Solutions**:

1. Check exact error:
   ```bash
   cd frontend && npm run type-check
   ```

2. Fix type errors one by one

3. Don't use `any` type - use proper TypeScript

4. Check tsconfig.json for strict mode:
   ```json
   {
     "compilerOptions": {
       "strict": true,
       "noImplicitAny": true
     }
   }
   ```

---

## Backend Issues

### Backend Won't Start

**Symptoms**: "address already in use", port 8080 busy

**Solutions**:

1. Kill process on port 8080:
   ```bash
   lsof -i :8080 | grep LISTEN | awk '{print $2}' | xargs kill -9
   ```

2. Check Go version (1.23+ required):
   ```bash
   go version
   ```

3. Verify dependencies:
   ```bash
   cd backend && go mod tidy && go mod download
   ```

4. Check error output:
   ```bash
   go run cmd/server/main.go 2>&1 | head -20
   ```

### Firebase Service Account Auth Fails

**Symptoms**: 403 Permission Denied, "could not initialize credentials"

**Solutions**:

1. Verify service account file exists:
   ```bash
   ls -la backend/serviceAccountKey.json
   ```

2. Check environment variable:
   ```bash
   cat backend/.env | grep GOOGLE_APPLICATION_CREDENTIALS
   ```

3. Verify credentials are valid JSON:
   ```bash
   python3 -m json.tool backend/serviceAccountKey.json
   ```

4. Check file permissions:
   ```bash
   chmod 600 backend/serviceAccountKey.json
   ```

5. Verify Firebase project ID matches:
   ```bash
   grep FIREBASE_PROJECT_ID backend/.env
   jq '.project_id' backend/serviceAccountKey.json
   # Should match
   ```

### Backend Can't Connect to Firestore

**Symptoms**: Timeout errors, "connection refused"

**Solutions**:

1. Check Firestore is enabled:
   ```
   https://console.firebase.google.com → Firestore Database
   Should show "Running"
   ```

2. Verify network allows outbound to `firestore.googleapis.com`

3. Check logs for detailed error:
   ```bash
   go run cmd/server/main.go 2>&1
   ```

4. Test Firebase Admin SDK:
   ```bash
   # Add simple health check endpoint
   curl http://localhost:8080/health
   # Should return {"status":"ok"}
   ```

### CORS Errors in Frontend

**Symptoms**: "Access to XMLHttpRequest blocked by CORS policy"

**Solutions**:

1. Check ALLOWED_ORIGINS in backend/.env:
   ```bash
   grep ALLOWED_ORIGINS backend/.env
   # Should include your frontend URL
   ```

2. Update if needed:
   ```bash
   # For local development
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081,http://localhost:19006

   # For production
   ALLOWED_ORIGINS=https://ishkul.vercel.app
   ```

3. Sync to Cloud Run:
   ```bash
   ./scripts/update-backend-env.sh
   ```

4. Check backend middleware:
   ```bash
   # backend/internal/middleware/cors.go should set headers
   ```

5. Restart backend:
   ```bash
   go run cmd/server/main.go
   ```

### Go Compilation Fails

**Symptoms**: "undefined reference", "package not found"

**Solutions**:

1. Update dependencies:
   ```bash
   cd backend
   go get -u ./...
   go mod tidy
   ```

2. Check for syntax errors:
   ```bash
   gofmt -l .
   # Should have no output
   ```

3. Run build to find issues:
   ```bash
   go build ./...
   ```

4. Check Go version matches go.mod:
   ```bash
   cat backend/go.mod | head -1
   go version
   # First line of go.mod should match your Go version
   ```

---

## Deployment Issues

### Cloud Run Deployment Fails

**Symptoms**: Build fails, service won't start after deploy

**Solutions**:

1. Check build logs:
   ```bash
   gcloud builds log --follow --project=ishkul-org
   ```

2. Verify Dockerfile:
   ```bash
   docker build -t ishkul-backend backend/
   # If this fails, Dockerfile is the problem
   ```

3. Check environment variables are set:
   ```bash
   gcloud run services describe ishkul-backend \
     --region=europe-west1 \
     --project=ishkul-org \
     --format='value(spec.template.spec.containers[0].env)'
   ```

4. View Cloud Run logs:
   ```bash
   gcloud run services logs read ishkul-backend \
     --limit=50 \
     --region=europe-west1
   ```

### 502 Bad Gateway / Service Unavailable

**Symptoms**: "Error 502" from Cloud Run, service not responding

**Solutions**:

1. Check service is running:
   ```bash
   gcloud run services describe ishkul-backend --region=europe-west1
   # Check spec.traffic[0].revisionName
   ```

2. Check health endpoint:
   ```bash
   curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
     https://ishkul-backend-863006625304.europe-west1.run.app/health
   ```

3. Check logs for errors:
   ```bash
   gcloud run services logs read ishkul-backend \
     --limit=100 \
     --region=europe-west1
   ```

4. Check environment variables are correctly set

5. Redeploy:
   ```bash
   cd backend && gcloud run deploy ishkul-backend \
     --source=. \
     --region=europe-west1 \
     --allow-unauthenticated
   ```

### Environment Variables Not Applied

**Symptoms**: Backend crashes, "environment variable not found"

**Solutions**:

1. Verify variables in backend/.env:
   ```bash
   cat backend/.env
   ```

2. Sync with update script:
   ```bash
   ./scripts/update-backend-env.sh
   ```

3. Check they're applied:
   ```bash
   gcloud run services describe ishkul-backend \
     --region=europe-west1 \
     --format='value(spec.template.spec.containers[0].env)'
   ```

4. Check secrets in Secret Manager:
   ```bash
   gcloud secrets list --project=ishkul-org
   # Should include 'jwt-secret'
   ```

5. If using custom secrets, verify permissions:
   ```bash
   gcloud secrets get-iam-policy jwt-secret --project=ishkul-org
   # Should show Cloud Run service account with 'secretmanager.secretAccessor'
   ```

### Vercel Deployment Skipped

**Symptoms**: Frontend not deploying to Vercel

**Causes**: Deployment intentionally skipped if only backend files changed

**Solutions**:

1. Make a frontend change or update `.env.example`
2. Push to main:
   ```bash
   git add frontend/
   git commit -m "Update frontend"
   git push origin main
   ```

3. Check Vercel dashboard:
   ```
   https://vercel.com/my-dream-company/ishkul/deployments
   ```

---

## Performance Issues

### Slow API Responses

**Symptoms**: Requests take >1s, timeout errors

**Solutions**:

1. Check Firestore query performance:
   ```bash
   # Go to Firebase Console → Firestore → Composite Indexes
   # Look for red flags about missing indexes
   ```

2. Monitor Cloud Run metrics:
   ```
   https://console.cloud.google.com/run/detail/europe-west1/ishkul-backend/metrics
   ```

3. Check for N+1 queries in backend code:
   ```bash
   # Each request shouldn't do multiple Firestore reads
   ```

4. Consider adding caching:
   ```go
   // Cache frequently accessed data
   ```

5. Check network latency from frontend to backend

### High Memory Usage

**Symptoms**: Service crashes, OOM errors in logs

**Solutions**:

1. Check memory allocation:
   ```bash
   gcloud run services describe ishkul-backend \
     --region=europe-west1 \
     --format='value(spec.template.spec.containers[0].resources)'
   ```

2. Increase if needed:
   ```bash
   gcloud run services update ishkul-backend \
     --memory=512Mi \
     --region=europe-west1
   ```

3. Profile Go application:
   ```bash
   # Add pprof endpoints to Go code
   import "net/http/pprof"
   ```

4. Check for memory leaks in code review

### High CPU Usage

**Symptoms**: Slow responses under load, high cost

**Solutions**:

1. Check CPU allocation:
   ```bash
   gcloud run services describe ishkul-backend \
     --region=europe-west1 \
     --format='value(spec.template.spec.containers[0].resources)'
   ```

2. Increase if needed:
   ```bash
   gcloud run services update ishkul-backend \
     --cpu=2 \
     --region=europe-west1
   ```

3. Optimize hot code paths with profiling:
   ```bash
   go tool pprof http://localhost:6060/debug/pprof/profile
   ```

4. Consider caching expensive computations

---

## Testing Issues

### Tests Won't Run

**Symptoms**: `npm test` fails, "cannot find test"

**Solutions**:

1. Verify test files exist:
   ```bash
   find frontend/src -name "*.test.ts" -o -name "*.test.tsx"
   ```

2. Check Jest config:
   ```bash
   cat frontend/jest.config.js
   ```

3. Clear Jest cache:
   ```bash
   cd frontend && npm test -- --clearCache
   ```

4. Run with verbose output:
   ```bash
   npm test -- --verbose
   ```

### Backend Tests Fail

**Symptoms**: `go test ./...` returns failures

**Solutions**:

1. Run with verbose output:
   ```bash
   cd backend && go test -v ./...
   ```

2. Run specific test:
   ```bash
   go test -v ./internal/handlers -run TestHandler
   ```

3. Check test isolation:
   - Tests should not depend on execution order
   - Use separate test databases/mocks

4. Update snapshots if needed:
   ```bash
   # For snapshot testing
   ```

---

## Quick Debugging Checklist

When something breaks:

- [ ] Check error message carefully
- [ ] Read logs: `gcloud run services logs read ishkul-backend --limit=100`
- [ ] Verify environment variables are set
- [ ] Confirm service accounts/permissions are correct
- [ ] Check network connectivity (localhost vs. cloud)
- [ ] Clear caches: `npx expo start -c`, `go clean -cache`
- [ ] Restart services
- [ ] Check GitHub Actions logs if deployment failed
- [ ] Search this guide for similar issue
- [ ] Check [CLAUDE.md](../CLAUDE.md) for development guidelines

---

## Related Documentation

- [DEVELOPMENT_SETUP.md](DEVELOPMENT_SETUP.md) - Environment setup
- [INFRASTRUCTURE.md](INFRASTRUCTURE.md) - Cloud Run management
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Deployment process
- [CLAUDE.md](../CLAUDE.md) - Development guidelines
