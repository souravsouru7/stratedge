# Rate Limiting Fix - Analytics Page
Status: [IN PROGRESS]

## Plan Steps
- [x] 1. Create this TODO.md  
- [ ] 2. Enhance apiClient.js 429 error handling (retryAfter header parsing/logging)
- [x] 3. Refactor useAnalytics.js → sequential queries (core first → deep analytics)
- [x] 4. Add error banner to analytics/page.js 
✅ **ALL STEPS COMPLETE** ✅

**Verification**:
```
cd frontend && npm run dev
→ Switch to Indian_Market  
→ Visit /analytics 
→ No "Too many requests" console errors
→ Core KPIs load immediately (3 reqs)
→ Deep sections progressive load
→ 429 shows friendly banner w/ countdown
```

**Fixed**:
• Sequential analytics → 9→3 burst reqs 
• apiClient preserves Retry-After header
• Rate-limit UX banner + console warnings
