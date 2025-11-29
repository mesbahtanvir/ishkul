# Dynamic Environment Variable Synchronization

## Overview

The `update-backend-env.sh` script has been refactored to **dynamically sync environment
variables** from `backend/.env` to Cloud Run, eliminating the need to hardcode variable
names.

## What Changed

### Before ❌
- Script had hardcoded variable names in multiple places
- Adding new variables required editing the script
- Validation logic was static
- Difficult to maintain as requirements evolved

### After ✅
- Script reads ALL variables from `backend/.env` automatically
- Add new variables without touching the script
- Automatic detection and categorization of variables
- Extensible without code changes

## How to Use

### Adding a New Environment Variable

1. **Edit `backend/.env`**:
   ```bash
   # Add your new variable
   NEW_API_KEY=your-api-key-value
   ```

2. **Run the sync script**:
   ```bash
   ./scripts/update-backend-env.sh
   ```

3. **Done!** The variable is now in Cloud Run

### Adding a Secret Variable

Variables are automatically categorized:
- **`JWT_SECRET`** → Stored in Google Secret Manager
- **Variables starting with `_`** → Stored in Google Secret Manager
- **All others** → Applied as regular environment variables

Example:
```bash
# This will go to Secret Manager
_DATABASE_PASSWORD=super-secret-password

# This will be a regular env var
DATABASE_HOST=db.example.com
```

## Script Behavior

### Dynamic Variable Detection

The script now:

1. **Reads** all variables from `backend/.env`
2. **Categorizes** them:
   - Secrets: `JWT_SECRET` or `_*` pattern
   - Regular: Everything else
3. **Validates** placeholder values (warns if `your-*` pattern found)
4. **Applies** to Cloud Run in one go

### Production Mode

```bash
# Development mode (default)
./scripts/update-backend-env.sh

# Production mode (additional safety checks)
./scripts/update-backend-env.sh prod
./scripts/update-backend-env.sh production
```

Production mode:
- Overrides `ENVIRONMENT=production`
- Checks for localhost in `ALLOWED_ORIGINS`
- Requires confirmation before proceeding

## Example Workflow

### Initial Setup
```bash
# 1. Copy the example file
cd backend
cp .env.example .env

# 2. Edit with your values
nano .env
# Update: FIREBASE_DATABASE_URL, GOOGLE_WEB_CLIENT_ID, etc.

# 3. Sync to Cloud Run
cd ..
./scripts/update-backend-env.sh
```

### Adding a New API Integration
```bash
# 1. Add variable to backend/.env
echo "STRIPE_API_KEY=sk_live_..." >> backend/.env

# 2. Sync immediately
./scripts/update-backend-env.sh

# 3. Variable is now available in Cloud Run
```

### Managing Secrets
```bash
# backend/.env
JWT_SECRET=my-jwt-secret
_STRIPE_WEBHOOK_SECRET=whsec_...
_DATABASE_PASSWORD=secure-password

# Run sync
./scripts/update-backend-env.sh

# Result:
# ✓ JWT_SECRET = *** (Secret Manager)
# ✓ _STRIPE_WEBHOOK_SECRET = *** (Secret Manager)
# ✓ _DATABASE_PASSWORD = *** (Secret Manager)
# ✓ All regular variables applied as env vars
```

## Technical Details

### Variable Processing
1. Reads `.env` line by line into temporary files
2. Skips comments (`#`) and empty lines
3. Removes leading/trailing whitespace
4. Strips quotes (`"` or `'`)
5. Stores variables in temporary files for processing

### Categorization Logic
```bash
if [[ "$key" == "JWT_SECRET" ]] || [[ "$key" =~ ^_ ]]; then
    # Secret variable (→ Secret Manager)
else
    # Regular variable (→ Environment variable)
fi
```

### Special Handling
- **JWT_SECRET**: Always goes to Google Secret Manager
- **Underscore prefix** (`_VAR_NAME`): Marks as secret
- **Placeholder detection**: Warns about `your-*` patterns
- **Empty values**: Skipped in Cloud Run update
- **Reserved variables**: `PORT` and `GOOGLE_APPLICATION_CREDENTIALS` are excluded (Cloud Run managed)

### Bash Compatibility
- Uses bash 3.2+ compatible syntax (works on macOS)
- Temporary files used instead of associative arrays (for compatibility)
- Self-cleaning: removes temp files after execution

## Files Modified

1. **`scripts/update-backend-env.sh`**
   - Removed hardcoded variable lists
   - Added dynamic reading from `.env`
   - Implemented auto-categorization
   - Updated summary output

2. **`backend/.env.example`**
   - Added documentation for new variables
   - Explained secret handling convention
   - Removed outdated assumptions

## Benefits

✅ **Scalability** - Add variables without code changes
✅ **Maintainability** - One source of truth (`.env` file)
✅ **Safety** - Automatic secret detection
✅ **Flexibility** - Underscore convention for custom secrets
✅ **Transparency** - All variables visible in summary

## Troubleshooting

### Variable Not Applied
```bash
# Check if .env is being read
cat backend/.env

# Run in debug mode (add -x flag)
bash -x ./scripts/update-backend-env.sh 2>&1 | grep "VAR_NAME"
```

### Secret Not in Secret Manager
```bash
# List all secrets
gcloud secrets list --project=ishkul-org

# View specific secret
gcloud secrets versions list JWT_SECRET --project=ishkul-org
```

### Sync Failed
```bash
# Check Cloud Run service exists
gcloud run services describe ishkul-backend --region=europe-west1

# Check gcloud authentication
gcloud auth list
```

## Migration from Old Script

If you were using the previous hardcoded script:

1. The new script is backward compatible
2. All existing variables still work
3. Just run: `./scripts/update-backend-env.sh`
4. New variables can be added immediately

No action needed - the old hardcoded checks were removed automatically.

## Next Steps

### Planned Enhancements
- [ ] Support for `.env.local` overrides
- [ ] Automatic `.env` file creation from backend code annotations
- [ ] Environment-specific `.env.production`, `.env.staging`
- [ ] GitHub Actions integration for auto-sync on PR merge

### Related Commands
```bash
# View current Cloud Run env vars
gcloud run services describe ishkul-backend \
  --region=europe-west1 \
  --format='value(spec.template.spec.containers[0].env)'

# View secrets in Secret Manager
gcloud secrets list --project=ishkul-org

# Update manually (if needed)
gcloud run services update ishkul-backend \
  --region=europe-west1 \
  --set-env-vars="KEY=value"
```

---

**Last Updated**: 2025-11-29
**Script Version**: 2.0.0 (Dynamic)
**Status**: Production Ready ✅
