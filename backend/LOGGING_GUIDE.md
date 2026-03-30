# Logging & Monitoring Guide

This guide explains the structured logging and monitoring system implemented in the backend.

## Overview

The backend now uses **Winston** for structured logging and **Morgan** for HTTP request logging. All logs are written to:
- Console (with colors)
- `backend/logs/error.log` (errors only)
- `backend/logs/combined.log` (all logs)

## Log Levels

- **error**: Critical failures, job failures, API errors
- **warn**: Validation failures, low confidence scores, repeated job failures
- **info**: API requests, job processing, successful operations

## What Gets Logged

### 1. API Requests (via Morgan + Custom Middleware)

Every HTTP request is logged with:
- Method (GET, POST, etc.)
- Route/URL
- Response status code
- Response time (ms)
- User agent (for errors)

Example:
```
2026-03-30 10:15:30 [info]: API request | method=POST | route=/api/trades | status=201 | duration=45ms
```

### 2. OCR/AI Job Processing (Worker)

#### Job Lifecycle Events:
- **Job started**: When a job begins processing
- **OCR attempt started/failed**: Each OCR retry
- **AI attempt started/failed**: Each AI retry
- **Job completed successfully**: Successful processing
- **Job failed**: Processing failure with error details

Example:
```
2026-03-30 10:16:00 [info]: Job started | id=123 | tradeId=abc456
2026-03-30 10:16:05 [info]: OCR attempt 1 started
2026-03-30 10:16:08 [info]: OCR output | tradeId=abc456 | textLength=1234
2026-03-30 10:16:10 [info]: Confidence score | tradeId=abc456 | score=0.85
2026-03-30 10:16:15 [info]: Job completed successfully | id=123 | tradeId=abc456
```

### 3. Job Failures

Failed jobs are tracked with:
- Failure count per job
- Error message and stack trace
- Timestamp of each failure
- Trade ID for reference

Repeated failures (2+) trigger warnings.
Critical failures (5+) trigger errors.

### 4. Centralized Error Handling

All errors caught by the error handler are logged with:
- Error message
- Full stack trace
- Route where error occurred
- HTTP method
- User agent
- IP address

## Queue Monitoring

The OCR queue monitors these events:
- **waiting**: Job added to queue
- **active**: Job picked up by worker
- **completed**: Job finished successfully
- **failed**: Job failed
- **stalled**: Job stuck in processing
- **error**: Queue system error

## Configuration

### Environment Variables

Add to `.env`:

```env
# Logging
LOG_LEVEL=info  # Options: error, warn, info, debug
```

### Log File Rotation

- Maximum file size: 5MB
- Maximum files kept: 5
- Automatic rotation when size limit reached

## Viewing Logs

### Real-time Console Logs

```bash
# Backend server
npm run dev

# Worker (separate terminal)
npm run worker
```

### Log Files

```bash
# View all logs
tail -f backend/logs/combined.log

# View errors only
tail -f backend/logs/error.log

# Search logs
grep "tradeId=abc456" backend/logs/combined.log
```

## Debugging Common Issues

### 1. Job Processing Fails

Check logs for:
```
[error] Job failed | jobId=xxx | tradeId=yyy
[error] OCR attempt 1 failed
[error] AI attempt 2 failed
```

Look for:
- Error message and stack trace
- Which step failed (OCR or AI)
- Number of retries attempted

### 2. Low Confidence Scores

Logs will show:
```
[warn] Weak OCR detected | tradeId=xxx | switching to AI fallback mode
[warn] Validation failed after processing | tradeId=xxx | failures=...
```

### 3. Repeated Job Failures

```
[warn] Job repeated failure | jobId=xxx | tradeId=yyy | count=3
[error] Job exceeded max failures | jobId=xxx | tradeId=yyy
```

Check job failure tracker stats:
```javascript
const { jobFailureTracker } = require('./utils/jobFailureTracker');
console.log(jobFailureTracker.getStats());
```

## Performance Monitoring

### Slow Database Queries

Queries taking >500ms are logged:
```
[warn] [Performance] Slow DB query detected in getTrades: 750ms
```

### Slow API Requests

Check response times in API logs:
```
[info] API request | method=GET | route=/api/analytics | status=200 | duration=1200ms
```

## Best Practices

1. **Use appropriate log levels**:
   - `error`: Something broke
   - `warn`: Something might need attention
   - `info`: Normal operation

2. **Include context in logs**:
   - Always include tradeId, jobId when relevant
   - Add metadata objects for structured data

3. **Don't log sensitive data**:
   - No passwords, tokens, or PII
   - Use IDs instead of full objects when possible

4. **Monitor error patterns**:
   - Check `error.log` regularly
   - Look for repeated failures

## Troubleshooting

### Logs Not Appearing

1. Check LOG_LEVEL environment variable
2. Verify `backend/logs/` directory exists
3. Check file permissions

### Too Much Logging Noise

Increase LOG_LEVEL threshold:
```env
LOG_LEVEL=warn  # Only warnings and errors
```

### Need More Detail

Decrease LOG_LEVEL threshold:
```env
LOG_LEVEL=debug  # Everything including debug logs
```

## Architecture

```
server.js
  ├── morgan (HTTP request logging)
  ├── custom middleware (response time tracking)
  └── errorHandler (centralized error logging)

workers/ocrWorker.js
  ├── logger (job lifecycle events)
  └── jobFailureTracker (failure monitoring)

services/tradeProcessingService.js
  └── logger (OCR/AI processing steps)

queues/ocrQueue.js
  └── queue event listeners (queue monitoring)
```

## Metrics Available

### Job Failure Tracker Stats

```javascript
const { jobFailureTracker } = require('./utils/jobFailureTracker');

// Get current stats
const stats = jobFailureTracker.getStats();
// Returns:
{
  totalTracked: 10,
  repeatedFailures: 3,
  criticalJobs: [
    { jobId: '123', count: 5, tradeId: 'abc' }
  ]
}
```

## Next Steps (Optional Enhancements)

1. **Log Aggregation**: Consider services like Papertrail, Datadog, or ELK stack
2. **Alerting**: Set up alerts for critical errors
3. **Metrics Dashboard**: Grafana/Prometheus for real-time monitoring
4. **Distributed Tracing**: For tracking requests across services
