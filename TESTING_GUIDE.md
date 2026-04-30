# Testing Guide for Edge Case Fixes

**Date:** 2026-04-30  
**Purpose:** Verify all edge case fixes work correctly in development and production

---

## Quick Start - Test All Critical Fixes

Run the automated test suite:
```bash
npm run test:edge-cases
```

Or test individual fixes manually using the guides below.

---

## 1. Payment Idempotency Test

### What We're Testing:
- Duplicate payment verification doesn't extend subscription twice
- Concurrent requests are handled safely

### Manual Test:

**Step 1: Setup**
```bash
# Start backend server
cd backend
npm run dev
```

**Step 2: Create Test User**
```bash
# Register a test user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "acceptedTerms": true,
    "acceptedPrivacy": true
  }'
```

**Step 3: Simulate Duplicate Payment**
```bash
# Save the token from registration
TOKEN="your_jwt_token_here"

# Simulate first payment verification
curl -X POST http://localhost:5000/api/payments/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "razorpay_order_id": "order_test123",
    "razorpay_payment_id": "pay_test456",
    "razorpay_signature": "valid_signature_here",
    "planType": "3_months"
  }'

# IMMEDIATELY send second request (duplicate)
curl -X POST http://localhost:5000/api/payments/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "razorpay_order_id": "order_test123",
    "razorpay_payment_id": "pay_test456",
    "razorpay_signature": "valid_signature_here",
    "planType": "3_months"
  }'
```

**Expected Result:**
- ✅ First request: `{"success": true, "message": "Payment verified and subscription extended successfully"}`
- ✅ Second request: `{"success": true, "message": "Payment already verified and subscription is active"}`
- ✅ Check MongoDB: Only ONE Payment record with `razorpayPaymentId: "pay_test456"`
- ✅ Check user: `subscriptionExpiry` should be extended by 90 days ONLY ONCE

### Automated Test Script:

```javascript
// backend/test/payment-idempotency.test.js
const request = require('supertest');
const app = require('../server');
const Payment = require('../models/Payment');
const User = require('../models/Users');

describe('Payment Idempotency', () => {
  let token;
  let userId;

  beforeAll(async () => {
    // Create test user
    const user = await User.create({
      name: 'Test User',
      email: 'idempotency@test.com',
      password: 'hashed_password',
      authProvider: 'local'
    });
    userId = user._id;
    // Generate token...
  });

  it('should reject duplicate payment verification', async () => {
    const paymentData = {
      razorpay_order_id: 'order_dup123',
      razorpay_payment_id: 'pay_dup456',
      razorpay_signature: 'valid_sig'
    };

    // First request
    const res1 = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${token}`)
      .send(paymentData);

    expect(res1.statusCode).toBe(200);
    expect(res1.body.message).toContain('verified');

    // Second request (duplicate)
    const res2 = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${token}`)
      .send(paymentData);

    expect(res2.statusCode).toBe(200);
    expect(res2.body.message).toContain('already verified');

    // Verify only one payment record exists
    const payments = await Payment.find({ razorpayPaymentId: 'pay_dup456' });
    expect(payments.length).toBe(1);
  });
});
```

---

## 2. Cloudinary Cleanup Order Test

### What We're Testing:
- Failed uploads delete images from Cloudinary even when trade record exists

### Manual Test:

**Step 1: Setup Mock Cloudinary**
```bash
# Set Cloudinary to test mode in .env
CLOUDINARY_CLOUD_NAME=test_cloud
CLOUDINARY_API_KEY=test_key
CLOUDINARY_API_SECRET=test_secret
```

**Step 2: Trigger Failed Upload**
```bash
# Upload invalid file to trigger failure
curl -X POST http://localhost:5000/api/upload/trade \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@invalid-image.txt" \
  -F "marketType=Forex"
```

**Step 3: Check Cleanup**

Check backend logs for:
```
✅ "Cleaned up Cloudinary image from failed upload"
✅ Trade status updated to "failed"
```

**Expected Result:**
- ✅ Image deleted from Cloudinary FIRST
- ✅ Trade marked as failed SECOND
- ✅ No orphan images in Cloudinary dashboard

### Verification Query:
```javascript
// Check for failed trades with images still in Cloudinary
db.trades.find({
  status: "failed",
  imageUrl: { $exists: true, $ne: "" }
}).count()

// Should return 0 (or very few if cleanup failed)
```

---

## 3. Multi-Trade Race Condition Test

### What We're Testing:
- Multi-trade processing doesn't expose 404 during ghost trade deletion

### Manual Test:

**Step 1: Upload Multi-Trade Image**
```bash
# Upload screenshot with multiple trades
curl -X POST http://localhost:5000/api/upload/trade \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@multi-trade-screenshot.jpg" \
  -F "marketType=Indian_Market" \
  -F "tradeSubType=OPTION"
```

**Step 2: Poll Status Rapidly**
```bash
TRADE_ID="returned_trade_id"

# Poll every 100ms for 30 seconds
for i in {1..300}; do
  curl -s http://localhost:5000/api/trade/$TRADE_ID/status \
    -H "Authorization: Bearer $TOKEN" | jq -r '.status'
  sleep 0.1
done
```

**Expected Result:**
- ✅ Status progression: `pending` → `processing` → `completed`
- ✅ NEVER see `404` or `not found` error
- ✅ After completion, bridge cache contains multi-trade data

### Check Bridge Cache:
```javascript
// In Redis CLI
redis-cli
> GET trade_status_bridge:USER_ID:TRADE_ID

// Should return multi-trade payload
```

---

## 4. Analytics Division by Zero Test

### What We're Testing:
- Analytics endpoints don't crash with zero trades or edge case data

### Manual Test:

**Step 1: Test with No Trades**
```bash
# Create fresh user with 0 trades
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Empty User",
    "email": "empty@test.com",
    "password": "password123",
    "acceptedTerms": true,
    "acceptedPrivacy": true
  }'

# Get analytics (should not crash)
curl http://localhost:5000/api/analytics/summary \
  -H "Authorization: Bearer $EMPTY_USER_TOKEN"
```

**Step 2: Test with Edge Case Data**
```javascript
// Insert trade with string profit (simulates bad data)
db.trades.insertOne({
  user: ObjectId("USER_ID"),
  pair: "EURUSD",
  type: "BUY",
  profit: "50",  // String instead of number
  status: "completed",
  marketType: "Forex"
})

// Get analytics
curl http://localhost:5000/api/analytics/summary \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Result:**
- ✅ No crashes
- ✅ Returns valid JSON with `0` values for empty user
- ✅ String profit `"50"` correctly parsed as number `50`
- ✅ `profitFactor` returns `null` instead of `"∞"` when no losses

### Verify in Response:
```json
{
  "totalTrades": 0,
  "totalProfit": "0.00",
  "winRate": "0.0",
  "avgWin": "0.00",
  "avgLoss": "0.00"
}
```

---

## 5. Cache Stampede Test

### What We're Testing:
- Multiple concurrent requests don't all hit database

### Load Test Script:

```bash
# Install Apache Bench (if not installed)
sudo apt install apache2-utils  # Ubuntu
brew install httpd              # Mac

# Test with 100 concurrent requests
ab -n 100 -c 100 \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/analytics/summary
```

### Monitor Database Queries:

**Before test:**
```javascript
// Enable MongoDB query logging
db.setProfilingLevel(1, { slowms: 100 })
```

**After test:**
```javascript
// Check how many queries were executed
db.system.profile.find({
  op: "query",
  ns: "trading.trades"
}).count()

// Should see ~1-3 queries (not 100)
// Most requests served from cache
```

**Expected Result:**
- ✅ Cache hit rate > 80%
- ✅ Database queries ≈ 1-3 (not 100)
- ✅ No request timeouts

---

## 6. OTP Timing Attack Test

### What We're Testing:
- OTP comparison takes constant time regardless of match position

### Manual Test:

```bash
# Request OTP
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Test with correct OTP (measure time)
time curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "123456"  // Correct OTP
  }'

# Test with wrong first digit (measure time)
time curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "023456"  // Wrong first digit
  }'

# Test with wrong last digit (measure time)
time curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "123450"  // Wrong last digit
  }'
```

**Expected Result:**
- ✅ All three requests take approximately the same time (±5ms)
- ✅ No timing difference that reveals which digit was wrong

---

## 7. Session Overlap Test

### What We're Testing:
- Trades during London/NY overlap (13-16 UTC) classified correctly

### Manual Test:

```javascript
// Insert trades at different hours
db.trades.insertMany([
  {
    user: ObjectId("USER_ID"),
    pair: "EURUSD",
    profit: 100,
    createdAt: new Date("2024-01-01T05:00:00Z"),  // 5 UTC = Asia
    status: "completed",
    marketType: "Forex"
  },
  {
    user: ObjectId("USER_ID"),
    pair: "EURUSD",
    profit: 150,
    createdAt: new Date("2024-01-01T10:00:00Z"),  // 10 UTC = London
    status: "completed",
    marketType: "Forex"
  },
  {
    user: ObjectId("USER_ID"),
    pair: "EURUSD",
    profit: 200,
    createdAt: new Date("2024-01-01T14:00:00Z"),  // 14 UTC = OVERLAP
    status: "completed",
    marketType: "Forex"
  },
  {
    user: ObjectId("USER_ID"),
    pair: "EURUSD",
    profit: 50,
    createdAt: new Date("2024-01-01T18:00:00Z"),  // 18 UTC = NY
    status: "completed",
    marketType: "Forex"
  }
])

// Get time analysis
curl http://localhost:5000/api/analytics/time \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Result:**
```json
{
  "bySession": {
    "Asia Session": { "total": 1, "profit": 100 },
    "London Session": { "total": 1, "profit": 150 },
    "London/NY Overlap": { "total": 1, "profit": 200 },  // ✅ Correct!
    "NY Session": { "total": 1, "profit": 50 }
  }
}
```

---

## 8. Worker Buffer Cleanup Test

### What We're Testing:
- OCR worker doesn't leak memory after processing images

### Manual Test:

**Step 1: Monitor Memory**
```bash
# Start worker with memory logging
cd backend
NODE_OPTIONS="--max-old-space-size=512" npm run worker
```

**Step 2: Upload 50 Images Sequentially**
```bash
for i in {1..50}; do
  curl -X POST http://localhost:5000/api/upload/trade \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@trade-screenshot-$i.jpg" \
    -F "marketType=Forex"
  sleep 2
done
```

**Step 3: Check Memory Usage**
```bash
# Worker logs should show stable memory usage
# Should NOT see continuous growth
```

**Expected Result:**
- ✅ Memory usage stays stable (±50MB)
- ✅ No "out of memory" crashes
- ✅ GC (garbage collection) runs normally

---

## Running All Tests Automatically

### Install Test Dependencies:
```bash
cd backend
npm install --save-dev jest supertest mongodb-memory-server
```

### Add to package.json:
```json
{
  "scripts": {
    "test:edge-cases": "jest test/edge-cases/*.test.js --verbose",
    "test:payment": "jest test/edge-cases/payment-idempotency.test.js",
    "test:analytics": "jest test/edge-cases/analytics-edge-cases.test.js",
    "test:upload": "jest test/edge-cases/upload-cleanup.test.js"
  }
}
```

### Run Tests:
```bash
# Run all edge case tests
npm run test:edge-cases

# Run specific test
npm run test:payment

# Run with coverage
npm run test:edge-cases -- --coverage
```

---

## Production Verification Checklist

Before deploying to production, verify:

- [ ] Payment idempotency test passes
- [ ] Analytics with 0 trades returns valid JSON
- [ ] Multi-trade upload doesn't show 404 errors
- [ ] Cache hit rate > 70% under load
- [ ] Cloudinary cleanup logs show successful deletions
- [ ] Worker memory stable after 100 uploads
- [ ] OTP timing comparison is constant (±5ms)
- [ ] Session overlap appears in analytics
- [ ] No division by zero errors in logs
- [ ] Bridge cache TTL is 30 minutes

---

## Monitoring in Production

Add these alerts to catch regressions:

### 1. Payment Duplicate Detection
```javascript
// Alert if > 5% of payment verifications are duplicates
if (duplicatePaymentCount / totalPaymentCount > 0.05) {
  sendAlert("High payment duplicate rate detected");
}
```

### 2. Cloudinary Cleanup Failures
```javascript
// Alert if cleanup fails
logger.on('error', (msg) => {
  if (msg.includes('Failed to delete orphan Cloudinary')) {
    sendAlert("Cloudinary cleanup failing");
  }
});
```

### 3. Analytics Error Rate
```javascript
// Alert if analytics endpoint throws errors
if (analyticsErrorCount > 10) {
  sendAlert("Analytics endpoint error spike");
}
```

### 4. Cache Performance
```javascript
// Alert if cache hit rate drops below 60%
if (cacheHitRate < 0.6) {
  sendAlert("Cache performance degraded");
}
```

---

## Troubleshooting

### Payment Test Fails
```bash
# Check MongoDB for duplicate payments
db.payments.find({ razorpayPaymentId: "pay_test456" })

# Should return exactly 1 document
```

### Analytics Returns NaN
```bash
# Check for string profits in database
db.trades.find({ profit: { $type: "string" } })

# Fix them
db.trades.updateMany(
  { profit: { $type: "string" } },
  [{ $set: { profit: { $toDouble: "$profit" } } }]
)
```

### Cache Not Working
```bash
# Check Redis connection
redis-cli ping
# Should return: PONG

# Check cache keys
redis-cli KEYS "trades:*"
```

### Worker Memory Growing
```bash
# Check for buffer leaks
node --inspect worker.js

# Monitor in Chrome DevTools > Memory tab
# Look for ArrayBuffer growth
```

---

## Test Data Generation Script

```javascript
// backend/scripts/generate-test-data.js
const mongoose = require('mongoose');
const Trade = require('../models/Trade');
const User = require('../models/Users');

async function generateTestData() {
  // Create test user
  const user = await User.create({
    name: 'Edge Case Tester',
    email: 'edgecase@test.com',
    password: 'hashed_pw',
    authProvider: 'local'
  });

  // Generate 100 trades with edge cases
  const trades = [];
  for (let i = 0; i < 100; i++) {
    trades.push({
      user: user._id,
      pair: ['EURUSD', 'GBPUSD', 'USDJPY'][i % 3],
      type: i % 2 === 0 ? 'BUY' : 'SELL',
      profit: i % 10 === 0 ? "50" : (Math.random() - 0.5) * 200, // Some strings
      status: 'completed',
      marketType: 'Forex',
      createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000)
    });
  }

  await Trade.insertMany(trades);
  console.log(`Created ${trades.length} test trades`);
}

generateTestData().catch(console.error);
```

Run it:
```bash
cd backend
node scripts/generate-test-data.js
```

---

## Summary

### Quick Test Commands:

```bash
# 1. Test payment idempotency
npm run test:payment

# 2. Test analytics edge cases
npm run test:analytics

# 3. Test upload cleanup
npm run test:upload

# 4. Run all tests
npm run test:edge-cases

# 5. Load test cache
ab -n 100 -c 100 -H "Authorization: Bearer TOKEN" http://localhost:5000/api/analytics/summary

# 6. Verify in MongoDB
mongosh
> db.payments.aggregate([{$group: {_id: "$razorpayPaymentId", count: {$sum: 1}}}, {$match: {count: {$gt: 1}}}])
# Should return [] (no duplicates)
```

### Success Criteria:

✅ All automated tests pass  
✅ No crashes with edge case data  
✅ Memory usage stable under load  
✅ Cache hit rate > 70%  
✅ No orphan Cloudinary images  
✅ No duplicate payment processing  
✅ Analytics returns valid JSON always  

---

*Testing guide created on 2026-04-30*  
*Run these tests before every production deployment*
