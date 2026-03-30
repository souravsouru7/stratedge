import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');

// Test configuration
export const options = {
  stages: [
    { duration: '10s', target: 10 },   // Ramp up to 10 users
    { duration: '20s', target: 50 },   // Ramp up to 50 users (peak load)
    { duration: '30s', target: 50 },   // Stay at 50 users for 30s
    { duration: '20s', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests should be below 500ms
    errors: ['rate<0.1'],              // Error rate should be less than 10%
    api_response_time: ['p(95)<600'],  // API response time p95 < 600ms
  },
};

// Base URL - change this to your backend URL
const BASE_URL = 'http://localhost:5000';

// Authentication token (you'll need to get this from your app)
// Option 1: Hardcode a test user token here
// Option 2: Use environment variable: k6 run -e TOKEN=your_token script.js
const TOKEN = __ENV.TOKEN || 'YOUR_TEST_TOKEN_HERE';

// Helper function to get auth headers
function getAuthHeaders() {
  return {
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
  };
}

// Main test scenario
export default function () {
  // Test 1: Get Summary Analytics
  let res = http.get(`${BASE_URL}/analytics/summary`, getAuthHeaders());
  
  const summaryCheck = check(res, {
    'summary status is 200': (r) => r.status === 200,
    'summary has totalTrades': (r) => JSON.parse(r.body).totalTrades !== undefined,
  });
  
  errorRate.add(!summaryCheck);
  apiResponseTime.add(res.timings.duration);
  
  sleep(0.5);

  // Test 2: Get Risk/Reward Analysis
  res = http.get(`${BASE_URL}/analytics/risk-reward`, getAuthHeaders());
  
  const rrCheck = check(res, {
    'risk-reward status is 200': (r) => r.status === 200,
    'risk-reward has avgRR': (r) => JSON.parse(r.body).avgRR !== undefined,
  });
  
  errorRate.add(!rrCheck);
  apiResponseTime.add(res.timings.duration);
  
  sleep(0.5);

  // Test 3: Get Performance Metrics
  res = http.get(`${BASE_URL}/analytics/performance`, getAuthHeaders());
  
  const perfCheck = check(res, {
    'performance status is 200': (r) => r.status === 200,
    'performance has profitFactor': (r) => JSON.parse(r.body).profitFactor !== undefined,
  });
  
  errorRate.add(!perfCheck);
  apiResponseTime.add(res.timings.duration);
  
  sleep(0.5);

  // Test 4: Get Drawdown Analysis
  res = http.get(`${BASE_URL}/analytics/drawdown`, getAuthHeaders());
  
  const drawdownCheck = check(res, {
    'drawdown status is 200': (r) => r.status === 200,
    'drawdown has maxDrawdown': (r) => JSON.parse(r.body).maxDrawdown !== undefined,
  });
  
  errorRate.add(!drawdownCheck);
  apiResponseTime.add(res.timings.duration);
  
  sleep(0.5);

  // Test 5: Get Trade Distribution
  res = http.get(`${BASE_URL}/analytics/distribution`, getAuthHeaders());
  
  const distCheck = check(res, {
    'distribution status is 200': (r) => r.status === 200,
    'distribution has byPair': (r) => JSON.parse(r.body).byPair !== undefined,
  });
  
  errorRate.add(!distCheck);
  apiResponseTime.add(res.timings.duration);
  
  sleep(0.5);

  // Test 6: Get AI Insights
  res = http.get(`${BASE_URL}/analytics/ai-insights`, getAuthHeaders());
  
  const aiCheck = check(res, {
    'ai-insights status is 200': (r) => r.status === 200,
    'ai-insights has insights': (r) => JSON.parse(r.body).insights !== undefined,
  });
  
  errorRate.add(!aiCheck);
  apiResponseTime.add(res.timings.duration);
  
  sleep(1);

  // Test 7: Advanced Analytics (all-in-one endpoint)
  res = http.get(`${BASE_URL}/analytics/advanced`, getAuthHeaders());
  
  const advancedCheck = check(res, {
    'advanced status is 200': (r) => r.status === 200,
    'advanced has totalTrades': (r) => JSON.parse(r.body).totalTrades !== undefined,
  });
  
  errorRate.add(!advancedCheck);
  apiResponseTime.add(res.timings.duration);
  
  sleep(1);
}

// Setup: Run once before all tests
export function setup() {
  console.log('Starting k6 load test...');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Token configured: ${TOKEN !== 'YOUR_TEST_TOKEN_HERE' ? 'Yes' : 'No - Please set TOKEN env var'}`);
  
  // Test connection
  const res = http.get(`${BASE_URL}/`);
  if (res.status !== 200) {
    console.warn('Warning: Backend might not be running or accessible');
  }
}

// Teardown: Run once after all tests
export function teardown(data) {
  console.log('Load test completed!');
  console.log('Check the summary above for performance metrics');
}
