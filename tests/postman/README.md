# Postman/Newman API Testing

API functional tests for the Ishkul backend using Postman collections and Newman CLI.

## Prerequisites

Install Newman:

```bash
# npm
npm install -g newman
npm install -g newman-reporter-htmlextra

# Or use npx (no installation needed)
npx newman run ...
```

## Collections

| Collection | Purpose |
|------------|---------|
| `ishkul-api.collection.json` | Main API functional tests |

## Environments

| Environment | Purpose |
|-------------|---------|
| `local.environment.json` | Local development (localhost:8080) |
| `staging.environment.json` | Staging environment |

## Running Tests

### Local Development

```bash
# Run against local backend
newman run tests/postman/ishkul-api.collection.json \
  -e tests/postman/local.environment.json

# With authentication
newman run tests/postman/ishkul-api.collection.json \
  -e tests/postman/local.environment.json \
  --env-var "authToken=your_jwt_token"
```

### Staging Environment

```bash
# Run against staging
newman run tests/postman/ishkul-api.collection.json \
  -e tests/postman/staging.environment.json

# With authentication
newman run tests/postman/ishkul-api.collection.json \
  -e tests/postman/staging.environment.json \
  --env-var "authToken=$TEST_AUTH_TOKEN"
```

### CI/CD

```bash
# With JUnit reporter for CI
newman run tests/postman/ishkul-api.collection.json \
  -e tests/postman/staging.environment.json \
  --reporters cli,junit \
  --reporter-junit-export tests/postman/results/junit.xml

# With HTML report
newman run tests/postman/ishkul-api.collection.json \
  -e tests/postman/staging.environment.json \
  --reporters cli,htmlextra \
  --reporter-htmlextra-export tests/postman/results/report.html
```

## Test Categories

### Health & Status
- Health check endpoint
- Ready check endpoint

### Authentication
- Unauthenticated request handling
- Invalid token handling

### User Profile (Requires Auth)
- Get current user
- Profile data validation

### Subscription (Requires Auth)
- Subscription status
- Tier validation

### Learning Paths (Requires Auth)
- Get learning paths
- Response format validation

### Error Handling
- 404 responses
- Method not allowed

### Security
- CORS headers
- Rate limiting headers

## Using with Postman App

1. Import `ishkul-api.collection.json` into Postman
2. Import environment files
3. Select appropriate environment
4. Run collection or individual requests

## Adding New Tests

1. Open collection in Postman
2. Add new request to appropriate folder
3. Add test scripts in the "Tests" tab
4. Export collection and commit

### Test Script Examples

```javascript
// Status code check
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

// JSON property check
pm.test('Response has required fields', function () {
    const json = pm.response.json();
    pm.expect(json).to.have.property('id');
    pm.expect(json).to.have.property('email');
});

// Response time check
pm.test('Response time is acceptable', function () {
    pm.expect(pm.response.responseTime).to.be.below(1000);
});

// Skip test conditionally
if (!pm.variables.get('authToken')) {
    pm.test.skip('Skipped: No auth token');
    return;
}
```

## Results

Newman outputs results to:
- Console (default)
- `tests/postman/results/junit.xml` (CI)
- `tests/postman/results/report.html` (detailed HTML)
