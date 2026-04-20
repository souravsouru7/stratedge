const text = `NSE | 21 Apr 2026 LTP 26.85 (-53.71%)`;
const textWithoutPercents = text.replace(/(?:\()?([+\-]?\s*[\d,]+\.?\d*\s*%)(?:\))?/g, "");
console.log(textWithoutPercents);
