# Backend Deployment Environments

This guide explains how the different deployment environments work for the Ishkul backend.

## Overview

The backend has three deployment environments:

| Environment | Trigger | Service Name | Data Prefix | Stripe |
|-------------|---------|--------------|-------------|--------|
| **Preview** | PR opened/updated | `ishkul-backend-pr-{N}` | `pr_{N}_` | Disabled |
| **Staging** | Push to main | `ishkul-backend-staging` | `staging_` | Test Mode |
| **Production** | Release tag `v*` | `ishkul-backend` | (none) | Live Mode |

## Deployment Flow

```
Feature Branch → PR → Preview (isolated per PR)
                 ↓
              Merge
                 ↓
            Main Branch → Staging (shared staging env)
                 ↓
           Create Release
           git tag v1.0.0
                 ↓
            Production
```

## Reusable Architecture

All three environments use the same reusable workflow (`deploy-backend-reusable.yml`), ensuring:
- **Identical deployment process** across environments
- **Consistent configuration** with different parameters
- **Single source of truth** for deployment logic

### Workflow Files

| File | Purpose |
|------|---------|
| `deploy-backend-reusable.yml` | Core deployment logic (called by all) |
| `deploy-backend-preview.yml` | PR trigger + PR commenting |
| `deploy-backend-staging.yml` | Main branch trigger |
| `deploy-backend.yml` | Release tag trigger |

## Stripe Integration

### How Stripe Mode Works

Stripe uses separate API key pairs for test and live modes:

| Environment | Stripe Mode | Keys Used | Card Testing |
|-------------|-------------|-----------|--------------|
| Preview | **Disabled** | None | N/A |
| Staging | **Test** | `STRIPE_TEST_*` secrets | Use [test cards](https://stripe.com/docs/testing#cards) |
| Production | **Live** | `STRIPE_*` secrets | Real cards only |

### Required GitHub Secrets for Stripe

```
# Test mode (staging)
STRIPE_TEST_SECRET_KEY        # sk_test_...
STRIPE_TEST_WEBHOOK_SECRET    # whsec_test_...
STRIPE_TEST_PRO_PRICE_ID      # price_test_...

# Live mode (production)
STRIPE_SECRET_KEY             # sk_live_...
STRIPE_WEBHOOK_SECRET         # whsec_live_...
STRIPE_PRO_PRICE_ID           # price_live_...
```

### Stripe Test Cards

In staging, use these test card numbers:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

Any future date and any 3-digit CVC will work.

### Webhook Configuration

Each environment needs its own Stripe webhook:

| Environment | Webhook URL |
|-------------|-------------|
| Staging | `https://ishkul-backend-staging-{project}.{region}.run.app/api/stripe/webhook` |
| Production | `https://ishkul-backend-{project}.{region}.run.app/api/stripe/webhook` |

Configure in [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks).

## Data Isolation

Preview and staging environments use **Firestore collection prefixes** to isolate data from production:

| Environment | Collection Prefix | Example Collection |
|-------------|-------------------|-------------------|
| Production | (none) | `users` |
| Staging | `staging_` | `staging_users` |
| Preview PR-123 | `pr_123_` | `pr_123_users` |

This means:
- Preview data never mixes with production data
- Each PR has its own isolated data
- Staging can be used for QA without affecting production
- No risk of data corruption

## Resource Allocation

| Environment | Min Instances | Max Instances | Memory | CPU |
|-------------|---------------|---------------|--------|-----|
| Preview | 0 | 2 | 512Mi | 1 |
| Staging | 0 | 10 | 512Mi | 1 |
| Production | 1 | 100 | 1Gi | 2 |

### Why Different Resources?

- **Preview**: Scales to zero to minimize costs; limited concurrency
- **Staging**: Scales to zero but allows more testing load
- **Production**: Always-on for lowest latency; high resources for production traffic

## Automatic Cleanup

When a PR is closed (merged or abandoned):
1. The Cloud Run service is deleted
2. All Firestore data with the PR's prefix is deleted
3. Docker images for the PR are removed
4. A confirmation comment is posted

This ensures **no residual costs** from preview environments.

### Orphaned Resource Cleanup

A scheduled job runs daily to clean up orphaned resources:
- Deletes preview services for closed PRs
- Removes orphaned Docker images
- Handles cases where cleanup workflow failed

## Concurrency Behavior

| Environment | Behavior |
|-------------|----------|
| Preview | New commits cancel in-progress deployments for the same PR |
| Staging | New pushes cancel in-progress staging deployments |
| Production | No auto-cancellation (release deploys run to completion) |

## Testing Your Deployments

### Health Check
```bash
# Preview
curl https://ishkul-backend-pr-123-xxxxx.run.app/health

# Staging
curl https://ishkul-backend-staging-xxxxx.run.app/health

# Production
curl https://ishkul-backend-xxxxx.run.app/health
```

### API Endpoints
```bash
# Replace with your URL from deployment summary
BASE_URL="https://ishkul-backend-staging-xxxxx.run.app"

# Test an endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" $BASE_URL/api/me
```

### Stripe Testing (Staging Only)
```bash
# Test checkout session creation
curl -X POST "$BASE_URL/api/stripe/create-checkout-session" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"priceId": "price_test_xxx"}'
```

## Environment Variables

All environments receive these variables (values vary):

| Variable | Purpose |
|----------|---------|
| `ENVIRONMENT` | `preview`, `staging`, or `production` |
| `FIRESTORE_COLLECTION_PREFIX` | Data isolation prefix |
| `STRIPE_SECRET_KEY` | Stripe API key (mode-appropriate) |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification |
| `STRIPE_PRO_PRICE_ID` | Pro subscription price |
| `ALLOWED_ORIGINS` | CORS configuration |

## Troubleshooting

### Deployment Failed

1. Check GitHub Actions logs
2. Verify GCP credentials (`GCP_SA_KEY` secret)
3. Ensure service account has Cloud Run deploy permissions

### Preview Not Accessible

1. Check if deployment completed successfully
2. Verify the URL in the PR comment
3. Allow 30-60 seconds for cold start if service was idle

### Stripe Not Working in Staging

1. Verify `STRIPE_TEST_*` secrets are configured
2. Check webhook is registered for staging URL
3. Use test card numbers (not real cards)

### Data Not Showing Up

Remember that each environment uses different collections:
- In Firebase Console, look for `staging_users` not `users` for staging
- Look for `pr_X_users` for preview environments

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

## Security Considerations

1. **Stripe Mode Separation**: Test keys never see real money, live keys never in non-production
2. **Data Isolation**: Collection prefixes prevent cross-environment data access
3. **Same Auth**: Uses same Google OAuth clients (test with existing users)
4. **Public URLs**: All environment URLs are publicly accessible (same as production)

## Related Documentation

- [INFRASTRUCTURE.md](INFRASTRUCTURE.md) - Cloud Run management
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Full deployment process
- [../backend/.env.example](../backend/.env.example) - Environment variables
