/**
 * Test Script: parseTradesFromOCR – Multi-Trade Indian Market Parser
 *
 * Run:  node test_parse_trades_ocr.js
 */

const { parseTradesFromOCR } = require("./services/parsingService");

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${label}`);
    failed++;
  }
}

// ─── Sample 1: Two NIFTY positions (matches the user's screenshot) ───
console.log("\n--- Sample 1: Two NIFTY option positions ---");
const sample1 = `
Portfolio
Positions   Holdings
Total P&L
+₹650.00
Smart Exit    Disabled
Exit all
NIFTY 26200 CE            +₹325.00
NSE  |  6 Jan 2026       LTP 136.00 (-9.90%)
Qty 0   Intraday-BO                  Avg 0.00

NIFTY 26400 PE            +₹325.00
NSE  |  6 Jan 2026       LTP 110.65 (+1.10%)
Qty 0   Intraday-BO                  Avg 0.00

Markets  Watchlist  Portfolio  Orders  Options
`;

const result1 = parseTradesFromOCR(sample1);
console.log("  Trades found:", result1.length);
assert(result1.length === 2, "Should find 2 trades");
assert(result1[0].symbol === "NIFTY", "Trade 1 symbol = NIFTY");
assert(result1[0].strike === 26200, "Trade 1 strike = 26200");
assert(result1[0].optionType === "CE", "Trade 1 optionType = CE");
assert(result1[0].pnl === 325, "Trade 1 pnl = 325");
assert(result1[1].symbol === "NIFTY", "Trade 2 symbol = NIFTY");
assert(result1[1].strike === 26400, "Trade 2 strike = 26400");
assert(result1[1].optionType === "PE", "Trade 2 optionType = PE");
assert(result1[1].pnl === 325, "Trade 2 pnl = 325");

// ─── Sample 2: Single BANKNIFTY position ──────────────────────────
console.log("\n--- Sample 2: Single BANKNIFTY position ---");
const sample2 = `
Total P&L
-₹1200.50
BANKNIFTY 48000 CE         -₹1200.50
NSE  |  10 Feb 2026
Qty 25   Intraday
LTP 210.30   Avg 258.32
`;

const result2 = parseTradesFromOCR(sample2);
console.log("  Trades found:", result2.length);
assert(result2.length === 1, "Should find 1 trade");
assert(result2[0].symbol === "BANKNIFTY", "Symbol = BANKNIFTY");
assert(result2[0].strike === 48000, "Strike = 48000");
assert(result2[0].optionType === "CE", "OptionType = CE");
assert(result2[0].quantity === 25, "Quantity = 25");
assert(result2[0].pnl === -1200.50, "PNL = -1200.50");

// ─── Sample 3: OCR with typos and noise ───────────────────────────
console.log("\n--- Sample 3: OCR with typos (N1FTY, extra spaces) ---");
const sample3 = `
Portfolio
Total P & L
+₹ 800.00
N1FTY  26200  CE    +₹500.00
NSE  15 Jan 2026
Qty 50    LTP 150.00
Avg  125.00

NIFTY  26400 PE   +₹300.00
QTY  50
LTP 90.00   Avg 84.00
`;

const result3 = parseTradesFromOCR(sample3);
console.log("  Trades found:", result3.length);
assert(result3.length === 2, "Should find 2 trades despite OCR typos");
assert(result3[0].symbol === "NIFTY", "N1FTY corrected to NIFTY");
assert(result3[0].strike === 26200, "Strike = 26200");
assert(result3[0].quantity === 50, "Qty = 50");
assert(result3[0].pnl === 500, "P&L = +500");
assert(result3[1].optionType === "PE", "Trade 2 optionType = PE");
assert(result3[1].quantity === 50, "Trade 2 Qty = 50 (from QTY label)");

// ─── Sample 4: Empty / null input ─────────────────────────────────
console.log("\n--- Sample 4: Edge cases ---");
assert(parseTradesFromOCR("").length === 0, "Empty string returns []");
assert(parseTradesFromOCR(null).length === 0, "null returns []");
assert(parseTradesFromOCR("Hello world random text").length === 0, "No contract patterns returns []");

// ─── Sample 5: FINNIFTY with Profit label ─────────────────────────
console.log("\n--- Sample 5: FINNIFTY with explicit Profit label ---");
const sample5 = `
FINNIFTY 20000 PE
Profit: -450.00
Quantity: 40
`;

const result5 = parseTradesFromOCR(sample5);
assert(result5.length === 1, "Should find 1 FINNIFTY trade");
assert(result5[0].symbol === "FINNIFTY", "Symbol = FINNIFTY");
assert(result5[0].strike === 20000, "Strike = 20000");
assert(result5[0].optionType === "PE", "OptionType = PE");
assert(result5[0].pnl === -450, "PNL = -450");
assert(result5[0].quantity === 40, "Quantity = 40");

// ─── Sample 6: DHAN closed positions (no "+" for profit) ─────────
console.log("\n--- Sample 6: Dhan closed positions layout ---");
const sample6 = `
Positions
Overall P&L
₹ -190.00 on 3 positions
Closed Positions

NIFTY 14 NOV 24000 PUT
Qty. 50 x 83.00 NSE
-717.50
Closed

NIFTY 14 NOV 24000 PUT
Qty. 25 x 80.00 NSE
-472.50
Closed

NIFTY 14 NOV 24100 PUT
Qty. 50 x 76.80 NSE
1,000.00
Closed
`;

const result6 = parseTradesFromOCR(sample6, { broker: "Dhan" });
console.log("  Trades found:", result6.length);
assert(result6.length === 3, "Should find 3 Dhan trades");
assert(result6[0].symbol === "NIFTY", "Dhan Trade 1 symbol = NIFTY");
assert(result6[0].strike === 24000, "Dhan Trade 1 strike = 24000");
assert(result6[0].optionType === "PE", "Dhan Trade 1 optionType = PE (PUT -> PE)");
assert(result6[0].quantity === 50, "Dhan Trade 1 quantity = 50");
assert(result6[0].entryPrice === 83.00, "Dhan Trade 1 entryPrice = 83.00");
assert(result6[0].pnl === -717.50, "Dhan Trade 1 pnl = -717.50");
assert(result6[2].strike === 24100, "Dhan Trade 3 strike = 24100");
assert(result6[2].pnl === 1000.00, "Dhan Trade 3 pnl = 1000.00 (no '+')");

// ─── Sample 7: Spaced underlyings / index aliases (BANK NIFTY, NIFTY 50) ──
console.log("\n--- Sample 7: Spaced underlyings / NIFTY 50 alias ---");
const sample7 = `
Total P&L
+₹1500.00
BANK NIFTY  48000  CE     +₹1500.00
NSE  |  10 Feb 2026
Qty 25
LTP 210.30   Avg 150.32

NIFTY 50  26200  PE     -₹250.00
Qty 50
Avg  90.00
LTP 85.00
`;
const result7 = parseTradesFromOCR(sample7);
console.log("  Trades found:", result7.length);
assert(result7.length === 2, "Should find 2 trades (spaced underlyings)");
assert(result7[0].symbol === "BANKNIFTY", "BANK NIFTY corrected to BANKNIFTY");
assert(result7[0].strike === 48000, "BANKNIFTY strike = 48000");
assert(result7[0].optionType === "CE", "BANKNIFTY optionType = CE");
assert(result7[1].symbol === "NIFTY", "NIFTY 50 corrected to NIFTY");
assert(result7[1].strike === 26200, "NIFTY strike = 26200");
assert(result7[1].optionType === "PE", "NIFTY optionType = PE");

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} assertions`);
if (failed === 0) {
  console.log("🎉 All tests passed!");
} else {
  console.log("⚠️  Some tests failed – check output above.");
  process.exit(1);
}
