// k6 Configuration
// Shared configuration for all k6 tests

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
export const STAGING_URL = __ENV.STAGING_URL || 'https://ishkul-backend-staging-1086267507068.northamerica-northeast1.run.app';

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
