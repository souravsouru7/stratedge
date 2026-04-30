# 🧪 Testing Guide - Edge Case Fixes

Quick start guide to test all edge case fixes in your trading journal application.

---

## 🚀 Quick Start (30 seconds)

```bash
# Navigate to backend directory
cd backend

# Install test dependencies (one-time)
npm install

# Run all edge case tests
npm run test:manual
```

**Expected output:** All 8 tests should pass ✅

---

## 📋 Available Test Commands

### Automated Tests (Jest)

```bash
# Run ALL automated tests
npm test

# Run edge case tests only
npm run test:edge-cases

# Run payment idempotency tests
npm run test:payment

# Run analytics edge case tests
npm run test:analytics

# Run tests with code coverage
npm run test:coverage
```

### Manual Verification Script

```bash
# Run comprehensive edge case verification
npm run test:manual
```

This script checks:
1. ✅ Analytics with zero trades
2. ✅ String type coercion handling
3. ✅ Division by zero protection
4. ✅ Payment idempotency schema
5. ✅ Cloudinary cleanup order
6. ✅ Session overlap classification
7. ✅ Cache stampede protection
8. ✅ OTP timing attack prevention
9. ✅ Bridge cache TTL
10. ✅ Worker buffer cleanup

---

## 🎯 Testing Each Fix Manually

### 1. Payment Idempotency

**What to test:** Duplicate payments don't extend subscription twice

**Steps:**
```bash
# Start server
npm run dev

# In another terminal, send two identical payment requests:
curl -X POST http://localhost:5000/api/payments/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "razorpay_order_id": "order_test123",
    "razorpay_payment_id": "pay_test456",
    "razorpay_signature": "valid_signature"
  }'

# Run it twice quickly - second should say "already verified"
```

**Verify in MongoDB:**
```javascript
// Should return exactly 1 payment
db.payments.find({ razorpayPaymentId: "pay_test456" }).count()
```

---

### 2. Analytics with Zero Trades

**What to test:** Analytics don't crash with no data

**Steps:**
```bash
# Create a new user with 0 trades
# Then call analytics endpoint:
curl http://localhost:5000/api/analytics/summary \
  -H "Authorization: Bearer NEW_USER_TOKEN"
```

**Expected:** Returns valid JSON with `0` values, no crashes

---

### 3. String Type Coercion

**What to test:** String profits are parsed correctly

**Test in MongoDB:**
```javascript
// Insert trade with string profit
db.trades.insertOne({
  user: ObjectId("YOUR_USER_ID"),
  pair: "EURUSD",
  profit: "150",  // String!
  status: "completed",
  marketType: "Forex"
})

// Call analytics - should return 150, not "0150"
```

---

### 4. Session Overlap

**What to test:** London/NY overlap (13-16 UTC) classified correctly

**Test in MongoDB:**
```javascript
db.trades.insertOne({
  user: ObjectId("YOUR_USER_ID"),
  pair: "EURUSD",
  profit: 100,
  createdAt: new Date("2024-01-01T14:00:00Z"),  // 14 UTC = OVERLAP
  status: "completed",
  marketType: "Forex"
})

// Call analytics
curl http://localhost:5000/api/analytics/time \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected:** Shows in "London/NY Overlap" session, not "London Session"

---

### 5. Cloudinary Cleanup

**What to test:** Failed uploads delete images from Cloudinary

**Steps:**
1. Upload an invalid file to trigger failure
2. Check backend logs for: `"Cleaned up Cloudinary image from failed upload"`
3. Verify no orphan images in Cloudinary dashboard

**Or verify code:**
```bash
# Open upload.service.js and check line 9-43
# Should see: "Delete from Cloudinary FIRST" comment
```

---

### 6. Cache Stampede Protection

**What to test:** Multiple concurrent requests don't all hit DB

**Load test:**
```bash
# Install Apache Bench
sudo apt install apache2-utils  # Ubuntu
brew install httpd              # Mac

# Send 100 concurrent requests
ab -n 100 -c 100 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/analytics/summary
```

**Monitor MongoDB:**
```javascript
// Enable profiling
db.setProfilingLevel(1, { slowms: 100 })

// After test, check query count
db.system.profile.find({ op: "query" }).count()
// Should see ~1-3 queries, not 100
```

---

### 7. OTP Timing Attack

**What to test:** OTP comparison takes constant time

**Steps:**
```bash
# Request OTP
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Test with correct OTP (measure time)
time curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "otp": "123456"}'

# Test with wrong OTP (measure time)
time curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "otp": "000000"}'
```

**Expected:** Both requests take similar time (±5ms)

---

### 8. Worker Memory Management

**What to test:** Worker doesn't leak memory after processing images

**Steps:**
```bash
# Start worker with memory logging
NODE_OPTIONS="--max-old-space-size=512" npm run worker

# Upload 20+ images
for i in {1..20}; do
  curl -X POST http://localhost:5000/api/upload/trade \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -F "file=@screenshot-$i.jpg" \
    -F "marketType=Forex"
  sleep 2
done
```

**Expected:** Memory usage stays stable (±50MB), no OOM crashes

---

## 📊 Test Results Interpretation

### Manual Test Script Output

```
========================================
  EDGE CASE FIX VERIFICATION TESTS
========================================

✅ PASS Zero trades analytics
   totalTrades=0, totalProfit=0, winRate=0

✅ PASS String profit coercion
   String "150" parsed as 150 (expected: 150)

✅ PASS Division by zero (profit factor)
   profitFactor=null (expected: null for no losses)

...

========================================
  TEST SUMMARY
========================================

Total Tests:  8
Passed:       8
Failed:       0
Pass Rate:    100%

🎉 ALL TESTS PASSED! Edge case fixes verified successfully!
```

### Jest Test Output

```
 PASS  test/edge-cases/payment-idempotency.test.js
  Payment Idempotency Edge Cases
    ✓ should process first payment successfully (45 ms)
    ✓ should reject duplicate payment with same razorpay_payment_id (32 ms)
    ✓ should not extend subscription twice for duplicate payment (28 ms)

 PASS  test/edge-cases/analytics-edge-cases.test.js
  Analytics Edge Cases
    ✓ should return valid JSON with 0 values when user has no trades (23 ms)
    ✓ should handle profit stored as string correctly (18 ms)
    ...

Test Suites: 2 passed, 2 total
Tests:       20 passed, 20 total
```

---

## 🔍 Troubleshooting

### Tests Fail with "Cannot connect to database"

**Fix:**
```bash
# Make sure MongoDB is running
mongosh

# Or update .env with correct MongoDB URI
MONGODB_URI=mongodb://localhost:27017/trading_journal
```

### Tests Fail with "Module not found"

**Fix:**
```bash
# Install dependencies
npm install

# Specifically test dependencies
npm install --save-dev jest supertest mongodb-memory-server
```

### Manual Test Shows Some Failures

**Common issues:**

1. **Bridge cache TTL test fails**
   - Check `tradeProcessingService.js` line 983
   - Should have: `await setCache(statusBridgeKey, bridgePayload, 30 * 60);`

2. **Session overlap test fails**
   - Check `analyticsController.js` around line 330
   - Should have "London/NY Overlap" session

3. **Cloudinary cleanup test fails**
   - Check `upload.service.js` line 9-43
   - Should delete Cloudinary image before marking trade failed

---

## 📈 Production Testing Checklist

Before deploying to production, verify:

- [ ] All automated tests pass (`npm run test:edge-cases`)
- [ ] Manual test script passes (`npm run test:manual`)
- [ ] Payment idempotency works with real Razorpay test mode
- [ ] Analytics endpoint returns valid JSON for new users
- [ ] No orphan images in Cloudinary after failed uploads
- [ ] Cache hit rate > 70% under load
- [ ] Worker memory stable after processing 50+ images
- [ ] No 404 errors during multi-trade upload
- [ ] OTP verification timing is constant (±5ms)
- [ ] Session overlap appears correctly in analytics

---

## 🎯 Continuous Testing

### Add to CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Run Edge Case Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd backend && npm install
      - run: cd backend && npm run test:edge-cases
      - run: cd backend && npm run test:manual
```

### Pre-commit Hook

```bash
# .husky/pre-commit
#!/bin/sh
cd backend
npm run test:manual
```

---

## 📚 Test Files Reference

| File | Purpose | What it Tests |
|------|---------|---------------|
| `scripts/test-edge-cases.js` | Manual verification | All 8 edge case fixes |
| `test/edge-cases/payment-idempotency.test.js` | Jest tests | Payment duplication, race conditions |
| `test/edge-cases/analytics-edge-cases.test.js` | Jest tests | Division by zero, type coercion, sessions |
| `jest.config.js` | Configuration | Jest test runner settings |
| `test/jest.setup.js` | Setup | Test environment initialization |

---

## 🚦 When to Run Tests

| When | Which Tests | Why |
|------|-------------|-----|
| Before every commit | `npm run test:manual` | Quick verification |
| Before pull request | `npm run test:edge-cases` | Full test suite |
| Before production deploy | All tests + manual checks | Production safety |
| After database changes | Analytics tests | Verify calculations |
| After payment changes | Payment tests | Prevent revenue bugs |
| Monthly | All tests + load tests | Catch regressions |

---

## 💡 Pro Tips

1. **Use test mode for payments**
   ```bash
   # In .env
   RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXX
   RAZORPAY_KEY_SECRET=YYYYYYYYYY
   ```

2. **Watch tests in real-time**
   ```bash
   npm run test:edge-cases -- --watch
   ```

3. **Test specific edge case**
   ```bash
   npm run test:analytics -- --testNamePattern="Division by Zero"
   ```

4. **Generate coverage report**
   ```bash
   npm run test:coverage
   open coverage/lcov-report/index.html  # Mac
   start coverage/lcov-report/index.html # Windows
   ```

---

## 📞 Need Help?

If tests fail:

1. Check the error message carefully
2. Verify MongoDB is running
3. Ensure all dependencies are installed
4. Check that edge case fixes are in the code
5. Review [EDGE_CASES_FIX_STATUS.md](../EDGE_CASES_FIX_STATUS.md) for what was fixed

---

**Last updated:** 2026-04-30  
**Tests created for:** 15 edge case fixes  
**Status:** All tests passing ✅
