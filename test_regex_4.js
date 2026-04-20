const testCases = [
  "LTP 26.85 (-53.71%)",
  "LTP 26.85 (-53.71 %)",
  "SENSEX +232.19 (0.28%)",
  "NIFTY +66.25 (+0.26%)",
  "-53.71%",
  "(53.71%)",
];

const regex = /\(?\s*[+\-]?\s*[\d,]+\.?\d*\s*%\s*\)?/g;

for (const t of testCases) {
  console.log(`Original: ${t}`);
  console.log(`Cleaned:  ${t.replace(regex, " ")}`);
  console.log("---");
}
