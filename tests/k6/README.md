# k6 Load Testing

Performance and load testing suite for the Ishkul backend API.

## Prerequisites

Install k6:

```bash
# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Docker
docker pull grafana/k6
```

## Test Types

| Test | Purpose | Duration | VUs |
|------|---------|----------|-----|
| `smoke-test.js` | Quick sanity check | 30s | 1 |
| `api-load-test.js` | Normal load simulation | ~16min | 20-50 |
| `stress-test.js` | Find breaking point | ~26min | 50-150 |

## Running Tests

### Local Development

```bash
# Smoke test (quick check)
k6 run tests/k6/smoke-test.js

# Load test against local
k6 run tests/k6/api-load-test.js

# Load test against staging
k6 run tests/k6/api-load-test.js --env USE_STAGING=true

# With authentication
k6 run tests/k6/api-load-test.js --env USE_STAGING=true --env TEST_TOKEN=your_jwt_token
```

### Using Docker

```bash
docker run --rm -i grafana/k6 run - < tests/k6/smoke-test.js
```

### CI/CD

Tests are automatically run via GitHub Actions:
- **Smoke tests**: On every staging deployment
- **Load tests**: Nightly scheduled runs
- **Stress tests**: Weekly or on-demand

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BASE_URL` | API base URL for local | `http://localhost:8080` |
| `STAGING_URL` | Staging API URL | Cloud Run staging URL |
| `USE_STAGING` | Use staging URL | `false` |
| `TEST_TOKEN` | JWT token for auth endpoints | (empty) |

## Thresholds

Default thresholds (fail test if exceeded):

- **Response Time**: 95th percentile < 500ms, 99th < 1000ms
- **Error Rate**: < 1%
- **Time to First Byte**: 95th percentile < 400ms

## Results

Test results are saved to `tests/k6/results/`:
- `smoke-test-summary.json`
- `load-test-summary.json`
- `stress-test-summary.json`

## Adding New Tests

1. Create a new `.js` file in `tests/k6/`
2. Import shared config from `./config.js`
3. Define scenarios and thresholds
4. Add the test to CI workflow if needed

## Grafana Cloud Integration (Optional)

For advanced visualization, export results to Grafana Cloud:

```bash
k6 run tests/k6/api-load-test.js \
  --out cloud \
  --env K6_CLOUD_TOKEN=your_token
```
