# Infrastructure Guide

This guide covers Cloud Run deployment, monitoring, scaling, and infrastructure management.

## Cloud Run Service

### Current Service Status

- **Service Name**: `ishkul-backend`
- **Region**: `europe-west1`
- **URL**: `https://ishkul-backend-863006625304.europe-west1.run.app`
- **Status**: Active ✅

### View Service Details

```bash
gcloud run services describe ishkul-backend \
  --region=europe-west1 \
  --project=ishkul-org
```

## Environment Variables on Cloud Run

### Managing Environment Variables

Update all variables from `backend/.env`:

```bash
./scripts/update-backend-env.sh
```

Update specific variable:

```bash
gcloud run services update ishkul-backend \
  --region=europe-west1 \
  --project=ishkul-org \
  --set-env-vars="KEY=value"
```

Update multiple variables:

```bash
gcloud run services update ishkul-backend \
  --region=europe-west1 \
  --project=ishkul-org \
  --set-env-vars="KEY1=value1,KEY2=value2,KEY3=value3"
```

### View Current Environment Variables

```bash
gcloud run services describe ishkul-backend \
  --region=europe-west1 \
  --format='value(spec.template.spec.containers[0].env[].name)'
```

### Secrets Management

Secrets are stored in Google Secret Manager (not as env vars).

View JWT secret:

```bash
gcloud secrets versions list jwt-secret \
  --project=ishkul-org
```

Update JWT secret:

```bash
echo -n "new-secret-value" | gcloud secrets versions add jwt-secret \
  --data-file=- \
  --project=ishkul-org
```

## Scaling Configuration

### Auto-Scaling Settings

View current scaling:

```bash
gcloud run services describe ishkul-backend \
  --region=europe-west1 \
  --format='value(spec.template.spec.containerConcurrency, spec.template.metadata.annotations.autoscaling)'
```

### Set Min/Max Instances

```bash
gcloud run services update ishkul-backend \
  --region=europe-west1 \
  --min-instances=0 \
  --max-instances=100 \
  --project=ishkul-org
```

### Memory and CPU Configuration

View current:

```bash
gcloud run services describe ishkul-backend \
  --region=europe-west1 \
  --format='value(spec.template.spec.containers[0].resources)'
```

Update CPU and memory:

```bash
gcloud run services update ishkul-backend \
  --region=europe-west1 \
  --cpu=2 \
  --memory=512Mi \
  --project=ishkul-org
```

## Monitoring and Logging

### View Logs

Real-time logs:

```bash
gcloud run services logs read ishkul-backend \
  --region=europe-west1 \
  --follow
```

Last 100 logs:

```bash
gcloud run services logs read ishkul-backend \
  --region=europe-west1 \
  --limit=100
```

Filter by severity:

```bash
gcloud run services logs read ishkul-backend \
  --region=europe-west1 \
  --filter="severity=ERROR"
```

### Metrics Dashboard

View in Cloud Console:

```
https://console.cloud.google.com/run/detail/europe-west1/ishkul-backend/metrics
```

Key metrics:
- **Request count** - Total requests per minute
- **Request latencies** - p50, p95, p99 response times
- **Error rates** - 4xx and 5xx error percentages
- **Container utilization** - CPU and memory usage

### Setting Up Alerts

Create alert for high error rate:

```bash
gcloud alpha monitoring policies create \
  --notification-channels=YOUR_CHANNEL_ID \
  --display-name="High Error Rate - ishkul-backend" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-filter='resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_count" AND labels.response_code_class="5xx"' \
  --condition-threshold-duration=300s \
  --condition-threshold-value=0.05
```

## Health Checks

### Health Endpoint

Cloud Run automatically health checks the service. Ensure your backend responds:

```bash
curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  https://ishkul-backend-863006625304.europe-west1.run.app/health
```

Expected response:

```json
{"status":"ok"}
```

### Configure Health Check

```bash
gcloud run services update ishkul-backend \
  --region=europe-west1 \
  --timeout=300 \
  --project=ishkul-org
```

## Deployment History

### View Recent Revisions

```bash
gcloud run revisions list \
  --service=ishkul-backend \
  --region=europe-west1 \
  --project=ishkul-org
```

### View Specific Revision Details

```bash
gcloud run revisions describe ishkul-backend-REVISION_ID \
  --region=europe-west1 \
  --project=ishkul-org
```

### Traffic Routing (Blue-Green Deployments)

Route 10% to new revision, 90% to current:

```bash
gcloud run services update-traffic ishkul-backend \
  --to-revisions=LATEST=10 \
  --region=europe-west1 \
  --project=ishkul-org
```

Route 100% to specific revision:

```bash
gcloud run services update-traffic ishkul-backend \
  --to-revisions=ishkul-backend-REVISION_ID=100 \
  --region=europe-west1 \
  --project=ishkul-org
```

## Deployment Process

### Manual Deployment

Deploy from current directory:

```bash
cd backend
gcloud run deploy ishkul-backend \
  --source=. \
  --region=europe-west1 \
  --project=ishkul-org \
  --allow-unauthenticated
```

### Automated Deployment (GitHub Actions)

Triggered automatically on:
- Push to `main` branch
- Changes in `backend/` directory

View deployment status:

```
https://console.cloud.google.com/cloud-build/builds?project=ishkul-org
```

## Database: Cloud Firestore

### View Collections

```bash
gcloud firestore collections list \
  --project=ishkul-org
```

### Backup Firestore

Create backup:

```bash
gcloud firestore databases backup create \
  --project=ishkul-org \
  --location=eu \
  --retention-days=30
```

View backups:

```bash
gcloud firestore databases backups list \
  --project=ishkul-org
```

## Storage: Firebase Storage

### Manage Uploads

View storage:

```bash
gsutil ls gs://ishkul-org.appspot.com/
```

Delete old files:

```bash
gsutil rm gs://ishkul-org.appspot.com/old-file.txt
```

## IAM and Permissions

### Service Account Management

List service accounts:

```bash
gcloud iam service-accounts list \
  --project=ishkul-org
```

Grant Cloud Run permissions:

```bash
gcloud iam service-accounts add-iam-policy-binding \
  sa-name@ishkul-org.iam.gserviceaccount.com \
  --role=roles/run.developer \
  --member=user:email@example.com \
  --project=ishkul-org
```

## Cost Optimization

### Tips for Reducing Costs

1. **Set min-instances to 0** for development
   ```bash
   gcloud run services update ishkul-backend \
     --min-instances=0 \
     --region=europe-west1
   ```

2. **Use lower memory** for non-production services (512Mi or less)

3. **Delete unused revisions** older than 30 days

4. **Monitor request patterns** to identify optimization opportunities

### Cost Estimation

Cloud Run pricing:
- **Compute**: $0.00000625 per vCPU-second
- **Memory**: $0.0000000625 per GB-second
- **Requests**: $0.40 per million requests
- **Network egress**: $0.12 per GB

Estimate monthly cost:
```
1M requests/month × $0.40 + 100GB compute × $0.00150625 = ~$540/month
```

## Disaster Recovery

### Backup Strategy

1. **Firestore**: Automated daily backups (30-day retention)
2. **Service Account Keys**: Store securely, rotate quarterly
3. **Environment Variables**: Document in `.env.example`

### Restore Procedure

Restore from Firestore backup:

```bash
gcloud firestore databases restore \
  --backup=projects/ishkul-org/locations/eu/backups/BACKUP_ID \
  --project=ishkul-org
```

Redeploy service:

```bash
cd backend && gcloud run deploy ishkul-backend \
  --source=. \
  --region=europe-west1 \
  --project=ishkul-org
```

## Troubleshooting Infrastructure

### Service Won't Start

1. Check logs: `gcloud run services logs read ishkul-backend`
2. Verify environment variables are set
3. Check service account permissions
4. Ensure PORT is 8080

### High Latency

1. Check CPU/memory allocation
2. Review Firestore query performance
3. Check network egress costs
4. Consider caching strategy

### High Cost

1. Review request patterns
2. Reduce min-instances
3. Optimize database queries
4. Use Cloud CDN for static content

## Related Documentation

- [DEVELOPMENT_SETUP.md](DEVELOPMENT_SETUP.md) - Local environment setup
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Full deployment process
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues and fixes
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [GCP Console](https://console.cloud.google.com)
