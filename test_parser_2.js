const { parseTradesFromOCR } = require('./backend/services/parsingService');

const text = `
NIFTY 24600 CE
-1313.00
NSE | 21 Apr 2026 LTP 26.85 (-53.71)
Qty 0 Overnight Avg 0.00
`;

console.log(JSON.stringify(parseTradesFromOCR(text, { broker: "Fyers" }), null, 2));
