// k6 Smoke Test
// Quick sanity check that the API is working
// Run: k6 run tests/k6/smoke-test.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { getBaseUrl, defaultThresholds, scenarios } from './config.js';

// Custom metrics
const errorRate = new Rate('errors');
const healthCheckDuration = new Trend('health_check_duration');

export const options = {
  scenarios: {
    smoke: scenarios.smoke,
  },
  thresholds: {
    ...defaultThresholds,
    errors: ['rate<0.1'],
  },
};

const BASE_URL = getBaseUrl();

export default function () {
  // Health check endpoint
  const healthRes = http.get(`${BASE_URL}/health`);
  healthCheckDuration.add(healthRes.timings.duration);

  const healthCheck = check(healthRes, {
    'health status is 200': (r) => r.status === 200,
    'health response has status': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'healthy' || body.status === 'ok';
      } catch {
        return false;
      }
    },
    'health response time < 200ms': (r) => r.timings.duration < 200,
  });

  errorRate.add(!healthCheck);

  sleep(1);

  // Ready check endpoint (if exists)
  const readyRes = http.get(`${BASE_URL}/ready`);
  check(readyRes, {
    'ready status is 200 or 404': (r) => r.status === 200 || r.status === 404,
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'tests/k6/results/smoke-test-summary.json': JSON.stringify(data, null, 2),
  };
}

// Text summary helper
function textSummary(data, options) {
  const { metrics } = data;
  const lines = [
    '\n========== SMOKE TEST SUMMARY ==========\n',
    `Total Requests: ${metrics.http_reqs?.values?.count || 0}`,
    `Failed Requests: ${metrics.http_req_failed?.values?.passes || 0}`,
    `Avg Response Time: ${(metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms`,
    `95th Percentile: ${(metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2)}ms`,
    `Error Rate: ${((metrics.errors?.values?.rate || 0) * 100).toFixed(2)}%`,
    '\n=========================================\n',
  ];
  return lines.join('\n');
}
