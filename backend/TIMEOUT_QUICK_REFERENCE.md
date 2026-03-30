# 🚀 Timeout Handling Quick Reference

## Default Timeouts

| Service | Timeout | Configurable |
|---------|---------|--------------|
| **Global API** | 15s | ✅ `API_REQUEST_TIMEOUT_MS` |
| **OCR** | 30s | ✅ `OCR_SERVICE_TIMEOUT_MS` |
| **AI** | 20s | ✅ `AI_SERVICE_TIMEOUT_MS` |
| **Database** | 10s | ✅ `DB_OPERATION_TIMEOUT_MS` |
| **External APIs** | 10s | ✅ `EXTERNAL_API_TIMEOUT_MS` |

---

## Configuration (.env)

```env
# Global request timeout
API_REQUEST_TIMEOUT_MS=15000

# Service-specific timeouts
OCR_SERVICE_TIMEOUT_MS=30000
AI_SERVICE_TIMEOUT_MS=20000
DB_OPERATION_TIMEOUT_MS=10000
EXTERNAL_API_TIMEOUT_MS=10000
PROCESSING_TIMEOUT_MS=20000
```

---

## Timeout Response

When request exceeds time limit:

**HTTP Status:** 408 Request Timeout

**Response Body:**
```json
{
  "message": "Request timeout, please try again",
  "error": "REQUEST_TIMEOUT",
  "timeout": "15000ms"
}
```

---

## Usage Examples

### Wrap Promise with Timeout

```javascript
const { withTimeout } = require('./middleware/timeout');

// Basic usage
try {
  const result = await withTimeout(
    someAsyncOperation(),
    "Operation name",
    10000 // 10 seconds
  );
} catch (error) {
  if (error.name === 'TimeoutError') {
    console.error('Operation timed out:', error.duration);
  }
}
```

### Check Remaining Time in Handler

```javascript
router.get('/slow-operation', async (req, res) => {
  const remaining = getRemainingTime(req);
  console.log(`Time remaining: ${remaining}ms`);
  
  if (remaining < 5000) {
    return res.status(408).json({ message: 'Not enough time' });
  }
  
  // Continue with operation...
});
```

---

## Testing Commands

### Test Slow Endpoint

```bash
# Create test route that takes 20s
# Then curl it - should timeout at 15s
curl http://localhost:5000/api/test/slow
```

### Monitor Timeouts

```bash
# View recent timeouts
grep "timeout" backend/logs/combined.log

# Real-time monitoring
tail -f backend/logs/combined.log | grep -i timeout
```

---

## Common Scenarios

### Scenario 1: OCR Takes Too Long

```
User uploads image → OCR starts → Takes > 30s
→ Timeout triggered → HTTP 408 returned
→ Log: "OCR extraction timeout | duration=30000ms"
```

### Scenario 2: AI API Slow

```
User requests AI analysis → OpenAI call → Takes > 20s
→ Timeout triggered → HTTP 408 returned
→ Log: "AI API call timeout | duration=20000ms"
```

### Scenario 3: Complex Analytics

```
User requests analytics → DB aggregation → Takes > 15s
→ Timeout triggered → HTTP 408 returned
→ Log: "Request timeout | route=/api/analytics"
```

---

## Adjusting Timeouts

### More Aggressive (Fail Faster)

```env
API_REQUEST_TIMEOUT_MS=10000
OCR_SERVICE_TIMEOUT_MS=20000
AI_SERVICE_TIMEOUT_MS=15000
```

### More Lenient (Allow Slower Ops)

```env
API_REQUEST_TIMEOUT_MS=30000
OCR_SERVICE_TIMEOUT_MS=60000
AI_SERVICE_TIMEOUT_MS=40000
```

### Disable Specific Timeout

```env
# Set to very high value to effectively disable
OCR_SERVICE_TIMEOUT_MS=300000  # 5 minutes
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Too many timeouts | Increase timeouts temporarily; optimize slow ops |
| Timeouts not working | Check middleware order in server.js |
| Memory still leaking | Verify timers being cleaned up |
| Operations almost complete but timeout | Add 1-2s buffer to timeout values |

---

## Monitoring Best Practices

### Track These Metrics

- Timeout rate (% of requests timing out)
- Average time before timeout
- Most common timed-out routes
- Timeout trends over time

### Set Alerts For

- Timeout rate > 5%
- Sudden spike in timeouts
- Specific route consistently failing
- Timeout rate increasing week-over-week

---

## Files Modified

- ✅ `middleware/timeout.js` - Main timeout utilities
- ✅ `server.js` - Applied timeout middleware
- ✅ `services/ocrService.js` - Added OCR timeout
- ✅ `services/aiExtractionService.js` - Added AI timeout
- ✅ `services/tradeProcessingService.js` - Enhanced wrapper

---

## Quick Start

1. **Add to `.env`:**
```env
API_REQUEST_TIMEOUT_MS=15000
OCR_SERVICE_TIMEOUT_MS=30000
AI_SERVICE_TIMEOUT_MS=20000
```

2. **Restart server**

3. **Monitor logs** for timeout events

Done! Your API is now protected from hanging requests! 🎉
