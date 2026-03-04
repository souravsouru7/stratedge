const { parseTrade } = require("./services/parsingService");

// Simulating potential variations in OCR output for the same image
const samples = [
    {
        name: "Standard Arrow",
        text: "USDJPY.x, buy 0.62\n156.907 → 157.166\nS / L: 156.923 Swap: 0.00\nT / P: 157.166 Commission: -3.10"
    },
    {
        name: "Dash instead of Arrow",
        text: "USDJPY.x, buy 0.62\n156.907 -> 157.166\nS / L: 156.923 Swap: 0.00\nT / P: 157.166 Commission: -3.10"
    },
    {
        name: "No arrow, just space",
        text: "USDJPY.x, buy 0.62\n156.907 157.166\nS / L: 156.923 Swap: 0.00\nT / P: 157.166 Commission: -3.10"
    },
    {
        name: "Dots for separators",
        text: "USDJPY.x, buy 0.62\n156.907... 157.166\nS / L: 156.923 Swap: 0.00\nT / P: 157.166 Commission: -3.10"
    },
    {
        name: "T/P with extra spaces or slightly different format",
        text: "T/P: 157.166\nS/L: 156.923"
    }
];

samples.forEach(sample => {
    console.log(`--- Testing: ${sample.name} ---`);
    const result = parseTrade(sample.text);
    console.log("Exit Price:", result.exitPrice);
    console.log("Take Profit:", result.takeProfit);
    if (result.exitPrice === 157.166 && result.takeProfit === 157.166) {
        console.log("PASS");
    } else {
        console.log("FAIL");
    }
});
