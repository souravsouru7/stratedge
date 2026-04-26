# Extract Trade from Image

Test trade extraction on a screenshot using your vision — useful for debugging what data is visible before uploading.

Usage: `/extract-trade <image-url> [forex|indian]`

## Instructions

The user has provided: `$ARGUMENTS`

Parse the arguments: first token = image URL, second (optional) = market type (`forex` or `indian`, default `forex`).

**Step 1 — Analyze the image**

Look at the screenshot at the URL. Identify:
- Broker platform (Zerodha, Upstox, MetaTrader, TradingView, etc.)
- All visible trade fields

**Step 2 — Extract**

For **Forex**: pair, type (BUY/SELL), quantity/lots, entryPrice, exitPrice, profit, stopLoss, takeProfit, broker

For **Indian**: pair (e.g. "NIFTY 26000 PE"), optionType (CE/PE), strikePrice, underlying, quantity, entryPrice, exitPrice, profit, broker — plus all trades if multiple positions are visible

**Step 3 — Output this format**

```
## Extraction Result

**Broker detected:** <name or "unknown">

| Field       | Value   | Confidence        |
|-------------|---------|-------------------|
| pair        | EURUSD  | high              |
| type        | BUY     | high              |
| entryPrice  | 1.08500 | high              |
| profit      | null    | missing           |

**JSON:**
{ ... }

**Issues:**
- List any fields that were unclear, missing, or guessed
- Suggest screenshot improvements if needed (crop tighter, higher res, include P&L section)
```

Confidence: `high` = clearly visible, `medium` = inferred, `low` = guessed, `missing` = not in screenshot.
