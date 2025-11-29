# Pre-Commit Hooks - Testing Enforcement

This guide explains how pre-commit hooks enforce code quality and prevent broken code from being committed.

## What It Does

The pre-commit hook automatically runs before each `git commit` and:

1. **Frontend** (if `frontend/` changed):
   - ✅ Runs ESLint (`npm run lint`)
   - ✅ Runs TypeScript type-check (`npm run type-check`)
   - ✅ Runs all tests (`npm test`)

2. **Backend** (if `backend/` changed):
   - ✅ Checks Go formatting (`gofmt`)
   - ✅ Runs all tests (`go test ./...`)

If any check **fails**, the commit is **blocked** until you fix the issues.

## Initial Setup

### 1. Install Husky (One-Time)

```bash
cd /repo/root
npm install husky --save-dev
npx husky install
```

The `.husky/` directory should already exist with the pre-commit hook.

### 2. Make Sure Git Hooks Are Executable

```bash
chmod +x .husky/pre-commit
```

### 3. Verify It's Working

Try to commit a broken change to test the hook:

```bash
# This should FAIL the pre-commit checks
npm test  # Should block if tests fail
git commit -m "test"
```

## How It Works

### Example 1: Frontend Test Failure

```bash
$ git commit -m "Add new feature"

🔍 Running pre-commit checks...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 FRONTEND: Running checks...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🔍 Linting TypeScript... ✓
  📝 Type checking... ✓
  🧪 Running tests...
    ✗ LoginScreen.test.tsx failed: "Sign-in button not found"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ Tests failed!
Fix failing tests before committing
Run: npm test -- --watchAll=false

🚫 Commit blocked until all checks pass
```

**What to do:**
1. Run the test to see what's wrong: `npm test -- --watchAll=false`
2. Fix the failing test
3. Try committing again: `git commit -m "..."`

### Example 2: Backend Type Error

```bash
$ git commit -m "Add API endpoint"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 BACKEND: Running checks...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🔍 Checking Go formatting... ✓
  🧪 Running Go tests...
    undefined: UserHandler

❌ Go tests failed!
Fix failing tests before committing
```

**What to do:**
1. Fix the compilation error
2. Run tests locally: `go test ./...`
3. Try committing again

## Forcing a Commit (Last Resort)

⚠️ **Use ONLY for urgent hotfixes, not for regular development**

If you absolutely must commit without passing checks:

```bash
git commit --no-verify
```

**Important Notes:**
- `--no-verify` bypasses ALL pre-commit checks
- This should be rare - use only for production hotfixes
- Tell the team why you needed this
- Always fix the broken code as soon as possible

## What If Tests Don't Run?

If the hook isn't working:

1. **Check if Husky is installed:**
   ```bash
   npx husky --version
   ```

2. **Reinstall hooks:**
   ```bash
   npx husky install
   chmod +x .husky/pre-commit
   ```

3. **Check hook file exists:**
   ```bash
   ls -la .husky/pre-commit
   # Should show: -rwx--x--x (executable)
   ```

4. **Test manually:**
   ```bash
   # Run the checks that the hook would run
   cd frontend && npm run lint && npm run type-check && npm test
   ```

## Disabling the Hook (Not Recommended)

If the hook is slowing down your workflow and you need to disable it temporarily:

```bash
# Temporarily disable
mv .husky/pre-commit .husky/pre-commit.disabled

# Re-enable
mv .husky/pre-commit.disabled .husky/pre-commit
```

**Better approach:** Talk to the team about optimizing the checks instead.

## For CI/CD

Pre-commit hooks run **locally** on your machine. CI/CD pipelines (GitHub Actions) have their own separate checks that run when you push.

This means:
- Pre-commit hooks: Catch issues before you push
- CI/CD: Double-check everything on the server
- Both together: Maximum reliability

## Common Issues & Fixes

### Issue: "npm: command not found"

**Cause:** Node.js not installed or PATH issue

**Fix:**
```bash
which node  # Check if Node is available
node --version  # Should be 18+
```

### Issue: "go: command not found"

**Cause:** Go not installed

**Fix:**
```bash
which go  # Check if Go is available
go version  # Should be 1.23+
```

### Issue: Tests run very slowly

**Cause:** Hook runs all tests, which can take time

**Options:**
1. Wait for full test suite (recommended)
2. Optimize slow tests
3. Split tests into unit/integration (and run only unit tests in pre-commit)

### Issue: Hook runs but all tests pass, commit still fails

**Cause:** Other checks failed (lint, type-check, format)

**Fix:**
```bash
# Frontend
cd frontend
npm run lint -- --fix    # Auto-fix lint issues
npm run type-check       # Fix type errors manually

# Backend
cd backend
gofmt -w .               # Auto-format Go code
```

## Related Files

- `.husky/pre-commit` - The actual hook script
- `.husky/_/husky.sh` - Husky initialization (auto-generated)
- `frontend/package.json` - npm scripts configuration
- `backend/go.mod` - Go module configuration

## See Also

- [CLAUDE.md](CLAUDE.md) - Development guidelines
- [docs/DEVELOPMENT_SETUP.md](DEVELOPMENT_SETUP.md) - Setup instructions
