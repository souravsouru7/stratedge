const { parseTradesFromOCR } = require('./backend/services/parsingService');

const text = `
NIFTY 24600 CE -₹1,313.00
NSE | 21 Apr 2026 TP 26.85
0 Overnight \vg 0.00
NIFTY 24500 CE -₹107.25
NSE | 21 Apr 202 LTP 49.05
0 Intraday-BO A 0.00
`;

console.log(JSON.stringify(parseTradesFromOCR(text, { broker: "Fyers" }), null, 2));
