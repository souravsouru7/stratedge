# 🚀 k6 Load Testing - Quick Start Guide

## What Was Created

I've set up **k6 load testing** for your trading analytics API with 3 test scenarios:

### Files Created:
1. `load-tests/analytics-load-test.js` - Full staged test (ramp up to 50 users)
2. `load-tests/quick-test.js` - Simple 50-user test for 30 seconds
3. `load-tests/README.md` - Complete documentation
4. `prepare-load-test.js` - Helper script to clear cache and get ready

---

## 🎯 Quick Start (3 Steps)

### Step 1: Install k6

**Windows (Chocolatey):**
```powershell
choco install k6
```

**Or download from:** https://github.com/grafana/k6/releases

### Step 2: Get Your JWT Token

**From Browser:**
1. Open your trading app
2. Press `F12` → Application → Local Storage
3. Copy the `token` value

**OR use login API:**
```powershell
curl -X POST http://localhost:5000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"your@email.com\",\"password\":\"yourpassword\"}"
```

### Step 3: Run the Test

**Option A: Quick Test (50 users, 30 seconds)**
```powershell
# Set token
$env:TOKEN="paste_your_token_here"

# Run test
k6 run load-tests/quick-test.js
```

**Option B: Full Staged Test**
```powershell
$env:TOKEN="paste_your_token_here"
k6 run load-tests/analytics-load-test.js
```

---

## 📊 Understanding the Test Results

### Example Output:
```
     ✓ summary status is 200
     ✓ performance has profitFactor
     
     checks.........................: 100% ✓ 700/700
     http_req_duration..............: avg=245ms min=89ms med=234ms max=892ms p(95)=456ms
     http_reqs......................: 700    23.33/s
     vus............................: 50     min=50 max=50

   thresholds:
     http_req_duration: p(95)<500   ✓ PASSED
     http_req_failed: rate<0.1      ✓ PASSED
```

### Key Metrics Explained:

| Metric | What it Means | Target |
|--------|--------------|--------|
| **http_req_duration** | API response time | p(95) < 500ms ✅ |
| **http_reqs** | Requests per second | Higher = better throughput |
| **vus** | Concurrent virtual users | Test simulates this many |
| **checks** | Pass/fail validations | Should be near 100% ✅ |
| **http_req_failed** | Error rate | Should be < 10% ✅ |

---

## 🎯 Test Scenarios

### Scenario 1: Quick Smoke Test
**Purpose:** Fast validation that system can handle load
```powershell
k6 run --vus 20 --duration 20s load-tests/quick-test.js
```

### Scenario 2: Standard Load Test (50 Users)
**Purpose:** Simulate busy day with 50 concurrent users
```powershell
k6 run load-tests/quick-test.js
```

### Scenario 3: Progressive Load Test
**Purpose:** See how system behaves as load increases
```
0-10s:  Ramp up to 10 users
10-30s: Ramp up to 50 users
30-60s: Sustain at 50 users
60-80s: Ramp down to 0
```
```powershell
k6 run load-tests/analytics-load-test.js
```

### Scenario 4: Stress Test (100 Users)
**Purpose:** Find breaking point
```powershell
k6 run --vus 100 --duration 60s load-tests/quick-test.js
```

---

## 🔍 What's Being Tested

The tests hit all your analytics endpoints:
- ✅ `/analytics/summary` - Basic stats
- ✅ `/analytics/risk-reward` - Risk analysis
- ✅ `/analytics/performance` - Performance metrics
- ✅ `/analytics/drawdown` - Drawdown analysis
- ✅ `/analytics/distribution` - Trade distribution
- ✅ `/analytics/ai-insights` - AI insights
- ✅ `/analytics/advanced` - All-in-one endpoint

Each endpoint is validated for:
- HTTP 200 status code
- Correct response structure
- Response time thresholds

---

## 🛠️ Troubleshooting

### Error: "Connection refused"
**Solution:** Make sure backend is running
```powershell
cd backend
npm start
```

### Error: "Unauthorized" or 401
**Solution:** Token expired or invalid
- Get fresh token from browser
- Or re-login via API

### Error: "k6 command not found"
**Solution:** Install k6 first
```powershell
choco install k6
```

### Thresholds Failed (Red Text)
**Meaning:** Performance needs optimization
- Check MongoDB indexes
- Review Redis caching
- Optimize heavy calculations

---

## 📈 Performance Targets

Your API should meet these targets:

| Metric | Target | Status |
|--------|--------|--------|
| **Response Time (p95)** | < 500ms | ✅ Good |
| **Error Rate** | < 10% | ✅ Good |
| **Throughput** | > 20 req/s | ✅ Good |
| **Max Response Time** | < 1000ms | ⚠️ Monitor |

If you miss targets:
1. Check database query performance
2. Verify Redis caching is working
3. Add MongoDB indexes if needed
4. Consider pagination for large datasets

---

## 🎨 Advanced Usage

### Save Results to File
```powershell
k6 run --out json=results.json load-tests/quick-test.js
```

### Run with Custom Duration
```powershell
k6 run --vus 50 --duration 2m load-tests/quick-test.js
```

### Test Specific Endpoint Only
Edit `quick-test.js` and modify the endpoints array:
```javascript
const endpoints = [
  '/analytics/drawdown',  // Only test drawdown
];
```

### Grafana Dashboard Integration
```powershell
# Run with InfluxDB output
k6 run --out influxdb=http://localhost:8086/k6 load-tests/quick-test.js
```

---

## 🚦 Next Steps

1. **Run baseline test** with current setup
2. **Review results** and identify bottlenecks
3. **Optimize** slow endpoints
4. **Re-run tests** to verify improvements
5. **Set up CI/CD** automated testing

---

## 📚 Resources

- [k6 Official Docs](https://k6.io/docs/)
- [k6 Scripts Examples](https://github.com/grafana/k6-scripts)
- [Performance Testing Best Practices](https://k6.io/blog/performance-testing-best-practices/)
- [Grafana k6 Integration](https://k6.io/docs/results-visualization/grafana/)

---

## 💡 Pro Tips

1. **Always test with production-like data** for realistic results
2. **Run tests multiple times** and average the results
3. **Monitor server resources** (CPU, RAM, DB connections) during tests
4. **Test incrementally** - start small, increase load gradually
5. **Document baseline metrics** to track improvements

---

**Ready to test? Run this now:**
```powershell
$env:TOKEN="your_token_here"
k6 run load-tests/quick-test.js
```

🎉 Happy load testing!
