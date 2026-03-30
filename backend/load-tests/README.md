# k6 Load Testing Guide

## Installation

### Windows
```bash
# Using Chocolatey
choco install k6

# OR download from: https://github.com/grafana/k6/releases
```

### Check Installation
```bash
k6 version
```

## Setup

### 1. Get Your Test Token

**Option A: From Browser (Easiest)**
1. Open your trading app in browser
2. Press `F12` → Application tab → Local Storage
3. Copy the `token` value

**Option B: Use Login API**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'
```

### 2. Set Environment Variable

**Windows PowerShell:**
```powershell
$env:TOKEN="your_jwt_token_here"
```

**Or inline:**
```powershell
k6 run -e TOKEN=your_jwt_token_here load-tests\analytics-load-test.js
```

## Running Tests

### Full Load Test (50 concurrent users)
```powershell
# Set token first
$env:TOKEN="your_jwt_token_here"

# Run test
k6 run load-tests\analytics-load-test.js
```

### Quick Smoke Test (5 users, 30 seconds)
```powershell
k6 run --vus 5 --duration 30s load-tests\analytics-load-test.js
```

### Stress Test (100 users)
```powershell
k6 run --vus 100 --duration 60s load-tests\analytics-load-test.js
```

## Understanding Results

### Example Output:
```
     ✓ summary status is 200
     ✓ summary has totalTrades
     
     checks.........................: 100% ✓ 1400/1400
     data_received..................: 3.2 MB 53 kB/s
     data_sent......................: 1.8 MB 30 kB/s
     http_req_duration..............: avg=245ms min=89ms med=234ms max=892ms p(90)=456ms p(95)=523ms
     http_reqs......................: 1400   23.333333/s
     iteration_duration.............: avg=2.1s min=2.0s med=2.1s max=2.5s
     iterations.....................: 200    3.333333/s
     vus............................: 50     min=50      max=50
     vus_max........................: 50     min=50      max=50

   thresholds:
     errors: rate<0.1               ✓
     http_req_duration: p(95)<500   ⚠ 523ms (FAILED - needs optimization)
```

### Key Metrics:
- **http_req_duration**: API response time
  - `avg`: Average response time
  - `p(95)`: 95th percentile (95% of requests are faster than this)
  - `max`: Slowest request
  
- **errors**: Percentage of failed requests (< 10% is good)

- **http_reqs**: Requests per second the server can handle

- **vus**: Virtual users (concurrent connections)

## Test Scenarios

### Scenario 1: Analytics Dashboard Load
Simulates 50 users opening the analytics page simultaneously:
```bash
k6 run --vus 50 --duration 60s load-tests\analytics-load-test.js
```

### Scenario 2: Gradual Ramp-up
Tests how system behaves as load increases:
```bash
k6 run load-tests\analytics-load-test.js
```
This runs through stages:
- 0-10s: Ramp to 10 users
- 10-30s: Ramp to 50 users  
- 30-60s: Sustain 50 users
- 60-80s: Ramp down

### Scenario 3: Spike Test
Sudden traffic spike:
```bash
k6 run --vus 0 --max-vus 100 --stage-duration 10s \
  --stages "10s:10,10s:100,20s:100,10s:0" \
  load-tests\analytics-load-test.js
```

## Performance Targets

Your tests should pass these thresholds:
- ✅ **95% of requests < 500ms**
- ✅ **Error rate < 10%**
- ✅ **API response time p95 < 600ms**

If tests fail:
1. Check MongoDB query performance
2. Review Redis caching effectiveness
3. Consider adding database indexes
4. Optimize heavy calculations

## Creating Custom Tests

### Simple GET Request Test
```javascript
import http from 'k6/http';
import { check } from 'k6';

export default function () {
  const res = http.get('http://localhost:5000/analytics/summary', {
    headers: { 'Authorization': `Bearer ${__ENV.TOKEN}` }
  });
  
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}
```

### POST Request Test (Add Trade)
```javascript
import http from 'k6/http';

export default function () {
  const payload = JSON.stringify({
    pair: 'EURUSD',
    type: 'BUY',
    profit: 50,
    entryPrice: 1.1234
  });
  
  const res = http.post('http://localhost:5000/api/trades', payload, {
    headers: { 
      'Authorization': `Bearer ${__ENV.TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
}
```

## Troubleshooting

### Error: "Connection refused"
- Make sure backend is running: `npm start`
- Check URL is correct: `http://localhost:5000`

### Error: "Unauthorized"
- Token expired or invalid
- Get fresh token from login endpoint

### Error: "Redis not ready"
- Start Redis server
- Or temporarily disable cache in routes

## Next Steps

1. Run baseline test with current setup
2. Identify bottlenecks from results
3. Optimize slow endpoints
4. Re-run tests to verify improvements
5. Set up automated CI/CD testing

## Resources
- [k6 Documentation](https://k6.io/docs/)
- [k6 Grafana Integration](https://k6.io/docs/results-visualization/grafana/)
- [Performance Best Practices](https://k6.io/blog/performance-testing-best-practices/)
