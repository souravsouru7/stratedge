# Edge Cases for Critical Components - Trading Journal Application

## Table of Contents
1. [Trade Processing & OCR Pipeline](#1-trade-processing--ocr-pipeline)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Payment Processing (Razorpay)](#3-payment-processing-razorpay)
4. [Analytics Calculations](#4-analytics-calculations)
5. [File Upload & Cloudinary Integration](#5-file-upload--cloudinary-integration)
6. [Cache Management](#6-cache-management)
7. [Queue Processing (BullMQ)](#7-queue-processing-bullmq)
8. [Database Operations & Indexes](#8-database-operations--indexes)

---

## 1. Trade Processing & OCR Pipeline

### File: `backend/services/tradeProcessingService.js`

#### Edge Cases for OCR Extraction

**OCR Timeout Scenarios:**
- **Image too large (50MB+):** Tesseract may timeout even with 60s limit
  - *Impact:* Processing fails, trade stuck in "processing" state
  - *Fix:* Add image size validation before OCR, compress large images
  
- **Corrupted image file:** Valid URL but corrupted bytes
  - *Impact:* Tesseract throws unhandled exception
  - *Fix:* Add image validation (magic bytes check) before processing

- **Network timeout during image download:** Cloudinary CDN temporarily down
  - *Current handling:* 30s timeout in `downloadImageBuffer()`
  - *Edge case:* Partial download (206 response) → Buffer.from(arrayBuffer) may be incomplete
  - *Fix:* Verify content-length matches buffer size

**Vision API Fallback:**
- **Vision API returns empty text but OCR would work:** Line 249 checks `text.trim().length > 20`
  - *Edge case:* Complex table with only 15 characters of text but valid trade data
  - *Impact:* Unnecessarily falls back to slower Tesseract
  - *Fix:* Lower threshold to 10 or use structural detection

- **Vision API succeeds but returns malformed JSON:** AI parsing error
  - *Current handling:* Try-catch at line 716-718, continues to OCR
  - *Edge case:* Partial JSON (e.g., missing closing brace) → silent failure
  - *Fix:* Add JSON schema validation with detailed error logging

**Multi-Trade Detection:**
- **Ghost trade deletion race condition:** Lines 932-959
  ```javascript
  if (isMultiTrade) {
    await setCache(statusBridgeKey, {...}, 15 * 60);
    await Trade.findByIdAndDelete(tradeId);
  }
  ```
  - *Edge case:* User refreshes status poll between `setCache` and `findByIdAndDelete`
  - *Impact:* Trade appears deleted but cache not set → 404 error
  - *Fix:* Use MongoDB transaction or atomic operation

- **OCR finds 2 trades but AI finds 1:** Lines 759-786
  - *Edge case:* OCR trades have partial data (missing strike price)
  - *Current handling:* Validates `ocrTradesAreValid` before override
  - *Remaining edge:* What if OCR finds trades 1 & 3 but misses trade 2?
  - *Fix:* Add trade count confidence scoring

**Confidence Score Edge Cases:**
- **Score exactly at boundaries:** Lines 898-902
  ```javascript
  if (quality.score < 10) {
    // Reject as non-trade
  }
  ```
  - *Edge case:* Score = 9.9 vs 10.01 → completely different outcomes
  - *Impact:* One decimal point difference rejects valid trade
  - *Fix:* Add "review" zone (5-15) instead of hard cutoff

- **Confidence manipulation via image editing:**
  - *Edge case:* User adds broker logo to non-trade image → tricks keyword detection
  - *Current handling:* `isTradeRelatedContent()` checks keywords
  - *Fix:* Cross-validate OCR content with expected broker format patterns

**Timeout Cascading:**
- **Processing timeout hits during AI call:** Line 985
  ```javascript
  return withTimeout((async () => {...})(), "Processing timeout");
  ```
  - *Edge case:* Gemini API call takes 45s, overall timeout is 60s, but remaining 15s not enough for DB save
  - *Impact:* Trade processing completes but DB update fails → inconsistent state
  - *Fix:* Reserve minimum 10s for post-processing cleanup

---

## 2. Authentication & Authorization

### File: `backend/controllers/authController.js`

#### Firebase/Google Login Edge Cases

**Token Verification:**
- **Firebase token expires mid-request:** Lines 20-30
  - *Edge case:* User initiates login, token valid, but verification takes 5s and token expires at 4s
  - *Impact:* `verifyIdToken()` throws, returns 500 instead of 401
  - *Fix:* Catch specific Firebase error codes, return proper 401

- **Google ID token with multiple audiences:** Lines 32-71
  - *Edge case:* Token issued for multiple apps (aud is array)
  - *Current handling:* Doesn't verify `aud` field
  - *Fix:* Validate `aud` matches your Firebase project ID

**User Creation Race Condition:**
- **Simultaneous Google logins create duplicate users:** Lines 184-208
  ```javascript
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({...});
  }
  ```
  - *Edge case:* Two concurrent requests for same new Google user
  - *Impact:* DuplicateKeyError on email unique index
  - *Fix:* Use `findOneAndUpdate` with `upsert: true` or catch duplicate error

**Token Version Invalidations:**
- **Reset password increments tokenVersion:** Line 384
  ```javascript
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  ```
  - *Edge case:* Integer overflow at `Number.MAX_SAFE_INTEGER` (9 quadrillion)
  - *Impact:* Practically impossible, but theoretically breaks JWT
  - *Fix:* Reset to 0 if exceeds threshold (e.g., 1 billion)

**OTP Security:**
- **OTP timing attack:** Lines 323-360
  ```javascript
  const isValid = user.resetPasswordOTP === otp && ...;
  ```
  - *Edge case:* String comparison `===` leaks timing information
  - *Fix:* Use `crypto.timingSafeEqual` (already done in payment verification, missing here)

- **OTP lock bypass via email case variations:**
  - *Edge case:* User locks `user@example.com`, tries `User@Example.com`
  - *Current handling:* MongoDB queries are case-sensitive by default
  - *Fix:* Normalize email to lowercase before all queries

---

## 3. Payment Processing (Razorpay)

### File: `backend/controllers/paymentController.js`

#### Signature Verification Edge Cases

**Timing Attack Prevention:**
- **Signature comparison:** Lines 54-63
  ```javascript
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, "hex"),
    Buffer.from(razorpay_signature, "hex")
  );
  ```
  - *Edge case:* Invalid hex string → `Buffer.from()` throws → caught, returns false ✓
  - *Status:* Properly handled

**Subscription Extension Logic:**
- **Overlapping subscriptions:** Lines 72-76
  ```javascript
  if (user.subscriptionStatus === "active" && user.subscriptionExpiry && new Date(user.subscriptionExpiry) > expiryDate) {
    expiryDate = new Date(user.subscriptionExpiry);
  }
  expiryDate.setDate(expiryDate.getDate() + 90);
  ```
  - *Edge case:* Subscription expired yesterday, user pays today
  - *Impact:* `new Date(user.subscriptionExpiry) > expiryDate` is false, starts from today ✓
  - *Edge case:* User pays twice within 1 minute (double-click)
  - *Impact:* Both payments extend from same base date → only +90 days instead of +180
  - *Fix:* Check `razorpay_payment_id` for duplicates before processing

**Race Condition on Payment Verification:**
- **Concurrent verifyPayment calls:** Lines 39-112
  - *Edge case:* Network retry sends same payment verification twice
  - *Impact:* User charged once but subscription extended twice
  - *Fix:* Add idempotency key or check `transactionId` uniqueness

**Amount Hardcoding:**
- **Fixed amount:** Lines 27, 70
  ```javascript
  amount: 150 * 100,  // Line 27
  const amount = 150;  // Line 70
  ```
  - *Edge case:* Price changes to ₹200 but one place not updated
  - *Impact:* User pays ₹200 but verification expects ₹150 signature
  - *Fix:* Use constant `SUBSCRIPTION_AMOUNT = 150` in config

---

## 4. Analytics Calculations

### File: `backend/controllers/analyticsController.js`

#### Division by Zero Edge Cases

**Win Rate Calculations:**
- **Zero trades:** Lines 37, 244, 256, etc.
  ```javascript
  const winRate = totalTrades ? (wins / totalTrades) * 100 : 0;
  ```
  - *Status:* Properly guarded with ternary ✓

**Profit Factor:**
- **No losing trades:** Lines 352, 1072, 1156
  ```javascript
  const profitFactor = totalLosses > 0 ? (totalWins / totalLosses).toFixed(2) : totalWins > 0 ? "∞" : "0.00";
  ```
  - *Edge case:* `totalWins = 0` and `totalLosses = 0` → returns "0.00" ✓
  - *Edge case:* Returns string "∞" → frontend may fail to parse as number
  - *Fix:* Return `null` or `999` instead of "∞"

**Risk-Reward Ratio:**
- **Zero risk (entryPrice === stopLoss):** Lines 143-146
  ```javascript
  const risk = Math.abs(trade.entryPrice - trade.stopLoss);
  const reward = Math.abs(trade.takeProfit - trade.entryPrice);
  tradeRRFromPrices = reward / risk;
  ```
  - *Edge case:* `risk = 0` → `Infinity`
  - *Fix:* Check `risk > 0` before division (done at line 141) ✓

**Standard Deviation:**
- **Single trade:** Lines 204-206
  ```javascript
  const variance = returns.length > 0 ? returns.reduce((acc, r) => acc + Math.pow(r - meanReturn, 2), 0) / returns.length : 0;
  const stdDev = Math.sqrt(variance);
  const riskAdjustedReturn = stdDev > 0 ? meanReturn / stdDev : 0;
  ```
  - *Edge case:* 1 trade → variance = 0 → stdDev = 0 → returns 0
  - *Impact:* Risk-adjusted return shows 0 even if trade was profitable
  - *Fix:* Return `null` or "N/A" for < 2 trades

#### Time Zone Edge Cases

**Analytics Local Date:**
- **Daylight Saving Time:** Lines 13-19
  ```javascript
  const getAnalyticsLocalDate = (dateLike) => {
    const shiftedMs = base.getTime() + offsetHours * 60 * 60 * 1000;
    return new Date(shiftedMs);
  };
  ```
  - *Edge case:* IST has no DST, but if user changes `TIMEZONE_OFFSET_HOURS` during DST period
  - *Impact:* Off by 1 hour on DST transition days
  - *Fix:* Use proper timezone library (date-fns-tz, moment-timezone)

**Week Calculation:**
- **Incorrect week number:** Line 89
  ```javascript
  const week = `${date.getFullYear()}-W${Math.ceil(date.getDate() / 7)}`;
  ```
  - *Edge case:* Feb 8 → `Math.ceil(8/7) = 2` but it might be week 6 of year
  - *Impact:* Weekly stats group incorrectly
  - *Fix:* Use ISO week number calculation

**Session Overlap:**
- **London/NY overlap:** Lines 287-289
  ```javascript
  if (hour >= 8 && hour < 16) session = "London Session";
  else if (hour >= 13 && hour < 21) session = "NY Session";
  ```
  - *Edge case:* Hour 14 → matches London first, never reaches NY check
  - *Impact:* Overlap hours (13-16) attributed to London only
  - *Fix:* Add explicit overlap session: `if (hour >= 13 && hour < 16) session = "Overlap"`

#### Data Type Edge Cases

**Profit as String:**
- **MongoDB stores profit as string:** Line 35
  ```javascript
  const totalProfit = trades.reduce((acc, t) => acc + (t.profit || 0), 0);
  ```
  - *Edge case:* `t.profit = "50"` → `"0" + "50" = "050"` (string concatenation)
  - *Fix:* `acc + parseFloat(t.profit || 0)`

**toFixed Precision Loss:**
- **Chained toFixed calls:** Line 62
  ```javascript
  totalProfit: totalProfit.toFixed(2),
  ```
  - *Edge case:* `totalProfit = 100 / 3 = 33.333...` → `.toFixed(2) = "33.33"`
  - *Later calculation:* Summing these rounded values introduces drift
  - *Fix:* Store raw numbers, round only at final display

---

## 5. File Upload & Cloudinary Integration

### File: `backend/services/upload.service.js`

#### Upload Cleanup Edge Cases

**Failed Enqueue Cleanup:**
- **Trade created but queue fails:** Lines 9-35
  ```javascript
  async function cleanupFailedUpload({ tradeId, uploadedImage, userId, error }) {
    if (!tradeId && uploadedImage?.publicId) {
      await cloudinary.uploader.destroy(uploadedImage.publicId, {...});
    }
    if (tradeId) {
      await tradeRepository.updateTradeById(tradeId, { status: "failed", ... });
    }
  }
  ```
  - *Edge case:* `tradeId` exists BUT `cloudinary.uploader.destroy()` fails
  - *Impact:* Image remains in Cloudinary consuming storage
  - *Fix:* Delete from Cloudinary first, then mark trade as failed

**Subscription Check Race:**
- **Free upload used check:** Lines 46-58
  ```javascript
  const isSubscribed = user.subscriptionStatus === "active" && ...;
  if (!isSubscribed && user.freeUploadUsed) {
    throw new ApiError(403, "Subscription required", ...);
  }
  ```
  - *Edge case:* User uploads, subscription expires mid-processing
  - *Impact:* First upload succeeds (check passed), second upload rejected
  - *Acceptable behavior* ✓

**Market Type Validation:**
- **Case sensitivity:** Lines 64-69
  ```javascript
  const ALLOWED_MARKET_TYPES = new Set(["Forex", "Indian_Market"]);
  const rawMarketType = String(body.marketType || query.marketType || "Forex").trim();
  ```
  - *Edge case:* `marketType = "forex"` (lowercase) → rejected
  - *Fix:* Normalize to expected case: `rawMarketType.charAt(0).toUpperCase() + ...`

---

## 6. Cache Management

### File: `backend/utils/cache.js`, `backend/utils/cacheUtils.js`

#### Cache Invalidation Edge Cases

**Trade List Cache:**
- **Stale cache after trade update:** Lines 77-99 in `trade.service.js`
  ```javascript
  const key = buildCacheKey("trades", userId, "list", `period=${period}`);
  const { data: trades } = await rememberCache(key, TRADE_LIST_TTL_SECONDS, async () => {...});
  ```
  - *Edge case:* User updates trade, cache cleared via `clearUserCache(userId)`, but another user's cache unaffected
  - *Status:* Properly cleared on create/update/delete ✓

- **Cache stampede:** Multiple requests for same cache key when it expires
  - *Edge case:* 100 concurrent requests → all miss cache → 100 DB queries
  - *Fix:* Implement cache-aside with lock or probabilistic early expiration

**Trade Status Bridge Cache:**
- **Cache TTL mismatch:** Lines 933-953 in `tradeProcessingService.js`
  ```javascript
  await setCache(statusBridgeKey, {...}, 15 * 60); // 15 minutes
  ```
  - *Edge case:* Trade status poll happens at 15:01 → cache expired → 404
  - *Impact:* User sees "Trade not found" even though it completed
  - *Fix:* Use 30min TTL or store in DB as fallback

**Cache Key Collision:**
- **Similar user IDs:** `buildCacheKey("trades", userId, "list")`
  - *Edge case:* User `abc` and user `abc-def` if delimiter not used properly
  - *Fix:* Use explicit delimiter: `trades:abc:list` not `tradesabclist`

---

## 7. Queue Processing (BullMQ)

### File: `backend/queues/ocrQueue.js`, `backend/workers/ocrWorker.js`

#### Job Retry Edge Cases

**Exponential Backoff:**
- **Max retries reached:** Default BullMQ behavior
  - *Edge case:* Job fails 3 times, all with different errors
  - *Impact:* Job moves to failed queue, trade stuck in "processing"
  - *Fix:* Add failed job listener to mark trade as "failed" in DB

**Duplicate Job Detection:**
- **Same trade uploaded twice quickly:**
  - *Edge case:* User clicks upload button twice → 2 jobs for same trade
  - *Impact:* Double processing, race condition on DB update
  - *Fix:* Use tradeId as job ID (BullMQ deduplicates by job ID)

**Worker Crash Mid-Job:**
- **Process killed during OCR:**
  - *Edge case:* Worker processing trade, server restarts, job marked as "active"
  - *Impact:* BullMQ moves job back to waiting after `lockDuration` expires
  - *Status:* Handled by BullMQ ✓

**Memory Leak in Worker:**
- **Large image buffers not released:**
  - *Edge case:* Worker processes 100 images, each 5MB buffer held in memory
  - *Impact:* Worker OOM crashes
  - *Fix:* Explicitly null buffers after processing, monitor heap usage

---

## 8. Database Operations & Indexes

### File: `backend/models/Trade.js`

#### Index Performance Edge Cases

**Compound Index Order:**
- **Query pattern mismatch:** Lines 247-256
  ```javascript
  tradeSchema.index({ user: 1, marketType: 1, createdAt: -1 });
  ```
  - *Edge case:* Query filters by `marketType` but not `user` → index not used
  - *Fix:* Add index `{ marketType: 1, createdAt: -1 }` if needed

**Index Bloat:**
- **Frequent updates to indexed fields:**
  - *Edge case:* `status` field updated multiple times per trade (pending → processing → completed)
  - *Impact:* Index fragmentation over time
  - *Fix:* Periodic index rebuild or use partial indexes for active trades only

#### Schema Validation Edge Cases

**Missing Enum Values:**
- **Trade type enum:** Lines 15-18
  ```javascript
  type: {
    type: String,
    enum: ["BUY", "SELL"],
  },
  ```
  - *Edge case:* Old data has `"buy"` (lowercase) → validation fails on update
  - *Fix:* Add migration to normalize existing data, use case-insensitive match

**Number Precision:**
- **Profit field as Number:** Line 32
  ```javascript
  profit: Number,
  ```
  - *Edge case:* `profit: 123456789.123456789` → MongoDB stores as float, precision loss
  - *Fix:* Store as string with 2 decimals or use Decimal128 type

**Array Field Growth:**
- **Emotional tags unbounded:** Lines 222-225
  ```javascript
  emotionalTags: {
    type: [String],
    default: []
  },
  ```
  - *Edge case:* User adds 1000 tags → document exceeds 16MB BSON limit
  - *Fix:* Limit array to reasonable size (e.g., 50) via validation

---

## Critical Priority Edge Cases (Fix Immediately)

1. **Payment idempotency** - Double payment verification can extend subscription twice
2. **Multi-trade ghost deletion race** - Cache set + delete not atomic
3. **Google login duplicate user** - Concurrent requests cause DuplicateKeyError
4. **Division by zero in analytics** - Several places lack guards
5. **String concatenation in profit reduce** - If profit is string, calculations break

## High Priority Edge Cases (Fix Soon)

6. **OTP timing attack** - Use `crypto.timingSafeEqual`
7. **Session overlap misclassification** - London/NY overlap hours
8. **Cloudinary orphan images** - Failed upload cleanup order
9. **Cache stampede on expiry** - 100 concurrent DB queries
10. **Trade status bridge cache expiry** - 15min TTL too short

## Medium Priority Edge Cases (Plan to Fix)

11. **Confidence score hard cutoff** - Add "review" zone
12. **ISO week number calculation** - Incorrect week grouping
13. **Timezone DST handling** - Use proper timezone library
14. **Worker memory leak** - Buffer cleanup after processing
15. **Schema enum case sensitivity** - Normalize old data

---

## Testing Recommendations

### Unit Tests Needed:
- [ ] `calculateConfidenceScore()` with boundary values (9.9, 10.0, 10.1)
- [ ] `mergeIndianAiTrades()` with mismatched array lengths
- [ ] `verifyPayment()` with duplicate razorpay_payment_id
- [ ] `getRiskRewardAnalysis()` with zero-loss trades
- [ ] `processTradeUpload()` with timeout at various stages

### Integration Tests Needed:
- [ ] Concurrent Google login for new user
- [ ] Payment verification with network retry
- [ ] Multi-trade upload → ghost trade deletion → status poll
- [ ] Cache invalidation across trade CRUD operations
- [ ] Queue job retry after worker crash

### Load Tests Needed:
- [ ] 1000 concurrent trade status polls (cache stampede)
- [ ] 100 simultaneous image uploads (queue backpressure)
- [ ] Analytics with 10,000 trades (query performance)
- [ ] OCR worker memory after 500 jobs (leak detection)

---

## Monitoring Alerts to Add

1. **Trade stuck in "processing" > 5 minutes** (queue failure)
2. **Payment verification failure rate > 5%** (Razorpay integration issue)
3. **Cache hit rate < 70%** (invalidation problem)
4. **OCR confidence < 30% for > 20% of trades** (broker format changed)
5. **Queue job retry rate > 15%** (external API instability)
6. **MongoDB query time > 500ms** (missing index)
7. **Cloudinary storage growing > 1GB/day** (orphan images)
8. **Auth failure rate spike** (credential stuffing attack)

---

*Generated by senior developer analysis on 2026-04-30*
*Review and prioritize based on business impact and likelihood*
