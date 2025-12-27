# Grafana Cloud Setup Guide

This guide walks you through integrating Ishkul backend with Grafana Cloud for metrics visualization and monitoring.

## Overview

We've implemented a Prometheus-compatible metrics endpoint at `/metrics/prometheus` that exposes:
- **Queue metrics**: task counts, worker activity, processing durations
- **LLM metrics**: call latency, token usage, success/error rates
- **Generation metrics**: outline/skeleton/content generation counts

**Cost**: $0 (Grafana Cloud free tier)
**Setup time**: ~30 minutes
**Maintenance**: Zero (fully managed)

## Quick Test First

Before setting up Grafana, verify the metrics endpoint is working:

```bash
# Test staging backend metrics endpoint
curl https://ishkul-backend-staging-930454644160.northamerica-northeast2.run.app/metrics/prometheus
```

You should see Prometheus-formatted metrics. If you get a 404 or error, make sure the latest code is deployed to staging.

**✅ Seeing metrics?** Continue with Grafana Cloud setup below.
**❌ Not working?** Deploy to staging first: `git push origin main`

## Step 1: Sign Up for Grafana Cloud (5 minutes)

1. Go to [grafana.com/products/cloud](https://grafana.com/products/cloud/)
2. Click "Start for free"
3. Sign up with GitHub account (recommended) or email
4. Choose **Free Forever** plan:
   - 10,000 series (metrics)
   - 50 GB logs
   - 50 GB traces
   - 14-day retention

5. Select a **Stack Name** (e.g., `ishkul-monitoring`)
6. Choose **Region**: `us-east-1` (closest to Toronto Cloud Run)
7. Click "Create Stack"

**Result**: You'll get a Grafana Cloud dashboard URL like `https://ishkul-monitoring.grafana.net`

## Step 2: Configure Prometheus Data Source (10 minutes)

### 2.1 Get Your Staging URL

**Staging Backend**: `https://ishkul-backend-staging-930454644160.northamerica-northeast2.run.app`

This is the URL we'll configure Grafana Cloud to scrape metrics from.

### 2.2 Get Grafana Cloud Credentials

1. In Grafana Cloud dashboard, go to **Connections** → **Add new connection**
2. Search for "Prometheus" and select **Hosted Prometheus**
3. Copy these values (you'll need them later):
   - **Remote Write Endpoint**: `https://prometheus-prod-XX-prod-us-east-X.grafana.net/api/prom/push`
   - **Username / Instance ID**: `123456`
   - **Password / API Key**: Click "Generate now" → Copy the key

### 2.3 Configure Grafana Agent on Cloud Run

We'll use **Grafana Cloud Agent** to scrape metrics from Cloud Run. Since Cloud Run is serverless, we need to configure **remote scraping** using the agent.

**Option A: Grafana Cloud Agent with Remote Scraping (Recommended)**

1. In Grafana Cloud, go to **Integrations** → **Infrastructure**
2. Select **Grafana Cloud Agent**
3. Choose **Linux** → Copy the installation command
4. We'll adapt this for Cloud Run by adding a sidecar container

**Recommended: Direct scraping via Grafana Cloud synthetic monitoring**:

1. In Grafana Cloud dashboard, go to **Synthetic Monitoring** → **Checks**
2. Click "Add new check" → **HTTP**
3. Configure:
   - **Job name**: `ishkul-backend-metrics-staging`
   - **Target**: `https://ishkul-backend-staging-930454644160.northamerica-northeast2.run.app/metrics/prometheus`
   - **Frequency**: 60s
   - **Timeout**: 10s
   - **Probes**: Select "US East (N. Virginia)" (closest to Toronto)
4. Click "Add check"

This will scrape your metrics every 60 seconds and make them available in Grafana.

**For Production**: Repeat the same steps with production URL when ready:
- Job name: `ishkul-backend-metrics-production`
- Target: `https://ishkul-backend-XXXXX.run.app/metrics/prometheus` (production URL)

**Option B: Push Metrics via Prometheus Remote Write (Advanced)**

If you want real-time metrics (not 60s delay), you can push metrics directly:

1. Add this environment variable to Cloud Run:
   ```bash
   PROMETHEUS_REMOTE_WRITE_URL=https://prometheus-prod-XX-prod-us-east-X.grafana.net/api/prom/push
   PROMETHEUS_REMOTE_WRITE_USERNAME=123456
   PROMETHEUS_REMOTE_WRITE_PASSWORD=your-api-key
   ```

2. We'll need to implement a background goroutine that periodically pushes metrics. (This is optional for later)

## Step 3: Verify Metrics are Flowing (5 minutes)

1. In Grafana Cloud, go to **Explore**
2. Select **Prometheus** data source (top left dropdown)
3. In the query builder, try:
   ```promql
   ishkul_queue_tasks_enqueued
   ```
4. Click "Run query"
5. You should see data points (might take 1-2 minutes for first scrape)

**Troubleshooting**:
- No data? Check Cloud Run logs: `gcloud run services logs read ishkul-backend-staging --limit=50`
- 404 error? Verify endpoint is accessible:
  ```bash
  curl https://ishkul-backend-staging-930454644160.northamerica-northeast2.run.app/metrics/prometheus
  ```
- Auth error? Cloud Run is public, so no auth needed for metrics endpoint

## Step 4: Create Dashboards (10 minutes)

### 4.1 Import Pre-built Go Application Dashboard

1. In Grafana, click **+** → **Import dashboard**
2. Use dashboard ID: **6671** (Go Processes)
3. Select your Prometheus data source
4. Click "Import"

This gives you basic metrics, but let's create custom panels for Ishkul-specific metrics.

### 4.2 Create Ishkul Queue Dashboard

1. Click **+** → **New Dashboard** → **Add visualization**
2. Select **Prometheus** data source
3. Create these panels:

#### Panel 1: Queue Task Throughput
- **Title**: "Queue Tasks Over Time"
- **Panel type**: Time series
- **Query**:
  ```promql
  rate(ishkul_queue_tasks_enqueued[5m])
  ```
- **Legend**: "Tasks Enqueued/sec"
- Add another query:
  ```promql
  rate(ishkul_queue_tasks_completed[5m])
  ```
- **Legend**: "Tasks Completed/sec"

#### Panel 2: Queue Pending Tasks
- **Title**: "Pending Tasks in Queue"
- **Panel type**: Stat
- **Query**:
  ```promql
  ishkul_queue_tasks_pending
  ```
- **Thresholds**:
  - Green: 0-5
  - Yellow: 5-20
  - Red: 20+

#### Panel 3: LLM Latency Percentiles
- **Title**: "LLM Response Time (P50, P90, P99)"
- **Panel type**: Time series
- **Queries**:
  ```promql
  ishkul_llm_latency_ms{quantile="0.5"}
  ```
  Legend: "P50"

  ```promql
  ishkul_llm_latency_ms{quantile="0.9"}
  ```
  Legend: "P90"

  ```promql
  ishkul_llm_latency_ms{quantile="0.99"}
  ```
  Legend: "P99"

#### Panel 4: LLM Token Usage
- **Title**: "LLM Token Consumption"
- **Panel type**: Time series (stacked)
- **Queries**:
  ```promql
  rate(ishkul_llm_tokens_input[5m])
  ```
  Legend: "Input Tokens/sec"

  ```promql
  rate(ishkul_llm_tokens_output[5m])
  ```
  Legend: "Output Tokens/sec"

#### Panel 5: Queue Success Rate
- **Title**: "Task Success Rate"
- **Panel type**: Gauge
- **Query**:
  ```promql
  (
    rate(ishkul_queue_tasks_completed[5m])
    /
    (rate(ishkul_queue_tasks_completed[5m]) + rate(ishkul_queue_tasks_failed[5m]))
  ) * 100
  ```
- **Unit**: Percent (0-100)
- **Thresholds**:
  - Red: 0-80
  - Yellow: 80-95
  - Green: 95-100

#### Panel 6: Active Workers
- **Title**: "Active Queue Workers"
- **Panel type**: Stat
- **Query**:
  ```promql
  ishkul_queue_workers_active
  ```

4. Click **Save dashboard** → Name it "Ishkul Backend Metrics"

### 4.3 Set Up Alerts (Optional)

1. In any panel, click **Panel title** → **Edit**
2. Go to **Alert** tab → **Create alert rule**
3. Example alert for high queue depth:
   - **Condition**: `ishkul_queue_tasks_pending > 50`
   - **For**: 5 minutes
   - **Contact point**: Add email or Slack webhook

## Step 5: Advanced Queries

### Calculate Average LLM Latency (Last 1 Hour)
```promql
avg_over_time(ishkul_llm_latency_ms_avg[1h])
```

### Token Usage by Model (if we add model labels later)
```promql
sum by (model) (rate(ishkul_llm_tokens_input[5m]))
```

### Queue Processing Time (Average)
```promql
ishkul_queue_task_duration_ms_avg
```

### Error Rate
```promql
rate(ishkul_llm_calls_error[5m]) / rate(ishkul_llm_calls_total[5m]) * 100
```

### Tasks Stuck in Queue (waiting > 5 minutes)
```promql
ishkul_queue_tasks_pending > 0 and changes(ishkul_queue_tasks_pending[5m]) == 0
```

## Metrics Reference

All metrics are prefixed with `ishkul_` and use underscores instead of dots (Prometheus convention).

### Queue Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `ishkul_queue_tasks_enqueued` | Counter | Total tasks added to queue |
| `ishkul_queue_tasks_claimed` | Counter | Tasks claimed by workers |
| `ishkul_queue_tasks_completed` | Counter | Successfully processed tasks |
| `ishkul_queue_tasks_failed` | Counter | Failed tasks |
| `ishkul_queue_tasks_recovered` | Counter | Recovered after failure |
| `ishkul_queue_tasks_token_limit` | Counter | Tasks blocked by token limit |
| `ishkul_queue_workers_active` | Gauge | Current active workers |
| `ishkul_queue_tasks_pending` | Gauge | Tasks waiting in queue |
| `ishkul_queue_task_duration_ms` | Histogram | End-to-end task processing time |
| `ishkul_queue_claim_duration_ms` | Histogram | Time to claim a task from queue |
| `ishkul_queue_firestore_latency_ms` | Histogram | Firestore operation latency |

### LLM Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `ishkul_llm_calls_total` | Counter | Total LLM API calls |
| `ishkul_llm_calls_success` | Counter | Successful LLM calls |
| `ishkul_llm_calls_error` | Counter | Failed LLM calls |
| `ishkul_llm_tokens_input` | Counter | Input tokens consumed |
| `ishkul_llm_tokens_output` | Counter | Output tokens generated |
| `ishkul_llm_latency_ms` | Histogram | LLM response time |

### Generation Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `ishkul_generation_outline_total` | Counter | Outline generation attempts |
| `ishkul_generation_outline_success` | Counter | Successful outline generations |
| `ishkul_generation_skeleton_total` | Counter | Skeleton generation attempts |
| `ishkul_generation_skeleton_success` | Counter | Successful skeleton generations |
| `ishkul_generation_content_total` | Counter | Content generation attempts |
| `ishkul_generation_content_success` | Counter | Successful content generations |

### System Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `ishkul_uptime_seconds` | Gauge | Application uptime in seconds |

### Histogram Suffixes

For all histogram metrics, Prometheus provides:
- `_sum`: Total sum of observations
- `_count`: Number of observations
- `_min`: Minimum observed value
- `_max`: Maximum observed value
- `_avg`: Average observed value
- `{quantile="0.5"}`: Median (P50)
- `{quantile="0.9"}`: 90th percentile
- `{quantile="0.99"}`: 99th percentile

Example:
```promql
ishkul_llm_latency_ms{quantile="0.99"}  # P99 latency
ishkul_llm_latency_ms_avg                # Average latency
ishkul_llm_latency_ms_count              # Total calls
```

## Monitoring Best Practices

### 1. Use Rate Functions for Counters
Counters are cumulative, so use `rate()` to see per-second rates:
```promql
rate(ishkul_llm_calls_total[5m])  # LLM calls per second
```

### 2. Use `increase()` for Total Over Time
```promql
increase(ishkul_queue_tasks_completed[1h])  # Tasks in last hour
```

### 3. Calculate Success Rates
```promql
rate(ishkul_llm_calls_success[5m]) / rate(ishkul_llm_calls_total[5m]) * 100
```

### 4. Set Meaningful Time Ranges
- Real-time monitoring: `[1m]` or `[5m]`
- Trends: `[1h]` or `[24h]`
- Historical analysis: `[7d]`

### 5. Use Variables for Reusable Dashboards
In dashboard settings → Variables → Add variable:
- **Name**: `time_range`
- **Type**: Interval
- **Values**: `1m,5m,15m,1h,6h,24h`

Then use in queries: `rate(ishkul_queue_tasks_enqueued[$time_range])`

## Testing the Integration

### 1. Generate Some Load
Trigger course generation from the frontend to generate metrics.

### 2. Check Prometheus Endpoint
```bash
curl https://ishkul-backend-staging-930454644160.northamerica-northeast2.run.app/metrics/prometheus
```

You should see output like:
```
# Ishkul Backend Metrics
# Timestamp: 2025-12-26T10:30:00Z
# Uptime: 2h15m30s

# HELP ishkul_uptime_seconds Application uptime in seconds
# TYPE ishkul_uptime_seconds gauge
ishkul_uptime_seconds 8130.000000

# HELP ishkul_queue_tasks_enqueued Counter metric
# TYPE ishkul_queue_tasks_enqueued counter
ishkul_queue_tasks_enqueued 42

# HELP ishkul_llm_latency_ms Histogram metric
# TYPE ishkul_llm_latency_ms histogram
ishkul_llm_latency_ms_sum 125000
ishkul_llm_latency_ms_count 50
ishkul_llm_latency_ms_min 1200
ishkul_llm_latency_ms_max 5400
ishkul_llm_latency_ms_avg 2500.000000
ishkul_llm_latency_ms{quantile="0.5"} 2300
ishkul_llm_latency_ms{quantile="0.9"} 4200
ishkul_llm_latency_ms{quantile="0.99"} 5100
```

### 3. Verify in Grafana
Wait 60 seconds (scrape interval), then check Grafana Explore:
```promql
{__name__=~"ishkul_.*"}
```

This shows all Ishkul metrics.

## Cost Monitoring

Grafana Cloud free tier limits:
- **10,000 active series**: Each unique metric counts as one series
- **Current usage**: ~30 series (counters + gauges + histograms)
- **Headroom**: 99.7% free capacity

To monitor usage:
1. Go to **Usage & Billing** in Grafana Cloud
2. Check "Active Series" graph
3. Set up alerts if you approach 8,000 series (80% of limit)

## Troubleshooting

### Metrics not showing up in Grafana

1. **Check scrape is working**:
   - Grafana → Configuration → Data Sources → Prometheus → "Explore"
   - Run query: `up{job="ishkul-backend-metrics-staging"}`
   - Should return `1` (up) or `0` (down)

2. **Check Cloud Run logs**:
   ```bash
   gcloud run services logs read ishkul-backend-staging --limit=50 | grep metrics
   ```

3. **Test endpoint manually**:
   ```bash
   curl -v https://ishkul-backend-staging-930454644160.northamerica-northeast2.run.app/metrics/prometheus
   ```

   You should get a `200 OK` response with Prometheus-formatted metrics.

### High cardinality warning

If you see "too many active series" warning:
- We're using low cardinality (no dynamic labels like user IDs)
- Safe to ignore unless you approach 10,000 series

### Slow query performance

If queries are slow:
- Use shorter time ranges: `[5m]` instead of `[24h]`
- Use `rate()` or `increase()` instead of raw metrics
- Downsample in panel settings (e.g., "1 minute" resolution)

## Next Steps

1. **Add more metrics**:
   - HTTP request latency
   - Firestore operation counts
   - Cache hit rates

2. **Create SLO dashboards**:
   - 99% of LLM calls < 5 seconds
   - 95% of tasks complete within 30 seconds
   - Error rate < 1%

3. **Set up alerts**:
   - Queue depth > 50 for 5 minutes
   - LLM error rate > 5%
   - Worker count = 0 (system down)

4. **Export dashboard as JSON**:
   - Save in `backend/grafana/dashboards/ishkul-backend.json`
   - Version control your dashboards
   - Import on new Grafana instances

## Resources

- [Grafana Cloud Free Tier](https://grafana.com/pricing/)
- [Prometheus Query Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Dashboard Best Practices](https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/best-practices/)
- [PromQL Cheat Sheet](https://promlabs.com/promql-cheat-sheet/)

---

**Last Updated**: 2025-12-26
**Status**: Production Ready
**Estimated Cost**: $0/month (within free tier)
