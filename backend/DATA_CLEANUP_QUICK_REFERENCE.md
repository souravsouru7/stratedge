# 🚀 Data Cleanup Quick Reference

## Retention Policy (Default)

| Field | Retention | Can Disable |
|-------|-----------|-------------|
| rawOCRText | 7 days | ✅ Yes |
| aiRawResponse | 7 days | ✅ Yes |
| Images | Disabled | ✅ Yes |

---

## Configuration (.env)

```env
# Enable cleanup
ENABLE_DATA_CLEANUP_CRON=true

# Schedule (daily at 3 AM)
DATA_CLEANUP_CRON_SCHEDULE=0 3 * * *

# Retention periods
CLEANUP_RAW_OCR_DAYS=7
CLEANUP_AI_RESPONSE_DAYS=7
CLEANUP_IMAGES_DAYS=0    # 0 = disabled

# Batch size
CLEANUP_BATCH_SIZE=100
```

---

## Commands

### Analyze Storage
```bash
node scripts/runDataCleanup.js analyze
```

### Dry Run (Test)
```bash
node scripts/runDataCleanup.js dry-run
```

### Actual Cleanup ⚠️
```bash
node scripts/runDataCleanup.js cleanup
```

---

## What Gets Deleted

### ✅ Will Be Emptied (after 7 days)
- `rawOCRText` → Set to `""`
- `aiRawResponse` → Set to `""`

### ❌ NEVER Touched
- All core trade data
- `extractedText` (preserved)
- `parsedData` (structured results)
- Image URLs (unless enabled)
- User psychology data
- Financial data

---

## Example Output

```
=== DATA CLEANUP JOB ===

✅ Connected to MongoDB

🧹 Starting cleanup...

📊 Summary:
   Duration: 4523ms
   Batches processed: 12
   Records scanned: 1156
   rawOCRText cleaned: 856
   aiRawResponse cleaned: 856
   Images deleted: 0
   Errors: 0

✅ Database connection closed
```

---

## Cron Schedule Examples

```bash
# Daily at 3 AM (default)
0 3 * * *

# Daily at midnight
0 0 * * *

# Every 6 hours
0 */6 * * *

# Weekly Sunday 2 AM
0 2 * * 0
```

---

## Monitor Logs

```bash
# View cleanup logs
grep "DATA CLEANUP" backend/logs/combined.log

# Real-time monitoring
tail -f backend/logs/combined.log | grep -i cleanup
```

---

## Safety Checklist

Before enabling cleanup:

- [ ] Reviewed retention policy
- [ ] Added env variables to `.env`
- [ ] Ran analysis (`analyze` command)
- [ ] Ran dry-run (`dry-run` command)
- [ ] Verified what would be deleted
- [ ] Have MongoDB backups
- [ ] Team notified of policy

---

## Performance Impact

**Typical Results:**
- 30-50% storage reduction
- Faster queries
- Smaller backups
- Better memory usage

**Example:**
```
Before: 81 MB
After:  40 MB
Saved:  41 MB (50%)
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Not running | Check `ENABLE_DATA_CLEANUP_CRON=true` |
| Too slow | Reduce `CLEANUP_BATCH_SIZE=50` |
| Memory issues | Use smaller batches + longer delays |
| Need longer retention | Increase `CLEANUP_RAW_OCR_DAYS=14` |

---

## Files Created

- ✅ `jobs/dataCleanupCron.js` - Main job logic
- ✅ `scripts/runDataCleanup.js` - Manual utility
- ✅ `DATA_CLEANUP_GUIDE.md` - Full documentation

---

## Quick Start

1. Add to `.env`:
```env
ENABLE_DATA_CLEANUP_CRON=true
CLEANUP_RAW_OCR_DAYS=7
CLEANUP_AI_RESPONSE_DAYS=7
```

2. Test:
```bash
node scripts/runDataCleanup.js dry-run
```

3. Enable & restart server

4. Monitor logs daily

Done! 🎉
