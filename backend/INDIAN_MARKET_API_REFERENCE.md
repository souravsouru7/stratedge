# Indian Market API Reference

## Quick Reference Guide

---

## 📊 FOREX MARKET ENDPOINTS

### Create Forex Trade
```http
POST /api/trades
Content-Type: application/json
Authorization: Bearer <token>

{
  "pair": "EURUSD",
  "type": "BUY",
  "entryPrice": 1.1000,
  "exitPrice": 1.1050,
  "profit": 50,
  "marketType": "Forex"  // REQUIRED
}
```

### Get Forex Trades
```http
GET /api/trades?marketType=Forex
Authorization: Bearer <token>
```

### Get Forex Analytics
```http
GET /api/analytics/summary?marketType=Forex
GET /api/analytics/weekly?marketType=Forex
GET /api/analytics/risk-reward?marketType=Forex
GET /api/analytics/distribution?marketType=Forex
GET /api/analytics/performance?marketType=Forex
GET /api/analytics/time-analysis?marketType=Forex
GET /api/analytics/quality?marketType=Forex
GET /api/analytics/drawdown?marketType=Forex
GET /api/analytics/ai-insights?marketType=Forex
GET /api/analytics/advanced?marketType=Forex
```

---

## 🇮🇳 INDIAN MARKET ENDPOINTS (Method 1 - Explicit)

### Create Indian Trade (Explicit)
```http
POST /api/trades
Content-Type: application/json
Authorization: Bearer <token>

{
  "pair": "NIFTY50",
  "type": "BUY",
  "entryPrice": 22000,
  "exitPrice": 22150,
  "profit": 1500,
  "marketType": "Indian_Market"  // REQUIRED
}
```

### Get Indian Trades (Explicit)
```http
GET /api/trades?marketType=Indian_Market
Authorization: Bearer <token>
```

### Get Indian Analytics (Explicit)
```http
GET /api/analytics/summary?marketType=Indian_Market
GET /api/analytics/weekly?marketType=Indian_Market
... (all analytics endpoints with ?marketType=Indian_Market)
```

---

## 🇮🇳 INDIAN MARKET ENDPOINTS (Method 2 - Dedicated Routes - RECOMMENDED)

### Create Indian Trade (Auto-tagged)
```http
POST /api/indian/trades
Content-Type: application/json
Authorization: Bearer <token>

{
  "pair": "BANKNIFTY",
  "type": "SELL",
  "entryPrice": 47000,
  "exitPrice": 46800,
  "profit": 2000
  // No marketType needed - auto-set to "Indian_Market"
}
```

### Get Indian Trades (Auto-filtered)
```http
GET /api/indian/trades
Authorization: Bearer <token>
// Auto-filters to Indian_Market only
```

### Get Single Trade (Both Markets)
```http
GET /api/indian/trades/:id
Authorization: Bearer <token>
// Works for both Forex and Indian Market trades
```

### Update Trade
```http
PUT /api/indian/trades/:id
Content-Type: application/json
Authorization: Bearer <token>

{
  "exitPrice": 22200,
  "profit": 2000
  // marketType preserved from original trade
}
```

### Delete Trade
```http
DELETE /api/indian/trades/:id
Authorization: Bearer <token>
// Works for both markets
```

---

### Indian Analytics (All Auto-filtered)
```http
GET /api/indian/analytics/summary
GET /api/indian/analytics/weekly
GET /api/indian/analytics/risk-reward
GET /api/indian/analytics/distribution
GET /api/indian/analytics/performance
GET /api/indian/analytics/time-analysis
GET /api/indian/analytics/quality
GET /api/indian/analytics/drawdown
GET /api/indian/analytics/ai-insights
GET /api/indian/analytics/advanced
```
**All automatically filtered for `marketType: "Indian_Market"`**

---

## ⚠️ IMPORTANT NOTES

### Breaking Changes
- **ALL** `/api/trades` requests now **REQUIRE** `marketType` query parameter
- **ALL** `/api/analytics/*` requests now **REQUIRE** `marketType` query parameter
- Requests without marketType will return **400 Bad Request**

### Error Responses

#### Missing marketType
```json
{
  "message": "marketType query parameter is required (Forex or Indian_Market)"
}
```

#### Invalid marketType
```json
{
  "message": "marketType must be Forex or Indian_Market"
}
```

### Valid marketType Values
- `"Forex"` - For currency pair trading
- `"Indian_Market"` - For Nifty/Bank Nifty trading

---

## 🧪 EXAMPLE cURL COMMANDS

### Create Forex Trade
```bash
curl -X POST http://localhost:5000/api/trades \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "pair": "EURUSD",
    "type": "BUY",
    "entryPrice": 1.1000,
    "profit": 50,
    "marketType": "Forex"
  }'
```

### Get Forex Trades
```bash
curl -X GET "http://localhost:5000/api/trades?marketType=Forex" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create Indian Trade (Dedicated Route)
```bash
curl -X POST http://localhost:5000/api/indian/trades \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "pair": "NIFTY50",
    "type": "BUY",
    "entryPrice": 22000,
    "profit": 1500
  }'
```

### Get Indian Analytics (Dedicated Route)
```bash
curl -X GET "http://localhost:5000/api/indian/analytics/summary" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📝 EXAMPLE JAVASCRIPT FETCH

### Forex
```javascript
// Get trades
const forexTrades = await fetch('http://localhost:5000/api/trades?marketType=Forex', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Get analytics
const forexSummary = await fetch('http://localhost:5000/api/analytics/summary?marketType=Forex', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Indian Market (Dedicated Routes - Recommended)
```javascript
// Get trades (auto-filtered)
const indianTrades = await fetch('http://localhost:5000/api/indian/trades', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Get analytics (auto-filtered)
const indianSummary = await fetch('http://localhost:5000/api/indian/analytics/summary', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

---

## 🎯 RECOMMENDED APPROACH

For **simplest integration**, use the dedicated Indian Market routes:

| Operation | Forex Route | Indian Market Route |
|-----------|-------------|---------------------|
| Create Trade | `POST /api/trades` + marketType | `POST /api/indian/trades` (auto-tagged) |
| Get Trades | `GET /api/trades?marketType=Forex` | `GET /api/indian/trades` (auto-filtered) |
| Analytics | `GET /api/analytics/*?marketType=Forex` | `GET /api/indian/analytics/*` (auto-filtered) |

**Benefits of Dedicated Routes:**
- ✅ No need to remember marketType parameter
- ✅ Cleaner, more readable code
- ✅ Less chance of bugs
- ✅ Self-documenting API calls

---

## 🔐 Authentication

All endpoints require JWT authentication via the `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

Tokens are obtained through the login endpoint:
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

---

**Version**: 1.0  
**Last Updated**: Phase 1 Backend Implementation
