// k6 Configuration
// Shared configuration for all k6 tests

import http from 'k6/http';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
export const STAGING_URL = __ENV.STAGING_URL || __ENV.PUBLIC_API_URL || 'https://ishkul-backend-staging-930454644160.northamerica-northeast2.run.app';

// Test credentials (passed via environment variables)
export const TEST_EMAIL = __ENV.TEST_USER_EMAIL || '';
export const TEST_PASSWORD = __ENV.TEST_USER_PASSWORD || '';

// Common thresholds for all tests
export const defaultThresholds = {
  http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
  http_req_failed: ['rate<0.01'],                  // Error rate < 1%
  http_req_waiting: ['p(95)<400'],                 // Time to first byte
};

// Strict thresholds for critical endpoints
export const strictThresholds = {
  http_req_duration: ['p(95)<200', 'p(99)<500'],
  http_req_failed: ['rate<0.001'],
  http_req_waiting: ['p(95)<150'],
};

// Load test scenarios
export const scenarios = {
  // Smoke test - minimal load to verify system works
  smoke: {
    executor: 'constant-vus',
    vus: 1,
    duration: '30s',
  },

  // Load test - normal expected load
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 20 },   // Ramp up
      { duration: '5m', target: 20 },   // Stay at 20 users
      { duration: '2m', target: 50 },   // Ramp up more
      { duration: '5m', target: 50 },   // Stay at 50 users
      { duration: '2m', target: 0 },    // Ramp down
    ],
  },

  // Stress test - find breaking point
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 50 },
      { duration: '5m', target: 50 },
      { duration: '2m', target: 100 },
      { duration: '5m', target: 100 },
      { duration: '2m', target: 150 },
      { duration: '5m', target: 150 },
      { duration: '5m', target: 0 },
    ],
  },

  // Spike test - sudden surge
  spike: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '10s', target: 100 },  // Instant spike
      { duration: '1m', target: 100 },   // Stay at spike
      { duration: '10s', target: 0 },    // Quick recovery
    ],
  },
};

// Helper function to get the appropriate URL
export function getBaseUrl() {
  return __ENV.USE_STAGING === 'true' ? STAGING_URL : BASE_URL;
}

// Helper function to login and get auth token
export function loginAndGetToken(baseUrl) {
  // If token is provided directly, use it
  if (__ENV.TEST_TOKEN) {
    return __ENV.TEST_TOKEN;
  }

  // Otherwise, login with email/password
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    console.log('No credentials provided, skipping authenticated tests');
    return null;
  }

  const loginRes = http.post(`${baseUrl}/api/auth/login`, JSON.stringify({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (loginRes.status === 200) {
    const body = JSON.parse(loginRes.body);
    console.log('Login successful');
    return body.token || body.accessToken || body.access_token;
  } else {
    console.log(`Login failed with status ${loginRes.status}: ${loginRes.body}`);
    return null;
  }
}
