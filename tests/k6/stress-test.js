// k6 Stress Test
// Find the breaking point of the API under extreme load
// Run: k6 run tests/k6/stress-test.js --env USE_STAGING=true

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { getBaseUrl, scenarios } from './config.js';

// Custom metrics
const errorRate = new Rate('errors');
const requestsPerSecond = new Counter('requests_per_second');
const responseTimes = new Trend('response_times');

export const options = {
  scenarios: {
    stress: scenarios.stress,
  },
  thresholds: {
    // More lenient thresholds for stress test - we expect some failures
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.1'],  // Allow up to 10% errors
    errors: ['rate<0.15'],
  },
};

const BASE_URL = getBaseUrl();

export function setup() {
  console.log(`Starting STRESS test against: ${BASE_URL}`);
  console.log('This test will push the system to its limits.');

  const healthRes = http.get(`${BASE_URL}/health`);
  if (healthRes.status !== 200) {
    throw new Error(`API not reachable before stress test: ${healthRes.status}`);
  }

  return { startTime: Date.now() };
}

export default function () {
  group('Stress Test Requests', function () {
    // Hammer the health endpoint
    const res = http.get(`${BASE_URL}/health`);
    requestsPerSecond.add(1);
    responseTimes.add(res.timings.duration);

    const passed = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 5s': (r) => r.timings.duration < 5000,
    });

    errorRate.add(!passed);

    // Minimal sleep to maximize load
    sleep(0.1);
  });
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`\nStress test completed in ${duration.toFixed(2)} seconds`);
  console.log('Review the results to identify the breaking point.');
}

export function handleSummary(data) {
  const { metrics } = data;

  // Determine if the system handled the stress
  const avgResponseTime = metrics.http_req_duration?.values?.avg || 0;
  const p99ResponseTime = metrics.http_req_duration?.values?.['p(99)'] || 0;
  const errorPercent = (metrics.http_req_failed?.values?.rate || 0) * 100;
  const totalRequests = metrics.http_reqs?.values?.count || 0;

  const summary = {
    conclusion: {
      totalRequests,
      avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
      p99ResponseTime: `${p99ResponseTime.toFixed(2)}ms`,
      errorRate: `${errorPercent.toFixed(2)}%`,
      recommendation: errorPercent > 5
        ? 'System showed signs of stress. Consider scaling or optimization.'
        : 'System handled stress test well.',
    },
    fullReport: data,
  };

  return {
    'tests/k6/results/stress-test-summary.json': JSON.stringify(summary, null, 2),
  };
}
