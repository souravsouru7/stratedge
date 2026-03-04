const { parseTrade } = require("./services/parsingService");

const finalTest = `
7:39 History All symbols
POSITIONS
Profit: 102.17
Deposit 0.00
Swap: 0.00
Commission: -3.10
Balance: 99.07
USDJPY.x, buy 0.62 2026.03.02 14:18:00
156.907 → 157.166 102.17
#66197136 Open: 2026.03.02 12:16:44
S / L: 156.923 Swap: 0.00
T / P: 157.166 Commission: -3.10
`;

const result = parseTrade(finalTest);
console.log("Parsed Result:", JSON.stringify(result, null, 2));

const expected = {
    exitPrice: 157.166,
    takeProfit: 157.166
};

if (result.exitPrice === expected.exitPrice && result.takeProfit === expected.takeProfit) {
    console.log("SUCCESS: Final validation passed! Exit Price and T/P are correct.");
} else {
    console.error("FAILURE: Data mismatch.");
    process.exit(1);
}
