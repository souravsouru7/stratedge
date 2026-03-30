# 🚀 Rate Limiting Quick Reference

## Current Limits

| Endpoint Type | Limit | Window | Purpose |
|--------------|-------|--------|---------|
| 🔐 **Auth** | 5 req/min | 1 min | Prevent brute force |
| 📤 **Upload** | 10 req/min | 1 min | Protect OCR/AI resources |
| 📊 **Status** | 30 req/min | 1 min | Lightweight reads |
| 🌐 **Global** | 300 req/15min | 15 min | Default for all |

---

## Endpoints by Category

### 🔐 Auth Routes (5 req/min)
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/google
POST /api/auth/forgot-password
POST /api/auth/verify-otp
POST /api/auth/reset-password
GET  /api/auth/me
```

### 📤 Upload Routes (10 req/min)
```
POST /api/upload
```

### 📊 Status Routes (30 req/min)
```
GET /api/trade/status/:id
```

### 🌐 Other Routes (300 req/15min)
```
/api/trades/*
/api/setups/*
/api/checklists/*
/api/analytics/*
/api/reports/*
/api/admin/*
/api/indian/*
```

---

## Configuration (.env)

```env
# Global
RATE_LIMIT_WINDOW_MS=900000        # 15 minutes
RATE_LIMIT_MAX_REQUESTS=300

# Auth
AUTH_RATE_LIMIT_WINDOW_MS=60000    # 1 minute
AUTH_RATE_LIMIT_MAX_REQUESTS=5

# Upload
UPLOAD_RATE_LIMIT_WINDOW_MS=60000  # 1 minute
UPLOAD_RATE_LIMIT_MAX_REQUESTS=10

# Status
STATUS_RATE_LIMIT_WINDOW_MS=60000  # 1 minute
STATUS_RATE_LIMIT_MAX_REQUESTS=30
```

---

## Error Responses

### Standard Response
```json
{
  "message": "Too many requests, please try again later"
}
```

### Custom Messages
- **Auth**: "Too many authentication attempts..."
- **Upload**: "Too many upload attempts..."
- **Status**: "Too many status check requests..."

HTTP Status: **429 Too Many Requests**

---

## Testing Commands

### Test Auth Rate Limit
```bash
for i in {1..10}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"test"}'
done
```

### Test Upload Rate Limit
```bash
for i in {1..15}; do
  curl -X POST http://localhost:5000/api/upload \
    -F "image=@test.jpg"
done
```

### View Rate Limit Logs
```bash
# All rate limit events
grep "Rate limit exceeded" backend/logs/combined.log

# Auth-specific
grep "type=auth" backend/logs/combined.log

# Upload-specific
grep "type=upload" backend/logs/combined.log
```

---

## Monitoring

### Check Rate Limit Headers
```bash
curl -i http://localhost:5000/api/trades
# Look for:
# RateLimit-Limit: 300
# RateLimit-Remaining: 295
# RateLimit-Reset: 1711800000
```

### Watch Live Logs
```bash
tail -f backend/logs/combined.log | grep "Rate limit"
```

---

## Adjusting Limits

### Increase Limits (More Permissive)
```env
AUTH_RATE_LIMIT_MAX_REQUESTS=10  # Was 5
UPLOAD_RATE_LIMIT_MAX_REQUESTS=20  # Was 10
```

### Decrease Limits (More Strict)
```env
AUTH_RATE_LIMIT_MAX_REQUESTS=3  # Was 5
UPLOAD_RATE_LIMIT_MAX_REQUESTS=5  # Was 10
```

### Change Time Window
```env
AUTH_RATE_LIMIT_WINDOW_MS=120000  # 2 minutes instead of 1
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Users hitting limits too fast | Increase `MAX_REQUESTS` |
| Still getting attacked | Decrease `MAX_REQUESTS` or add IP whitelist |
| Limits not working | Check middleware order in server.js |
| Need per-user limiting | Modify `keyGenerator` in rate limiter |

---

## Files Modified

- ✅ `middleware/rateLimit.js` - Enhanced rate limiters
- ✅ `server.js` - Applied route-specific limiters
- ✅ `routes/uploadRoutes.js` - Already had limiter (verified)

---

## Key Features

✅ **Route-specific limits** - Different endpoints, different limits  
✅ **Custom error messages** - Clear feedback for users  
✅ **Structured logging** - Full context on rate limit events  
✅ **IP-based tracking** - Each IP gets separate counter  
✅ **Environment config** - Easy to tune without code changes  
✅ **No breaking changes** - Existing routes work identically  

---

## Security Benefits

🛡️ **Brute Force Prevention** - Only 5 login attempts/min  
🛡️ **Resource Protection** - Uploads limited to protect OCR/AI  
🛡️ **DoS Mitigation** - Global limit prevents overload  
🛡️ **Attack Detection** - All limits logged for monitoring  

---

For detailed documentation, see `RATE_LIMITING_GUIDE.md`
