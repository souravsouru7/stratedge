# Rate Limiting Enhancement Guide

## ✅ Implementation Complete

Your Node.js backend now has enhanced route-specific rate limiting to prevent API abuse and protect system resources.

---

## 📦 What Changed

### 1. **Route-Specific Rate Limiters Created**

Four separate rate limiters are now available:

| Limiter | Window | Max Requests | Purpose |
|---------|--------|--------------|---------|
| **Global** | 15 min | 300 | Default for all routes |
| **Auth** | 1 min | 5 | Login, register, password reset |
| **Upload** | 1 min | 10 | Image uploads (OCR/AI processing) |
| **Status** | 1 min | 30 | Status check endpoints |

### 2. **Stricter Auth Protection**

**Before:** 30 requests per 15 minutes  
**After:** 5 requests per 1 minute

This prevents brute force attacks on login endpoints.

### 3. **Upload Rate Limiting**

**Limit:** 10 requests per minute

Prevents abuse of expensive OCR/AI processing resources.

### 4. **Status Endpoint Rate Limiting**

**NEW:** 30 requests per minute

Lightweight read operations get higher limits but still protected.

---

## 🔧 Configuration

### Environment Variables

Add these to your `.env` file to customize limits:

```env
# Global rate limit (all routes)
RATE_LIMIT_WINDOW_MS=900000        # 15 minutes
RATE_LIMIT_MAX_REQUESTS=300        # 300 requests per window

# Authentication endpoints (login, register, etc.)
AUTH_RATE_LIMIT_WINDOW_MS=60000    # 1 minute
AUTH_RATE_LIMIT_MAX_REQUESTS=5     # 5 requests per minute

# Upload endpoints (OCR/AI processing)
UPLOAD_RATE_LIMIT_WINDOW_MS=60000  # 1 minute
UPLOAD_RATE_LIMIT_MAX_REQUESTS=10  # 10 requests per minute

# Status/check endpoints
STATUS_RATE_LIMIT_WINDOW_MS=60000  # 1 minute
STATUS_RATE_LIMIT_MAX_REQUESTS=30  # 30 requests per minute
```

---

## 🎯 How It Works

### Rate Limiter Application

Rate limiters are applied at the route level in `server.js`:

```javascript
// Auth routes - strictest limit
app.use("/api/auth", authRateLimiter, require("./routes/authRoutes"));

// Upload routes - medium limit
app.use("/api/upload", uploadRateLimiter, require("./routes/uploadRoutes"));

// Status routes - relaxed limit
app.use("/api/trade", statusRateLimiter, require("./routes/tradeStatusRoutes"));

// Other routes - global limit
app.use("/api/trades", require("./routes/tradeRoutes"));
```

### Request Flow

1. **Request received** → Rate limiter checks IP count
2. **Under limit** → Request proceeds normally
3. **Over limit** → Returns 429 Too Many Requests
4. **Response logged** → Warning logged with IP and route info

---

## 🚫 Rate Limit Responses

When rate limit is exceeded, clients receive:

```json
{
  "message": "Too many requests, please try again later"
}
```

HTTP Status: **429 Too Many Requests**

### Custom Messages by Route

- **Auth**: "Too many authentication attempts, please try again later"
- **Upload**: "Too many upload attempts, please try again later"
- **Status**: "Too many status check requests, please try again later"
- **General**: "Too many requests, please try again later"

---

## 📊 Rate Limits by Endpoint

### Authentication Endpoints (`/api/auth/*`)
**Limit:** 5 requests/minute

Applies to:
- POST `/auth/register`
- POST `/auth/login`
- POST `/auth/google`
- POST `/auth/forgot-password`
- POST `/auth/verify-otp`
- POST `/auth/reset-password`
- GET `/auth/me`

**Why so strict?** Prevents brute force attacks and credential stuffing.

---

### Upload Endpoints (`/api/upload/*`)
**Limit:** 10 requests/minute

Applies to:
- POST `/upload` (image upload for OCR)

**Why limited?** Each upload triggers expensive OCR + AI processing.

---

### Status Endpoints (`/api/trade/status/*`)
**Limit:** 30 requests/minute

Applies to:
- GET `/trade/status/:id`

**Why relaxed?** Lightweight database read operations.

---

### All Other Endpoints
**Limit:** 300 requests/15 minutes (default)

Applies to:
- `/api/trades/*`
- `/api/setups/*`
- `/api/checklists/*`
- `/api/analytics/*`
- `/api/reports/*`
- Admin routes
- Indian market routes

**Why generous?** Normal API usage won't hit this limit.

---

## 🔍 Monitoring & Logging

### Rate Limit Events Logged

Every time rate limit is exceeded, a warning is logged:

```
2026-03-30 12:00:00 [warn] Rate limit exceeded | type=auth | ip=192.168.1.100 | path=/api/auth/login
```

### Log Information Includes

- **IP address** - Identify abusive clients
- **Route path** - Which endpoint is being targeted
- **HTTP method** - GET, POST, etc.
- **Limit type** - auth, upload, status, or general
- **User agent** - Client identification

### View Rate Limit Logs

```bash
# See all rate limit warnings
grep "Rate limit exceeded" backend/logs/combined.log

# See auth-specific limits
grep "type=auth" backend/logs/combined.log

# See upload limits
grep "type=upload" backend/logs/combined.log
```

---

## 🛡️ Security Features

### 1. Brute Force Prevention

**Login endpoint protection:**
- Only 5 login attempts per minute per IP
- Counts failed AND successful requests
- Prevents credential stuffing attacks

### 2. Resource Abuse Prevention

**Upload endpoint protection:**
- Only 10 uploads per minute per IP
- Prevents OCR/AI resource exhaustion
- Protects against DoS attacks

### 3. IP-Based Tracking

All rate limiters track by IP address:
- Each IP gets its own counter
- Shared across all routes for that IP
- No user authentication required

---

## ⚙️ Advanced Configuration

### Skip Rate Limiting

To skip rate limiting for specific trusted IPs:

```javascript
// In rateLimit.js
const globalRateLimiter = rateLimit({
  windowMs,
  max: maxRequests,
  skip: (req) => {
    const trustedIPs = ['127.0.0.1', '192.168.1.1'];
    return trustedIPs.includes(req.ip);
  }
});
```

### Custom Key Generator

To rate limit by user instead of IP:

```javascript
const authRateLimiter = rateLimit({
  windowMs: authWindowMs,
  max: authMaxRequests,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user?._id?.toString() || req.ip;
  }
});
```

### Sliding Window

For smoother rate limiting:

```javascript
const uploadRateLimiter = rateLimit({
  windowMs: uploadWindowMs,
  max: uploadMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ 
      message: "Too many requests",
      retryAfter: Math.ceil(uploadWindowMs / 1000)
    });
  }
});
```

---

## 🧪 Testing

### Test Rate Limiting

```bash
# Rapidly send requests to auth endpoint
for i in {1..10}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"test"}'
done

# After 5 requests, you'll see:
# {"message":"Too many authentication attempts, please try again later"}
```

### Test Upload Rate Limiting

```bash
# Send multiple upload requests
for i in {1..15}; do
  curl -X POST http://localhost:5000/api/upload \
    -F "image=@test.jpg"
done

# After 10 requests, you'll see:
# {"message":"Too many upload attempts, please try again later"}
```

---

## 📈 Monitoring Best Practices

### 1. Watch for Patterns

Look for these patterns in logs:
- Repeated rate limit hits from same IP → Potential attack
- Multiple IPs hitting limits → May need to adjust limits
- Specific endpoints frequently limited → May need stricter limits

### 2. Set Up Alerts

Consider alerting when:
- Single IP exceeds 10 rate limit events in 5 minutes
- More than 100 rate limit events globally in 1 minute
- Auth endpoints consistently hitting limits

### 3. Analyze Trends

Weekly review:
- Which endpoints hit limits most?
- Are limits too strict or too lenient?
- Any new attack patterns?

---

## 🔧 Troubleshooting

### Issue: Legitimate Users Getting Rate Limited

**Solution:** Increase limits or implement user-based rate limiting

```env
# Increase auth limit
AUTH_RATE_LIMIT_MAX_REQUESTS=10  # Instead of 5
```

### Issue: Rate Limits Not Working

**Check:**
1. Middleware order in server.js (must be before routes)
2. Environment variables loaded correctly
3. Rate limiters imported and applied

### Issue: Too Many False Positives

**Solution:** Add IP whitelist

```javascript
const globalRateLimiter = rateLimit({
  windowMs,
  max: maxRequests,
  skip: (req) => {
    const whitelist = ['1.2.3.4', '5.6.7.8'];
    return whitelist.includes(req.ip);
  }
});
```

---

## 🎁 Bonus Features

### Rate Limit Headers

Clients can check their rate limit status via headers:

```
RateLimit-Limit: 5
RateLimit-Remaining: 2
RateLimit-Reset: 1711800000
```

### Custom Response Code

Already configured to return proper HTTP 429 status.

### Structured Logging

All rate limit events logged with full context for debugging.

---

## 📝 Summary

### Before Enhancement
- Basic global rate limiting only
- Auth had 30 requests/15 min (too lenient)
- No upload-specific limits
- No status endpoint limits

### After Enhancement
✅ **4 route-specific rate limiters**  
✅ **Auth: 5 req/min** (brute force protection)  
✅ **Upload: 10 req/min** (resource protection)  
✅ **Status: 30 req/min** (lightweight ops)  
✅ **Custom error responses** with clear messages  
✅ **Structured logging** of all rate limit events  
✅ **Environment variable configuration**  
✅ **No breaking changes** to existing routes  

---

## 🚀 Next Steps

1. **Monitor logs** for first 24 hours
2. **Adjust limits** based on actual usage patterns
3. **Consider user-based limiting** for authenticated endpoints
4. **Set up alerts** for suspicious patterns
5. **Document limits** in API documentation for users

Your backend is now protected against common abuse patterns while maintaining excellent performance for legitimate users! 🎉
