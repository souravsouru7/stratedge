const text = `LTP 26.85 (-53.71%)`;
const match = text.match(/([+\-]\s*₹?\s*[\d,\s]+\.?\d*)(?!\s*%)/);
console.log(match);
