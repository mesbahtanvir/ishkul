// k6 API Load Test
// Tests API endpoints under realistic load conditions
// Run: k6 run tests/k6/api-load-test.js --env USE_STAGING=true
//
// NOTE: This test intentionally EXCLUDES endpoints that trigger LLM/ChatGPT calls
// to avoid incurring API costs during load testing. Only tests:
// - /health (public)
// - /api/me (authenticated, no LLM)
// - /api/subscription/status (authenticated, no LLM)

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { getBaseUrl, defaultThresholds, scenarios } from './config.js';

// Custom metrics
const errorRate = new Rate('errors');
const apiCalls = new Counter('api_calls');
const authDuration = new Trend('auth_duration');
const subscriptionDuration = new Trend('subscription_duration');

export const options = {
  scenarios: {
    load: scenarios.load,
  },
  thresholds: {
    ...defaultThresholds,
    errors: ['rate<0.05'],
    auth_duration: ['p(95)<300'],
    subscription_duration: ['p(95)<300'],
  },
};

const BASE_URL = getBaseUrl();

// Simulated test user token (for authenticated endpoints)
const TEST_TOKEN = __ENV.TEST_TOKEN || '';

const headers = {
  'Content-Type': 'application/json',
  ...(TEST_TOKEN && { 'Authorization': `Bearer ${TEST_TOKEN}` }),
};

export function setup() {
  // Verify the API is reachable before starting load test
  const healthRes = http.get(`${BASE_URL}/health`);
  if (healthRes.status !== 200) {
    throw new Error(`API not reachable: ${healthRes.status}`);
  }
  console.log(`Starting load test against: ${BASE_URL}`);
  console.log('NOTE: LLM endpoints excluded to avoid API costs');
  return { startTime: Date.now() };
}

export default function (data) {
  // Group 1: Public endpoints
  group('Public Endpoints', function () {
    // Health check
    const healthRes = http.get(`${BASE_URL}/health`);
    apiCalls.add(1);
    check(healthRes, {
      'health: status 200': (r) => r.status === 200,
    });

    sleep(0.5);
  });

  // Group 2: Authenticated endpoints (NO LLM calls)
  if (TEST_TOKEN) {
    group('Authenticated Endpoints', function () {
      // Get user profile
      const start = Date.now();
      const meRes = http.get(`${BASE_URL}/api/me`, { headers });
      authDuration.add(Date.now() - start);
      apiCalls.add(1);

      const meCheck = check(meRes, {
        'me: status 200 or 401': (r) => r.status === 200 || r.status === 401,
        'me: response time OK': (r) => r.timings.duration < 500,
      });
      errorRate.add(!meCheck);

      sleep(0.5);

      // Get subscription status
      const subStart = Date.now();
      const subRes = http.get(`${BASE_URL}/api/subscription/status`, { headers });
      subscriptionDuration.add(Date.now() - subStart);
      apiCalls.add(1);

      const subCheck = check(subRes, {
        'subscription: status 200 or 401': (r) => r.status === 200 || r.status === 401,
        'subscription: response time OK': (r) => r.timings.duration < 500,
      });
      errorRate.add(!subCheck);

      sleep(0.5);
    });

    // NOTE: Learning endpoints (/api/learning-paths, /api/me/next-step) are
    // intentionally excluded because they trigger LLM/ChatGPT API calls.
    // Testing them under load would incur significant costs.
  }

  // Random sleep between 1-3 seconds to simulate real user behavior
  sleep(Math.random() * 2 + 1);
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Load test completed in ${duration.toFixed(2)} seconds`);
}

export function handleSummary(data) {
  return {
    'tests/k6/results/load-test-summary.json': JSON.stringify(data, null, 2),
  };
}
