# 🚀 Quick Reference - Logging & Monitoring

## Commands

### Start Services
```bash
# Backend server (with logging)
npm run dev

# OCR Worker (with logging)
npm run worker
```

### View Logs
```bash
# All logs (real-time)
tail -f backend/logs/combined.log

# Errors only (real-time)
tail -f backend/logs/error.log

# Search specific trade
grep "tradeId=abc123" backend/logs/combined.log

# Search job failures
grep "Job failed" backend/logs/combined.log
```

---

## Log Levels

| Level  | When Used                          | Example                          |
|--------|------------------------------------|----------------------------------|
| error  | Something broke                    | Job failed, API error            |
| warn   | Needs attention                    | Low confidence, validation fail  |
| info   | Normal operation                   | Request completed, job started   |

---

## What Gets Logged

### API Requests
```
[method] [route] [status] [duration]
POST /api/trades 201 45ms
GET  /api/analytics 500 1200ms
```

### Job Processing
```
Job started → OCR attempt → AI attempt → Confidence score → Job completed/failed
```

### Errors
```
Error message + Stack trace + Route + Method + User Agent + IP
```

---

## Common Debugging Scenarios

### 1. Trade Processing Failed
```bash
# Find all logs for this trade
grep "tradeId=YOUR_ID" backend/logs/combined.log

# Look for these patterns:
- "OCR attempt.*failed"
- "AI attempt.*failed"  
- "Job failed"
- "Validation failed"
```

### 2. API Endpoint Returning Errors
```bash
# Find errors in specific route
grep "route=/api/your-endpoint" backend/logs/error.log

# See full error details
grep -A 5 "Error in POST /api/your-endpoint" backend/logs/error.log
```

### 3. Slow Performance
```bash
# Find slow requests (>500ms)
grep "duration=" backend/logs/combined.log

# Find slow DB queries
grep "Slow DB query" backend/logs/combined.log
```

### 4. Repeated Job Failures
```bash
# Look for repeated failure warnings
grep "repeated failure" backend/logs/combined.log

# Critical failures (5+)
grep "exceeded max failures" backend/logs/combined.log
```

---

## Configuration

### .env File
```env
# Change log level
LOG_LEVEL=info    # error | warn | info | debug
```

### Log File Rotation
- Max size: 5MB per file
- Max files: 5
- Automatic rotation

---

## File Locations

```
backend/
├── utils/
│   ├── logger.js              # Centralized logger
│   └── jobFailureTracker.js   # Failure tracking
├── logs/
│   ├── combined.log           # All logs
│   └── error.log              # Errors only
├── workers/
│   └── ocrWorker.js           # Worker with logging
└── middleware/
    └── errorHandler.js        # Central error handling
```

---

## Key Features

✅ **Request Logging** - Every HTTP request tracked  
✅ **Response Times** - Performance monitoring  
✅ **Job Lifecycle** - Start → Process → Complete/Fail  
✅ **Error Tracking** - Full stack traces  
✅ **Failure Counting** - Repeated failures detected  
✅ **Queue Monitoring** - Job events tracked  
✅ **Lightweight** - Non-blocking async logging  

---

## Testing

```bash
# Run test script
node test_logging.js

# Check output
cat backend/logs/combined.log | tail -20
```

---

## Help

For detailed documentation, see:
- `LOGGING_GUIDE.md` - Complete usage guide
- `LOGGING_IMPLEMENTATION_SUMMARY.md` - What was changed

---

## Quick Tips

💡 **Debug a specific trade:**
```bash
grep "tradeId=abc123" backend/logs/combined.log
```

💡 **See only errors:**
```bash
tail -f backend/logs/error.log
```

💡 **Monitor live activity:**
```bash
tail -f backend/logs/combined.log
```

💡 **Find slow endpoints:**
```bash
grep "duration=" backend/logs/combined.log | sort -t'=' -k4 -n
```
