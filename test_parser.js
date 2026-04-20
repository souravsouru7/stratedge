const { parseTradesFromOCR } = require('./backend/services/parsingService');

const text = `
Portfolio
Positions Holdings
Total P&L
-₹1,420.25
Smart exit Disabled
Exit

NIFTY 24600 CE -₹1,313.00
NSE | 21 Apr 2026 LTP 26.85 (-53.71%)
Qty 0 Overnight Avg 0.00

NIFTY 24500 CE -₹107.25
NSE | 21 Apr 2026 LTP 49.05 (-45.92%)
Qty 0 Intraday-BO Avg 0.00
`;

console.log(JSON.stringify(parseTradesFromOCR(text, { broker: "Fyers" }), null, 2));
