# Preview Deployments

This guide explains how preview deployments work for the Ishkul backend.

## Overview

When you create a Pull Request that modifies backend code, a preview environment is automatically deployed to Google Cloud Run. This allows you to test your changes in an isolated environment before merging.

## How It Works

### Automatic Deployment

When a PR is opened or updated with changes in:
- `backend/**`
- `prompts/**`
- `cloudbuild.yaml`
- `.dockerignore`

A GitHub Actions workflow automatically:
1. Builds a Docker image tagged with the PR number
2. Deploys a new Cloud Run service named `ishkul-backend-pr-{number}`
3. Comments on the PR with the preview URL

### Data Isolation

Preview environments use **Firestore collection prefixes** to isolate data from production:

| Environment | Collection Prefix | Example Collection |
|-------------|-------------------|-------------------|
| Production | (none) | `users` |
| Preview PR-123 | `pr_123_` | `pr_123_users` |

This means:
- Preview data never mixes with production data
- Each PR has its own isolated data
- No risk of data corruption

### Automatic Cleanup

When a PR is closed (merged or abandoned):
1. The Cloud Run service is deleted
2. All Firestore data with the PR's prefix is deleted
3. Docker images for the PR are removed
4. A confirmation comment is posted

This ensures **no residual costs** from preview environments.

## Preview Environment Details

| Resource | Configuration |
|----------|---------------|
| Min Instances | 0 (scales to zero) |
| Max Instances | 2 |
| Memory | 512Mi |
| CPU | 1 |
| Timeout | 300s |

### What's Enabled
- ✅ Firebase Auth
- ✅ Firestore (with prefix isolation)
- ✅ OpenAI API
- ✅ CORS for Vercel preview URLs

### What's Disabled
- ❌ Stripe payments (to prevent accidental charges)
- ❌ Production webhooks

## Testing Your Preview

### Health Check
```bash
curl https://ishkul-backend-pr-123-xxxxx.run.app/health
```

### API Endpoints
```bash
# Replace with your preview URL from the PR comment
PREVIEW_URL="https://ishkul-backend-pr-123-xxxxx.run.app"

# Test an endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" $PREVIEW_URL/api/me
```

### Connecting Frontend Preview

Vercel preview deployments can connect to your backend preview by:
1. Finding the backend preview URL in the PR comment
2. Setting the API base URL in the frontend preview settings

## Cost Optimization

Preview environments are configured to minimize costs:

1. **Scale to Zero**: Min instances = 0, so idle previews cost nothing
2. **Lower Resources**: 512Mi memory vs production's higher allocation
3. **Limited Max Instances**: Max 2 instances vs production
4. **Automatic Cleanup**: Deleted when PR is closed

### Estimated Preview Cost

For a typical PR that's open for 1-2 days with occasional testing:
- ~$0.01-0.05 per PR (mostly from Firestore operations and occasional cold starts)

## Troubleshooting

### Preview Deployment Failed

1. Check the GitHub Actions logs
2. Verify GCP credentials are configured (`GCP_SA_KEY` secret)
3. Ensure the service account has Cloud Run deploy permissions

### Preview Not Accessible

1. Check if the deployment completed successfully
2. Verify the URL in the PR comment
3. Allow 30-60 seconds for cold start if service was idle

### Data Not Showing Up

Remember that preview uses prefixed collections. If you're:
- Looking in Firebase Console, look for `pr_X_users` instead of `users`
- Using direct Firestore queries, the prefix is automatically applied by the backend

### Cleanup Didn't Run

If the cleanup workflow didn't trigger:
1. Check if the PR touched backend files
2. Manually trigger cleanup or delete resources:
   ```bash
   # Delete service
   gcloud run services delete ishkul-backend-pr-X --region=northamerica-northeast2

   # View preview images
   gcloud artifacts docker images list \
     northamerica-northeast2-docker.pkg.dev/PROJECT_ID/cloud-run-source-deploy/ishkul-backend \
     --filter="tags:pr-X-*"
   ```

## Environment Variables

Preview deployments receive these environment variables:

| Variable | Value | Purpose |
|----------|-------|---------|
| `ENVIRONMENT` | `preview` | Identifies preview env |
| `FIRESTORE_COLLECTION_PREFIX` | `pr_X_` | Data isolation |
| `ALLOWED_ORIGINS` | Includes Vercel patterns | CORS configuration |

## Security Considerations

1. **Stripe Disabled**: No payment processing in preview
2. **Same Auth**: Uses same Google OAuth clients (testing existing users)
3. **Isolated Data**: Can't accidentally modify production data
4. **Public URL**: Preview URLs are publicly accessible (same as production)

## Related Documentation

- [INFRASTRUCTURE.md](INFRASTRUCTURE.md) - Cloud Run management
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Full deployment process
- [../backend/.env.example](../backend/.env.example) - Environment variables
