const { parseTradesFromOCR } = require('./backend/services/parsingService');

const text = `
NIFTY 24600 CE =%1,313:00
NSE | 21 Apr 2026 TP 26.85(-53.71%)
0 Overnight \vg 0.00
NIFTY 24500 CE ~%107.25
NSE | 21 Apr 202 LTP 49.05(-45.92%)
0 Intraday-BO A 0.00
`;

// Simulate the replacement
let preprocessed = text
  .replace(/([=~-])%/g, "-₹") // Replace =% ~% -% with -₹
  .replace(/(\d):(\d{2})(?!\d)/g, "$1.$2"); // Replace 1313:00 with 1313.00

console.log("Preprocessed:");
console.log(preprocessed);
console.log("\nParsed:");
console.log(JSON.stringify(parseTradesFromOCR(preprocessed, { broker: "Fyers" }), null, 2));
