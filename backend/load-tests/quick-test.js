import http from 'k6/http';
import { check, sleep } from 'k6';

// Simple 50-user load test
export const options = {
  vus: 50,              // 50 concurrent users
  duration: '30s',      // Run for 30 seconds
  
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% under 500ms
    http_req_failed: ['rate<0.1'],     // Less than 10% failures
  },
};

const BASE_URL = 'http://localhost:5000';
const TOKEN = __ENV.TOKEN || 'YOUR_TOKEN_HERE';

export default function () {
  // Test all analytics endpoints
  const endpoints = [
    '/analytics/summary',
    '/analytics/risk-reward',
    '/analytics/performance',
    '/analytics/drawdown',
    '/analytics/distribution',
    '/analytics/ai-insights',
    '/analytics/advanced'
  ];

  // Each virtual user picks a random endpoint
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  
  const res = http.get(`${BASE_URL}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
    },
  });
  
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
  
  sleep(1); // Wait 1 second between requests
}
