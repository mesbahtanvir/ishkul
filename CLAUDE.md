# Claude Code Instructions - Ishkul

Quick reference for developing Ishkul - an adaptive learning platform.
(Frontend: React Native/Expo | Backend: Go | Database: Cloud Firestore)

## 📁 Project Structure

```
ishkul/
├── frontend/               # React Native/Expo (TypeScript 5.9, Zustand, React Navigation 7)
│   ├── src/components/    # Reusable UI components
│   ├── src/screens/       # App screens
│   ├── src/services/      # Firebase, auth, LLM services
│   ├── src/state/         # Zustand stores
│   └── src/types/         # TypeScript definitions
├── backend/               # Go 1.23 service (Cloud Run)
│   ├── cmd/server/        # Entry point
│   ├── internal/handlers/ # HTTP endpoints
│   └── pkg/firebase/      # Firebase Admin SDK
├── firebase/              # Firestore rules & config
├── prompts/               # LLM prompts (.prompt.yml) - works with GitHub Models & backend
├── tests/                 # E2E & Performance tests
│   ├── k6/               # Load/stress testing (k6)
│   └── postman/          # API functional tests (Newman)
├── e2e/                   # Web E2E tests (Playwright)
├── .maestro/              # Mobile E2E tests (Maestro)
├── .github/
│   ├── workflows/         # GitHub Actions CI/CD
│   └── copilot-instructions.md  # Repository-wide Copilot instructions
└── CLAUDE.md              # Claude Code instructions (this file)
```

## 🔧 Key Commands

### Frontend
```bash
npm start                # Start Expo dev server
npm run type-check       # TypeScript checking
npm run lint             # ESLint
npm test                 # Run tests
npm run build            # Build for web
```

### Backend
```bash
go run cmd/server/main.go   # Run locally
go test ./...               # Run tests
go vet ./...                # Static analysis (run before commits)
gofmt -w .                  # Format code (run before commits)
gcloud run deploy ishkul-backend --source .  # Deploy to Cloud Run
```

**IMPORTANT for Claude**: Always run `go vet ./...`, `gofmt -w .`, and `go test ./...`
after making Go changes, even if not explicitly asked. These are required CI checks.

### E2E & Performance Testing
```bash
# API functional tests (Newman)
newman run tests/postman/ishkul-api.collection.json -e tests/postman/staging.environment.json

# Load testing (k6)
k6 run tests/k6/smoke-test.js --env USE_STAGING=true

# Web E2E (Playwright)
cd e2e && npm test

# Mobile E2E (Maestro)
maestro test .maestro/flows/smoke-test.yaml
```

## 🎯 Feature Implementation Checklist

When implementing a new feature, consider ALL of the following:

- [ ] **Frontend changes** - UI components, screens, state management
- [ ] **Backend changes** - API endpoints, handlers, business logic
- [ ] **Unit tests** - Test individual functions and components
- [ ] **Integration tests** - Test interactions between components/services
- [ ] **E2E tests** - Add Playwright/Maestro tests for critical user flows
- [ ] **Infrastructure changes** - Firebase rules, Cloud Run config, environment variables

## 🧪 MANDATORY: Unit Testing Requirements

**IMPORTANT for Claude**: When creating or modifying screens/components, you MUST create or update corresponding test files. This is non-negotiable.

### Frontend Testing Rules

1. **Every new screen MUST have a test file**
   - Location: `frontend/src/screens/__tests__/ScreenName.test.tsx`
   - Must cover: all render states (loading, error, empty, success)
   - Must cover: state transitions to catch React Rules of Hooks violations

2. **Every new component MUST have a test file**
   - Location: `frontend/src/components/__tests__/ComponentName.test.tsx`
   - Must cover: all props combinations, user interactions

3. **State transitions tests are CRITICAL**
   - Always test re-renders between different states (loading→loaded, error→success)
   - This catches React hooks order violations that cause production crashes

4. **Test file template for screens**:
   ```typescript
   describe('ScreenName', () => {
     describe('Loading State', () => { /* tests */ });
     describe('Error State', () => { /* tests */ });
     describe('Success State', () => { /* tests */ });
     describe('State Transitions (Rules of Hooks)', () => {
       it('should handle transition from loading to success', () => { /* test */ });
       it('should handle transition from loading to error', () => { /* test */ });
     });
   });
   ```

5. **Run tests before committing**:
   ```bash
   npm test -- --testPathPattern="YourNewFile.test"
   ```

### Backend Testing Rules

1. **Every new handler MUST have a test file**
   - Location: `backend/internal/handlers/handler_name_test.go`
   - Must cover: success cases, error cases, edge cases

2. **Run tests before committing**:
   ```bash
   go test ./...
   ```

### Why This Matters

Missing tests caused production crash (React error #310) in LessonScreen where hooks
were called after conditional returns. Tests with state transition coverage would have
caught this bug before deployment.

## 📋 After Making Code Changes - CHECKLIST

**Automated Pre-Commit Checks**: Hooks run automatically before each commit to ensure:
- ✅ Frontend linting, type-checking, and tests pass
- ✅ Backend formatting and tests pass
- ❌ If any fail, commit is blocked until fixed

**Manual Review Checklist**:

1. **Documentation**:
   - [ ] Updated CLAUDE.md if architecture changed
   - [ ] Updated relevant guide (in `docs/` folder)
   - [ ] Clear commit message explaining changes

2. **For Deployment Changes**:
   - [ ] Test locally first: `npm start` (frontend) or `go run cmd/server/main.go` (backend)
   - [ ] Verify all environment variables set correctly
   - [ ] Check CI logs after push

**Need to bypass checks?** (⚠️ Last resort only)
```bash
git commit --no-verify  # Skips pre-commit hooks (use for urgent hotfixes only)
```

See [docs/PRE_COMMIT_HOOKS.md](docs/PRE_COMMIT_HOOKS.md) for detailed testing enforcement info.

## 📌 When to Update Documentation

### Update CLAUDE.md when:
- **Architecture changes** - New folder structure, major refactoring
- **Tech stack changes** - New framework, version upgrades
- **Development patterns** - New conventions, best practices
- **Key commands change** - Different build/test/deploy commands

### Move to DEVELOPMENT_SETUP.md when:
- Environment variable configs
- Local development setup
- Detailed dependency instructions

### Move to DEPLOYMENT_GUIDE.md when:
- CI/CD pipeline details
- Vercel/Cloud Run configurations
- Conditional deployment logic

### Move to TROUBLESHOOTING.md when:
- Common issues & fixes
- Debug commands
- Error messages

### Move to ROADMAP.md when:
- Feature ideas
- Future improvements
- Technical debt

## 💡 Development Guidelines

### Documentation Files
- **Always place markdown files in `docs/` folder** - Keep all `.md` documentation
  organized in the `docs/` directory
- **Exception**: `CLAUDE.md`, `README.md`, and `frontend/DESIGN_SYSTEM.md` remain
  in their current locations
- Never create markdown files in the root directory or scattered across the project
- Update existing docs files when adding information; don't create new scattered
  markdown files

### Frontend
- **TypeScript required** - No plain JavaScript, avoid `any` keyword
- **Run `npx tsc --noEmit`** - Always verify TypeScript after changes (from `frontend/` dir)
- **Zustand stores** - Use for state management
- **React Navigation 7** - Follow existing patterns
- **Firebase client SDK** - Use services in `src/services/`
- **Design system** - See [frontend/DESIGN_SYSTEM.md](frontend/DESIGN_SYSTEM.md)
- **Cross-platform** - Test on web, iOS, Android

### Backend
- **Go conventions** - Follow best practices, use gofmt
- **Firebase Admin SDK** - For server-side operations
- **Error handling** - Proper HTTP status codes
- **Auth middleware** - Required for `/api/*` endpoints
- **Environment vars** - Use `.env` files, sync with `./scripts/sync-env.sh`

## 🔐 Firebase

- **Collections**: `users/` (profiles, history, learning data)
- **Auth**: Google Sign-In + JWT tokens
- **Rules**: Users read/write own documents only
- **Storage**: User uploads (future feature)

## 🤖 AI Assistant Configuration

This repository supports multiple AI coding assistants:

### Claude Code
- **CLAUDE.md** (this file) - Project instructions for Claude Code

### GitHub Copilot
- **`.github/copilot-instructions.md`** - Repository-wide instructions for Copilot

### GitHub Models (Preview)
- **`prompts/*.prompt.yml`** - All prompts work with GitHub Models
- Files appear in the repository's Models page and can be run in Prompt Editor
- Supports model comparison, evaluation, and CI/CD integration via `gh models eval`

### Prompts Directory Structure
All `.prompt.yml` files are in `prompts/` for easy backend loading AND GitHub Models integration:
- `prompts/learning/` - Learning feature prompts (quiz, lessons, exercises)
- `prompts/system/` - System prompts (learning coach)
- `prompts/*.prompt.yml` - Dev tool prompts (code review, test generation)

| Location | Extension | Purpose |
|----------|-----------|---------|
| `.github/copilot-instructions.md` | `.md` | Copilot repo instructions |
| `prompts/` | `.prompt.yml` | All prompts (GitHub Models + backend) |

## 📚 External Documentation

For detailed information, see:

- **[docs/DEVELOPMENT_SETUP.md](docs/DEVELOPMENT_SETUP.md)** - Environment setup, .env files, OAuth
- **[docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)** - CI/CD, Vercel, Cloud Run, Firebase rules
- **[docs/INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md)** - Cloud Run management, scaling, monitoring
- **[docs/GRAFANA_CLOUD_SETUP.md](docs/GRAFANA_CLOUD_SETUP.md)** - Metrics & observability with Grafana Cloud (free tier)
- **[docs/PREVIEW_DEPLOYMENTS.md](docs/PREVIEW_DEPLOYMENTS.md)** - Backend preview environments on PRs
- **[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** - Common issues, debug commands
- **[docs/ROADMAP.md](docs/ROADMAP.md)** - Future features, enhancements, timeline
- **[docs/PROJECT_SUMMARY.md](docs/PROJECT_SUMMARY.md)** - Detailed architecture
- **[docs/ENV_SYNC_GUIDE.md](docs/ENV_SYNC_GUIDE.md)** - Dynamic environment variable syncing
- **[docs/ANALYTICS.md](docs/ANALYTICS.md)** - Analytics strategy, events, funnels (WIP)
- **[docs/TESTING.md](docs/TESTING.md)** - E2E testing guide (k6, Playwright, Maestro, Newman)
- **[frontend/DESIGN_SYSTEM.md](frontend/DESIGN_SYSTEM.md)** - UI/UX design tokens

## 🚀 Quick Deploy

### 🎯 Production Release

```bash
# Create and push release tag
git tag v1.0.3 && git push origin v1.0.3

# Workflow automatically:
# - Deploys backend to Cloud Run (production environment)
# - Updates prod branch → triggers Vercel frontend
# - ~5 min to complete
```

### 🔄 Staging Deployment

```bash
# Push to main - auto-deploys if backend/* changed
git push origin main
```

### 🔐 Sync Environment Secrets

```bash
# Sync local .env files to GitHub Environments
./scripts/sync-env.sh staging      # backend/.env.staging → GitHub staging
./scripts/sync-env.sh production   # backend/.env.production → GitHub production
```

### GitHub Workflows (3 total)

| Workflow | Trigger | Environment | Purpose |
|----------|---------|-------------|---------|
| `ci.yml` | Push/PR | - | Lint, test, type-check |
| `deploy-backend.yml` | Push to main / Tag v* | staging / production | Backend → Cloud Run |
| `deploy-firebase.yml` | Push to main / Manual | staging / production | Firestore/Storage rules |

## 🔗 Quick Links

- **Cloud Run Dashboard**: [Metrics & logs](https://console.cloud.google.com/run/detail/northamerica-northeast1/ishkul-backend/metrics?project=ishkul-org)
- **Vercel Deployments**: [Frontend builds](https://vercel.com/my-dream-company/ishkul/deployments)
- **Firebase Console**: [Firestore, Auth, Storage](https://console.firebase.google.com/project/ishkul-org)
- **GCP Console**: [Overall project](https://console.cloud.google.com/welcome?project=ishkul-org)

## ⚡ Common Tasks

### Add New Frontend Screen
1. Create `frontend/src/screens/NewScreen.tsx`
2. Add to navigation in `frontend/src/navigation/AppNavigator.tsx`
3. Update types in `frontend/src/types/app.ts`
4. **MANDATORY**: Create test file `frontend/src/screens/__tests__/NewScreen.test.tsx`
   - Include tests for all states: loading, error, empty, success
   - Include state transition tests (see Testing Requirements section)

### Add Backend API Endpoint
1. Create handler in `backend/internal/handlers/`
2. Add route in `backend/cmd/server/main.go`
3. **MANDATORY**: Create test file `backend/internal/handlers/handler_name_test.go`
4. Test locally with `go run cmd/server/main.go`
5. Run `go test ./...` to verify tests pass

### Add Environment Variable
1. Add to `backend/.env.example` (template)
2. Add to `backend/.env.staging` and/or `backend/.env.production`
3. Run: `./scripts/sync-env.sh staging` or `./scripts/sync-env.sh production`
4. Push to trigger deployment (secrets auto-applied)

## ⚠️ Top 5 Troubleshooting Tips

1. **Google Sign-In fails** → Check OAuth Client IDs in `.env`
2. **Type errors** → Run `npm run type-check` before commit
3. **Firestore permission denied** → Verify security rules and authentication
4. **Port already in use** → `lsof -i :8080 | grep LISTEN | awk '{print $2}' | xargs kill -9`
5. **Service won't start on Cloud Run** → Check `gcloud run services logs read ishkul-backend --limit=50`

For more, see [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

---

**Last Updated**: 2025-12-12 | **Version**: 2.5.0 | **Status**: Production Ready ✅
*Updated: Added mandatory unit testing requirements for screens/components*
