const text = `LTP 26.85 (-53.71%)`;
const match = text.match(/(?:^|[^\d])([+\-]\s*₹?\s*[\d,\s]+\.?\d*)(?!\s*[%0-9])/);
console.log(match);
