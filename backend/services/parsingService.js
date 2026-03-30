function parseForexLot(rawLot) {
  if (rawLot == null) return null;
  const cleaned = String(rawLot)
    .replace(/[Oo]/g, "0")
    .replace(/[Il]/g, "1")
    .replace(/,/g, ".")
    .replace(/\s+/g, "")
    .trim();

  if (!cleaned) return null;
  const numeric = parseFloat(cleaned);
  if (Number.isNaN(numeric)) return null;

  if (!cleaned.includes(".") && numeric >= 100) {
    return numeric / 100;
  }

  return numeric;
}

function safePositiveNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

function safeSignedNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

const KNOWN_FOREX_SYMBOLS = [
  "EURUSD", "USDJPY", "GBPUSD", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD",
  "EURJPY", "GBPJPY", "EURGBP", "EURAUD", "EURCAD", "EURCHF", "EURNZD",
  "AUDJPY", "AUDCAD", "AUDCHF", "AUDNZD", "CADJPY", "CADCHF", "CHFJPY",
  "GBPAUD", "GBPCAD", "GBPCHF", "GBPNZD", "NZDJPY", "NZDCAD", "NZDCHF",
  "XAUUSD", "XAGUSD", "BTCUSD", "ETHUSD",
];

function normalizeForexPair(rawPair) {
  if (!rawPair) return null;

  const original = String(rawPair).toUpperCase();
  const compact = original.replace(/\s+/g, "");
  const suffixMatch = compact.match(/(\.[A-Z0-9]+)$/);
  const suffix = suffixMatch ? suffixMatch[1] : "";
  const base = suffix ? compact.slice(0, -suffix.length) : compact;
  const compactAlphaNum = compact.replace(/[^A-Z0-9]/g, "");

  if (KNOWN_FOREX_SYMBOLS.includes(base)) {
    return `${base}${suffix}`;
  }

  const ocrFixed = compactAlphaNum
    .replace(/0/g, "O")
    .replace(/1/g, "I")
    .replace(/5/g, "S");

  for (const symbol of KNOWN_FOREX_SYMBOLS) {
    const suffixGuess = compact.includes(`${symbol}.X`) || compact.includes(`${symbol}X`) || compact.endsWith(`${symbol}X`)
      ? ".X"
      : suffix;

    if (compact.includes(symbol) || ocrFixed.includes(symbol)) {
      return `${symbol}${suffixGuess}`;
    }
  }

  let best = null;
  for (const symbol of KNOWN_FOREX_SYMBOLS) {
    if (symbol.length !== ocrFixed.length) continue;
    let mismatches = 0;
    for (let i = 0; i < symbol.length; i += 1) {
      if (symbol[i] !== ocrFixed[i]) mismatches += 1;
      if (mismatches > 1) break;
    }
    if (mismatches <= 1) {
      best = symbol;
      break;
    }
  }

  return `${best || ocrFixed}${suffix}`;
}

function extractForexHeader(line) {
  const normalizedLine = String(line || "")
    .replace(/\s+/g, " ")
    .trim();
  const actionMatch = normalizedLine.match(/\b(buy|sell)\b\s*([0-9OoIl.,]+)\b/i);
  if (!actionMatch) return null;

  const action = actionMatch[1].toLowerCase();
  const lotSize = parseForexLot(actionMatch[2]);
  const actionIndex = actionMatch.index ?? 0;
  const leftSide = normalizedLine.slice(0, actionIndex).trim();
  const rightSide = normalizedLine.slice(actionIndex + actionMatch[0].length).trim();
  const pair = normalizeForexPair(leftSide) || normalizeForexPair(rightSide) || normalizeForexPair(normalizedLine);

  if (!pair || !action || lotSize == null) return null;
  return { pair, action, lotSize };
}

function normalizeForexLevel(value, reference) {
  if (value == null || reference == null) return value;
  if (!Number.isFinite(value) || !Number.isFinite(reference)) return value;

  const largePair = Math.abs(reference) >= 100;
  const maxDiff = largePair ? 5 : 1;
  if (Math.abs(value - reference) <= maxDiff) return value;

  if (largePair) {
    const integerPart = Math.trunc(reference);
    const decimals = String(value).includes(".") ? String(value).split(".")[1] : "";
    if (decimals) {
      const candidate = parseFloat(`${integerPart}.${decimals}`);
      if (Number.isFinite(candidate) && Math.abs(candidate - reference) <= maxDiff) {
        return candidate;
      }
    }
  }

  return value;
}

function normalizeForexTrade(trade) {
  if (!trade || trade.entryPrice == null || trade.exitPrice == null) return trade;

  const entry = trade.entryPrice;
  const exit = trade.exitPrice;
  const action = String(trade.action || "").toLowerCase();
  const signedTrade = { ...trade };

  if (signedTrade.stopLoss != null) {
    signedTrade.stopLoss = normalizeForexLevel(signedTrade.stopLoss, entry);
  }
  if (signedTrade.takeProfit != null) {
    signedTrade.takeProfit = normalizeForexLevel(signedTrade.takeProfit, entry);
  }

  if (signedTrade.profit != null) {
    const isLoss = action === "sell" ? exit > entry : exit < entry;
    signedTrade.profit = isLoss ? -Math.abs(signedTrade.profit) : Math.abs(signedTrade.profit);
  }

  if (signedTrade.commission != null) {
    signedTrade.commission = -Math.abs(signedTrade.commission);
  }

  return signedTrade;
}

function extractForexPriceData(line) {
  const source = String(line || "").trim();
  if (!source) return null;
  if (!/^\d/.test(source) && !/^-?\d/.test(source)) return null;
  if (/^(#|S\s*\/?\s*L|T\s*\/?\s*P|TIP|Open|Swap|Commission|Balance|Profit)/i.test(source)) return null;

  const decimalMatches = source.match(/-?\d+\.\d+/g) || [];
  if (decimalMatches.length < 2) return null;

  const entry = parseFloat(decimalMatches[0]);
  const exit = parseFloat(decimalMatches[1]);
  const pnl = decimalMatches.length >= 3 ? parseFloat(decimalMatches[decimalMatches.length - 1]) : null;

  if (Number.isNaN(entry) || Number.isNaN(exit)) return null;

  return {
    entryPrice: entry,
    exitPrice: exit,
    profit: Number.isNaN(pnl) ? null : pnl,
  };
}

exports.parseTrade = (text) => {
  // Normalize text to simplify matching
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  let pair = null;
  let lotSize = null;
  let entryPrice = null;
  let exitPrice = null;
  let profit = null;
  let action = null;
  let commission = null;
  let balance = null;
  let swap = null;
  let stopLoss = null;
  let takeProfit = null;
  let openTime = null;
  let ticket = null;

  const getSession = (timeStr) => {
    if (!timeStr) return "Unknown";
    const match = timeStr.match(/(\d{2}):(\d{2})/);
    if (!match) return "Unknown";
    const hour = parseInt(match[1]);
    if (hour >= 8 && hour < 13) return "London";
    if (hour >= 13 && hour < 21) return "New York";
    if (hour >= 21 || hour < 8) return "Asian";
    return "Asian";
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] || "";

    // Symbol, Action, Lot
    const forexHeader = extractForexHeader(line);
    if (forexHeader) {
      pair = forexHeader.pair;
      action = forexHeader.action;
      lotSize = forexHeader.lotSize;
      continue;
    }

    // Prices (More robust: handles arrow, dots, dashes, or just spaces)
    const priceData = extractForexPriceData(line);
    if (priceData) {
      entryPrice = priceData.entryPrice;
      exitPrice = priceData.exitPrice;
      if (!profit && priceData.profit != null) profit = priceData.profit;
      continue;
    }

    // SL / TP (More robust: handles missing colons, different slash spacing)
    const slMatch = line.match(/S\s*\/?\s*L[:\s]*(\d+\.\d+)/i);
    if (slMatch) stopLoss = slMatch[1];
    else if (/^S\s*\/?\s*L[:\s]*$/i.test(line)) {
      const nextValue = nextLine.match(/^(\d+\.\d+)$/);
      if (nextValue) stopLoss = nextValue[1];
    }

    const tpMatch = line.match(/(?:T\s*\/?\s*P|TIP)[:\s]*(\d+\.\d+)/i);
    if (tpMatch) takeProfit = tpMatch[1];
    else if (/^(?:T\s*\/?\s*P|TIP)[:\s]*$/i.test(line)) {
      const nextValue = nextLine.match(/^(\d+\.\d+)$/);
      if (nextValue) takeProfit = nextValue[1];
    }

    // Swap / Commission
    const lineSwapMatch = line.match(/Swap[:\s]*(-?\d+\.\d+|-?\d+)/i);
    if (lineSwapMatch) swap = lineSwapMatch[1];
    else if (/^Swap[:\s]*$/i.test(line)) {
      const nextValue = nextLine.match(/^(-?\d+\.\d+|-?\d+)$/);
      if (nextValue) swap = nextValue[1];
    }

    const lineCommMatch = line.match(/Commission[:\s]*(-?\d+\.\d+|-?\d+)/i);
    if (lineCommMatch) commission = lineCommMatch[1];
    else if (/^Commission[:\s]*$/i.test(line)) {
      const nextValue = nextLine.match(/^(-?\d+\.\d+|-?\d+)$/);
      if (nextValue) commission = nextValue[1];
    }

    // Balance
    const balanceMatch = line.match(/Balance[:\s]*(-?\d+\.\d+|-?\d+)/i);
    if (balanceMatch) balance = balanceMatch[1];
    else if (/^Balance[:\s]*$/i.test(line)) {
      const nextValue = nextLine.match(/^(-?\d+\.\d+|-?\d+)$/);
      if (nextValue) balance = nextValue[1];
    }

    // Open Time
    const openTimeMatch = line.match(/Open[:\s]*(\d{4}\.\d{2}\.\d{2}\s*\d{2}:\d{2}:\d{2})/i);
    if (openTimeMatch) openTime = openTimeMatch[1];
    else if (/^Open[:\s]*$/i.test(line)) {
      const nextValue = nextLine.match(/^(\d{4}\.\d{2}\.\d{2}\s*\d{2}:\d{2}:\d{2})$/);
      if (nextValue) openTime = nextValue[1];
    }

    // Profit summary
    const summaryProfitMatch = line.match(/^Profit[:\s]*(-?\d+\.\d+|-?\d+)/i);
    if (summaryProfitMatch && !profit) profit = summaryProfitMatch[1];

    const ticketMatch = line.match(/#\s*(\d{6,})|\b(\d{6,})\b/);
    if (ticketMatch && !ticket) ticket = ticketMatch[1] || ticketMatch[2];

    // Individual profit fallback
    if (!profit && line.match(/^(-?\d+\.\d+|-?\d+)$/)) {
      // If it's the large number after a price line or symbol line
      if (i > 0 && lines[i - 1].match(/(\d+\.\d+)\s*(?:->|→|[-\.\s]+)\s*(\d+\.\d+)/)) {
        profit = line;
      }
    }
  }

  return normalizeForexTrade({
    ticket: ticket || null,
    pair: pair || null,
    action: action || null,
    lotSize: lotSize != null ? safePositiveNumber(lotSize) : null,
    entryPrice: entryPrice != null ? safePositiveNumber(entryPrice) : null,
    exitPrice: exitPrice != null ? safePositiveNumber(exitPrice) : null,
    profit: profit != null ? safeSignedNumber(profit) : null,
    commission: commission != null ? safeSignedNumber(commission) : null,
    balance: balance != null ? safeSignedNumber(balance) : null,
    swap: swap != null ? safeSignedNumber(swap) : null,
    stopLoss: stopLoss != null ? safePositiveNumber(stopLoss) : null,
    takeProfit: takeProfit != null ? safePositiveNumber(takeProfit) : null,
    session: getSession(openTime)
  });
};

exports.parseForexTradesFromOCR = (text) => {
  if (!text || typeof text !== "string") return [];

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const blocks = [];
  let currentBlock = null;
  const detectedHeaders = [];

  for (const line of lines) {
    const forexHeader = extractForexHeader(line);
    if (forexHeader) {
      currentBlock = [line];
      blocks.push(currentBlock);
      detectedHeaders.push(`${forexHeader.pair}, ${forexHeader.action} ${forexHeader.lotSize}`);
      continue;
    }

    if (currentBlock) {
      currentBlock.push(line);
    }
  }

  console.log("[Forex Parser] Total OCR lines:", lines.length);
  console.log("[Forex Parser] Detected trade headers:", detectedHeaders.length);
  if (detectedHeaders.length > 0) {
    detectedHeaders.forEach((header, index) => {
      console.log(`[Forex Parser] Header ${index + 1}: ${header}`);
    });
  }

  if (blocks.length === 0) return [];

  const parsed = blocks
    .map((block, index) => {
      console.log(`[Forex Parser] Block ${index + 1} lines (${block.length}):`, JSON.stringify(block));
      const trade = exports.parseTrade(block.join("\n"));
      console.log(`[Forex Parser] Parsed trade ${index + 1}:`, JSON.stringify(trade));
      return trade;
    })
    .filter((trade) => trade.pair && (trade.entryPrice != null || trade.profit != null));

  console.log("[Forex Parser] Final parsed trades count:", parsed.length);
  return parsed;
};

// Common OCR typos: strike price correction for Indian indices
const STRIKE_CORRECTIONS = {
  "2100": "26000", "21000": "26000", "2600": "26000", "2610": "26100", "4700": "47000",
};
const UNDERLYING_STRIKE_RANGES = {
  NIFTY: [22000, 27000], BANKNIFTY: [45000, 52000], FINNIFTY: [19000, 22000],
  MIDCPNIFTY: [9000, 12000], SENSEX: [75000, 95000],
};
function correctStrikeOcrTypo(underlying, rawStrike) {
  if (!rawStrike || !underlying) return rawStrike;
  const u = String(underlying).toUpperCase().replace(/\s+/g, "");
  const strike = parseFloat(String(rawStrike).replace(/[^\d]/g, ""));
  if (Number.isNaN(strike)) return rawStrike;
  const range = UNDERLYING_STRIKE_RANGES[u] || UNDERLYING_STRIKE_RANGES.NIFTY;
  if (strike >= range[0] && strike <= range[1]) return String(strike);
  const corrected = STRIKE_CORRECTIONS[String(strike)];
  if (corrected) return corrected;
  
  // Nifty specific corrections for common OCR swaps
  if (u === "NIFTY") {
    if (strike === 62000) return "26200";
    if (strike === 64000) return "26400";
    if (strike < 10000 && strike >= 2000) return String(strike * 10);
    if (strike < 1000) return String(strike * 100);
  }
  return String(strike);
}
function fixInstrumentOcrTypos(line) {
  return line
    .replace(/N1FTY|NIFT[Y1]|NlFTY/gi, "NIFTY")
    // Underlying spacing / OCR variants
    .replace(/\bNIFTY\s*50\b/gi, "NIFTY")
    .replace(/BANKN1FTY|BANK\s*N1FTY|\bBANK\s*NIFTY\b/gi, "BANKNIFTY")
    .replace(/\bFIN\s*NIFTY\b/gi, "FINNIFTY")
    .replace(/\bMID\s*CP\s*NIFTY\b/gi, "MIDCPNIFTY")
    .replace(/\bMIDCP\s*NIFTY\b/gi, "MIDCPNIFTY")
    .replace(/0(9|g|q|O)th|0(9|g)TH|09lh|0glh|O9th/gi, "09th")
    .replace(/\s*[©®™●·○]\s*/g, " ")
    .replace(/@/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumberWithSpaces(s) {
  if (!s || typeof s !== "string") return NaN;
  const cleaned = s.replace(/\s+/g, "").replace(/,/g, "");
  return parseFloat(cleaned);
}

/**
 * Robust P&L Cleaning
 * Handles cases where ₹ is misread as '3' or '2' at the start of a number.
 * e.g., "+3325.00" -> 325.00 if we detect inflation.
 */
function cleanPnLValue(raw) {
  if (!raw) return null;
  // Remove currency symbols and spaces
  let s = raw.replace(/[₹\s,]/g, "");
  
  // Regex to detect a digit prepended by OCR misreading symbol
  const signMatch = raw.match(/[+\-]/);
  const sign = signMatch ? signMatch[0] : "";
  
  // If it starts with +3 or -3 or +2 or -2 followed by more digits
  if (sign && s.match(/^[+\-][32]\d{3,}\.?\d*$/)) {
    // Strip the char at index 1 (the '3' or '2')
    const stripped = s[0] + s.substring(2);
    const originalVal = Math.abs(parseFloat(s));
    
    // Heuristic: If it's a "3" prefix and the result is more plausible
    // or if the first two digits are both 3 (very common OCR error for ₹3)
    if (s[1] === '3' && (s[2] === '3' || originalVal > 3000)) {
       return parseFloat(stripped);
    }
  }

  const parsed = parseFloat(s);
  return Number.isNaN(parsed) ? null : parsed;
}

function looksLikeIndianInstrument(line) {
  const s = fixInstrumentOcrTypos(String(line || ""));
  const hasStrike = /\b\d{4,5}\b/.test(s);
  const hasType = /\b(CE|PE|CALL|PUT|FUT)\b/i.test(s);
  const hasUnderlying = /\b(NIFTY|BANKNIFTY|FINNIFTY|MIDCPNIFTY|SENSEX|BANKEX)\b/i.test(s);
  return (hasStrike && hasType) || (hasUnderlying && hasType);
}

// Indian broker detection + label normalization (different brokers use different field names)
const BROKER_KEYWORDS = [
  {
    broker: "Zerodha",
    patterns: [
      /zerodha/i,
      /zer0dha/i, // OCR: o -> 0
      /\bkite\b/i,
      /kite\s*by\s*zerodha/i,
      /rainmatter/i,
      /coin\s*by\s*zerodha/i,
      /console\s*zerodha/i,
    ],
  },
  {
    broker: "Upstox",
    patterns: [
      /upstox/i,
      /upst0x/i, // OCR: o -> 0
      /upstox\s*pro/i,
      /rksv/i,
      /rk\s*sv/i,
    ],
  },
  {
    broker: "Angel One",
    patterns: [
      /angel\s*one/i,
      /angel\s*broking/i,
      /angel\s*brok/i, // OCR truncation
      /\bsmartapi\b/i,
      /\bangel\s*trade\b/i,
      /\bangel\s*eye\b/i,
    ],
  },
  {
    broker: "ICICI Direct",
    patterns: [
      /icici\s*direct/i,
      /icici\s*securities/i,
      /icicidirect/i,
      /icici\s*dir(e|c)t/i, // OCR swap
    ],
  },
  {
    broker: "Groww",
    patterns: [
      /\bgroww\b/i,
      /groww\s*app/i,
    ],
  },
  {
    broker: "Dhan",
    patterns: [
      /\bdhan\b/i,
      /dhan\.?co/i,
      /dhan\s*hq/i,
      /dhan\s*trader/i,
    ],
  },
  {
    broker: "Fyers",
    patterns: [
      /\bfyers\b/i,
      /fyers\s*one/i,
      /fyers\s*markets/i,
    ],
  },
  {
    broker: "5paisa",
    patterns: [
      /\b5paisa\b/i,
      /\b5\s*paisa\b/i,
      /\bfive\s*paisa\b/i,
    ],
  },
  {
    broker: "Kotak",
    patterns: [
      /\bkotak\b/i,
      /kotak\s*securities/i,
      /kotak\s*sec/i,
      /kotak\s*neo/i,
      /\bneo\s*kotak\b/i,
    ],
  },
  {
    broker: "Paytm Money",
    patterns: [
      /paytm\s*money/i,
      /\bpaytmmoney\b/i,
    ],
  },
];

function canonicalizeBroker(raw) {
  const t = String(raw || "").trim();
  if (!t) return null;
  if (t.toUpperCase() === "AUTO") return null;
  for (const { broker, patterns } of BROKER_KEYWORDS) {
    if (broker.toLowerCase() === t.toLowerCase()) return broker;
    if (patterns.some((re) => re.test(t))) return broker;
  }
  return t;
}

function detectBroker(text) {
  const t = String(text || "").toLowerCase();
  for (const { broker, patterns } of BROKER_KEYWORDS) {
    if (patterns.some((re) => re.test(t))) return broker;
  }
  return null;
}

// Normalize broker-specific labels so regex can match (e.g. "Net Qty" -> "Qty")
function normalizeBrokerLabels(text) {
  return String(text || "")
    .replace(/\bNet\s*Qty\b/gi, "Qty")
    .replace(/\bNet\s*Quantity\b/gi, "Qty")
    .replace(/\bNetQty\b/gi, "Qty")
    .replace(/\bGross\s*Qty\b/gi, "Qty")
    .replace(/\bTraded\s*Qty\b/gi, "Qty")
    .replace(/\bOrder\s*Qty\b/gi, "Qty")
    .replace(/\bExecuted\s*Qty\b/gi, "Qty")
    .replace(/\bAvg\.?\s*Rate\b/gi, "Avg Price")
    .replace(/\bAverage\s*Rate\b/gi, "Avg Price")
    .replace(/\bTrade\s*Price\b/gi, "Avg Price")
    .replace(/\bAvg\.?\s*Price\b/gi, "Avg Price")
    .replace(/\bRealized\s*P&L\b/gi, "P&L")
    .replace(/\bRealised\s*P&L\b/gi, "P&L")
    .replace(/\bNet\s*P&L\b/gi, "P&L")
    .replace(/\bMTM\s*P&L\b/gi, "P&L")
    .replace(/\bProfit\s*\/\s*Loss\b/gi, "P&L")
    .replace(/\bP\s*\/\s*L\b/gi, "P&L")
    .replace(/\bPNL\b/gi, "P&L")
    .replace(/\bContract\s*Note\b/gi, "Contract Note")
    .replace(/\bScrip\s*Name\b/gi, "Symbol")
    .replace(/\bInstrument\b/gi, "Symbol");
}

exports.parseIndianTrade = (text, opts = {}) => {
  const broker = canonicalizeBroker(opts?.broker) || detectBroker(text);
  const normalizedText = normalizeBrokerLabels(text);
  const rawText = normalizedText;
  const lines = normalizedText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let pair = null; // Symbol
  let quantity = null;
  let entryPrice = null;
  let exitPrice = null;
  let profit = null;
  let action = "BUY"; // Default
  let segment = "Equity";
  let instrumentType = "EQUITY";
  let strikePrice = null;
  let expiryDate = null;

  // First, try to capture “Total P&L / Overall P&L” style lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Examples (from Indian broker apps):
    // "Total P&L  +4,132.50" / "Total Returns  +₹14,482.00" / "Overall P&L  -5,367.00 on 1 positions"
    const overallMatch = line.match(
      /(Total|Overall)\s*(?:P\s*&\s*L|Returns?)[^\d\-+]*([+\-]?\s*₹?\s*[\d,\s]+(?:\.\d+)?)/
    );
    if (overallMatch && !profit) {
      profit = cleanPnLValue(overallMatch[2]);
    }
    // "Total P&L" on one line, "+4 132.50" on next (OCR split, space in number)
    if (!profit && i > 0 && lines[i - 1].match(/(Total|Overall)\s*P\s*&\s*L/i)) {
      const numMatch = line.match(/^([+\-]?\s*[\d,\s]+\.?\d*)$/);
      if (numMatch) {
        const parsed = cleanPnLValue(numMatch[1]);
        if (parsed !== null && Math.abs(parsed) >= 1) profit = parsed;
      }
    }
    // Broker card: "NRML +4,132.50 LTP 161.60"
    const nrmlMatch = line.match(/NRML\s*([+\-]?\s*[\d,\s]+\.?\d*)/);
    if (nrmlMatch && !profit) {
      profit = cleanPnLValue(nrmlMatch[1]);
    }
    // Standalone large P&L when context suggests broker screen (e.g. "+4 132.50")
    const standaloneMatch = line.match(/^([+\-]?\s*[\d,\s]+\.\d{2})$/);
    if (standaloneMatch && !profit && (rawText.includes("Total") || rawText.includes("P&L") || rawText.includes("NRML"))) {
      profit = cleanPnLValue(standaloneMatch[1]);
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Symbol / Instrument Name – multiple patterns + OCR typo fixes
    if (!pair && !line.match(/Avg|Price|Qty|Quantity|Profit|P&L|Orders?|LTP|CMP/i) && looksLikeIndianInstrument(line)) {
      const fixedLine = fixInstrumentOcrTypos(line);
      // OCR sometimes appends stray glyphs; normalize before regex matching
      const fixedLineForMatch = fixedLine
        .replace(/[^\w\s,+\-.]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      // Broker line: "NIFTY 09th DEC 26000 PE" or "NIFTY 03 Feb 24750 Put" + optional P&L
      const instrumentWithPnL = fixedLineForMatch.match(
        /(NIFTY|BANKNIFTY|FINNIFTY|MIDCPNIFTY|SENSEX|BANKEX)\s+[\dA-Za-z\s]+?\s*(\d{4,6})\s*(CE|PE|CALL|PUT|Call|Put)(?:\s*([+\-]?\s*₹?\s*[\d,\s]+\.?\d*))?$/i
      );
      if (instrumentWithPnL) {
        const u = instrumentWithPnL[1].toUpperCase().replace(/\s+/g, "");
        const strike = correctStrikeOcrTypo(u, instrumentWithPnL[2]);
        const ot = (instrumentWithPnL[3] || "CE").toUpperCase().replace("CALL", "CE").replace("PUT", "PE");
        // Standard pair form: "NIFTY 24750 PE" (underlying + strike + CE/PE)
        pair = `${u} ${strike} ${ot}`;
        // Dhan shows profit without "+" (e.g. "1,000.00") but loss has "-" (e.g. "-717.50")
        if (!profit) {
          const maybePnl = instrumentWithPnL[4];
          if (maybePnl) {
            const pParsed = cleanPnLValue(maybePnl);
            if (pParsed != null) profit = pParsed;
          } else if (broker === "Dhan") {
            const tailPnl = fixedLineForMatch.match(/\s(-?\s*₹?\s*[\d,\s]+\.\d{2})\s*$/);
            if (tailPnl) {
              const cleaned = tailPnl[1].replace(/[₹\s,]/g, "");
              const parsed = parseFloat(cleaned);
              if (!Number.isNaN(parsed)) profit = parsed;
            }
          }
        }
        segment = "F&O";
        instrumentType = "OPTION";
        strikePrice = strike;
      }
      const patterns = [
        /^([A-Z&0-9]{2,}(?:\s+\d{1,2}(?:ST|ND|RD|TH)?)?(?:\s+[A-Z]{3})?(?:\s+\d+)\s*(CE|PE|CALL|PUT|FUT))(?:\s*[+\-]?\s*[\d,\s]+\.?\d*)?$/i,
        /^([A-Z&0-9]{2,}(?:\s+\d{1,2}(?:ST|ND|RD|TH)?)?(?:\s+[A-Z]{3})?)\s+(\d+)\s*(CE|PE|CALL|PUT|FUT)(?:\s*[+\-]?\s*[\d,\s]+\.?\d*)?$/i,
        /^([A-Z&0-9]{2,}(?:\s+\d{1,2}(?:ST|ND|RD|TH)?)?(?:\s+[A-Z]{3})?(?:\s+\d+)\s*(CE|PE|CALL|PUT|FUT))$/i,
        /^([A-Z&0-9]{2,}(?:\s+\d{1,2}(?:ST|ND|RD|TH)?)?(?:\s+[A-Z]{3})?)\s+(\d+)\s*(CE|PE|CALL|PUT|FUT)$/i,
        /(NIFTY|BANKNIFTY|FINNIFTY|MIDCPNIFTY|SENSEX|BANKEX)\s+[\dA-Z\s]+\s*(CE|PE|CALL|PUT)/i,
        /(NIFTY|BANK\s*NIFTY|FIN\s*NIFTY)\s+(\d+)\s*(CE|PE)/i,
      ];
      if (!pair) for (const re of patterns) {
        const m = fixedLineForMatch.match(re);
        if (m) {
          let sym = (m[1] || m[0]).trim();
          const otRaw = (m[2] || m[3] || "").toUpperCase().replace("CALL", "CE").replace("PUT", "PE");
          const ot = otRaw === "CE" || otRaw === "PE" ? otRaw : null;
          if (/^\d+$/.test(m[2])) strikePrice = m[2];
          if (ot) sym = sym.replace(/\s*(CE|PE|CALL|PUT)\s*$/i, "").trim() + " " + ot;
          // Prevent garbage OCR tokens like "pg" from becoming a symbol
          if (sym.length >= 6 && /\b\d{4,5}\b/.test(sym) && /\b(CE|PE|CALL|PUT|FUT)\b/i.test(sym)) {
            pair = sym;
          }
          if (pair) {
            segment = "F&O";
            instrumentType = pair.match(/FUT/i) ? "FUTURE" : "OPTION";
            if (!strikePrice) {
              const strikeM = pair.match(/(\d+)\s*(?:CE|PE|CALL|PUT)/i);
              if (strikeM) strikePrice = strikeM[1];
            }
            break;
          }
        }
      }
    }

    // ── DHAN: "Qty. 50 x 83.00 NSE" (quantity + avg price on one line) ──
    if (broker === "Dhan") {
      const dhanQtyPrice = line.match(/\bQty\.?\s*(\d[\d,]*)\s*x\s*([\d,]+(?:\.\d+)?)\b/i);
      if (dhanQtyPrice) {
        if (quantity == null) quantity = dhanQtyPrice[1].replace(/,/g, "");
        if (entryPrice == null) entryPrice = dhanQtyPrice[2].replace(/,/g, "");
      }
      // Dhan row P&L can appear as a standalone number without '+', sometimes with commas.
      if (!profit) {
        const dhanStandalonePnl = line.match(/^\s*(-?\s*[\d,]+\.\d{2})\s*$/);
        if (dhanStandalonePnl) {
          const parsed = parseNumberWithSpaces(dhanStandalonePnl[1]);
          if (!Number.isNaN(parsed)) profit = parsed;
        }
      }
    }

    // Quantity (from contract-note style or some apps)
    const qtyMatch = line.match(/(?:Qty\.?|Quantity|Lots?|Net\s*Qty)[:\s]*([\d,]+)/i);
    if (qtyMatch) {
      quantity = qtyMatch[1].replace(/,/g, "");
    }

    // Entry Price (Avg. Price)
    const entryMatch = line.match(
      /(?:Avg\.?\s*Price|Average\s*Price|Entry|Buy\s*Avg)[:\s]*([\d,]+\.?\d*)/i
    );
    if (entryMatch) {
      entryPrice = entryMatch[1].replace(/,/g, "");
    }

    // Exit Price (LTP/CMP/Mkt – brokers use "Mkt ₹82.25")
    const exitMatch = line.match(
      /(?:LTP|CMP|Mkt|Exit\s*Price|Sell\s*Avg)\s*₹?\s*[:\s]*([\d,]+\.?\d*)/i
    );
    if (exitMatch) {
      exitPrice = exitMatch[1].replace(/,/g, "");
    }

    // Profit (P&L) – row‑level P&L if present.
    // NOTE: The regex has an alternation; only use the capturing group when it exists.
    const profitMatch = line.match(
      /(?:Realized\s*)?P\s*&\s*L[:\s]*([+\-]?\s*[\d,]+\.?\d*)|Profit[:\s]*([+\-]?\s*[\d,]+\.?\d*)/i
    );
    if (profitMatch && !profit) {
      const captured =
        (profitMatch[1] && profitMatch[1].trim().length > 0
          ? profitMatch[1]
          : profitMatch[2]) || null;
      if (captured) {
        const numeric = captured.replace(/\s+/g, "").replace(/,/g, "");
        const parsed = parseFloat(numeric);
        if (!Number.isNaN(parsed)) {
          profit = parsed;
        }
      }
    }

    // Fallback Profit: standalone number right after a P&L label
    if (!profit) {
      const fallbackProfit = line.match(/^([+\-]?\s*[\d,]+\.?\d*)$/);
      if (
        fallbackProfit &&
        i > 0 &&
        lines[i - 1].match(/P\s*&\s*L|Profit/i)
      ) {
        const numeric = fallbackProfit[1]
          .replace(/\s+/g, "")
          .replace(/,/g, "");
        const parsed = parseFloat(numeric);
        if (!Number.isNaN(parsed)) {
          profit = parsed;
        }
      }
    }
  }

  // Third pass: loosen instrument match – join lines (mobile card layout may split text)
  // Handles "NIFTY 03 Feb 24750 Put" and "NIFTY 09th DEC 26000 PE"
  if (!pair && rawText) {
    const joined = fixInstrumentOcrTypos(rawText.replace(/\s+/g, " "));
    const looseMatch = joined.match(
      /(NIFTY|BANKNIFTY|FINNIFTY|MIDCPNIFTY|SENSEX)\s+(?:\d{1,2}(?:th|st|nd|rd)?\s*(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+)?(\d{4,6})\s*(CE|PE|CALL|PUT|Call|Put)/i
    );
    if (looseMatch) {
      const u = looseMatch[1].toUpperCase().replace(/\s+/g, "");
      const strike = correctStrikeOcrTypo(u, looseMatch[2]);
      const ot = (looseMatch[3] || "CE").toUpperCase().replace("CALL", "CE").replace("PUT", "PE");
      pair = `${u} ${strike} ${ot}`;
      strikePrice = strike;
      segment = "F&O";
      instrumentType = "OPTION";
    }
  }

  // Strike price OCR correction
  if (pair && strikePrice) {
    const u = pair.replace(/\s+\d+\s*(CE|PE)$/i, "").trim();
    const corrected = correctStrikeOcrTypo(u, strikePrice);
    const ot = pair.match(/(CE|PE)$/i)?.[1] || "CE";
    pair = u.replace(/\s+\d+\s*$/, "").trim() + ` ${corrected} ${ot}`;
    strikePrice = corrected;
  }

  return {
    pair: pair || null,
    type: action,
    quantity: quantity != null ? safePositiveNumber(quantity) : null,
    entryPrice: entryPrice != null ? safePositiveNumber(entryPrice) : null,
    exitPrice: exitPrice != null ? safePositiveNumber(exitPrice) : null,
    profit: profit != null ? safeSignedNumber(profit) : null,
    segment,
    instrumentType,
    strikePrice: strikePrice != null ? safePositiveNumber(strikePrice) : null,
    expiryDate: expiryDate || null,
    marketType: "Indian_Market",
    ...(broker && { broker }),
  };
};

// ─────────────────────────────────────────────────────────────
// Multi-Trade Parser: parseTradesFromOCR(text)
// Splits OCR text into multiple trade blocks and returns an
// array of { symbol, strike, optionType, quantity, entryPrice, pnl }
// ─────────────────────────────────────────────────────────────

// Lines that are UI chrome / noise – never part of a trade
const NOISE_PATTERNS = [
  /^Portfolio$/i,
  /^Positions$/i,
  /^Closed\s*Positions$/i,
  /^Closed$/i,
  /^Holdings$/i,
  /^Markets$/i,
  /^Watchlist$/i,
  /^Orders$/i,
  /^Options$/i,
  /^Exit\s*all$/i,
  /^Smart\s*Exit/i,
  /^Disabled$/i,
  /^Enabled$/i,
  /^Total\s+P\s*&?\s*L/i,
  /^Overall\s+P\s*&?\s*L/i,
  /^Total\s+Returns$/i,
  /^Total\s+Returns\b/i,  // "Total Returns  +₹14,482.00" – avoid assigning total to a position
  /^Set\s+Safe\s+Exit$/i,
  /^Filters?$/i,
  // Index header rows (common in broker apps): "SENSEX 82,089.67 +232.19 (0.28%)"
  /^(NIFTY\s*50|SENSEX|BANKNIFTY|FINNIFTY|MIDCPNIFTY|BANKEX)\s+[\d,]+\.?\d*\s+[+\-]\s*[\d,]+\.?\d*\s*\(\s*[\d.]+%\s*\)\s*$/i,
  // Index change lines (SENSEX +232.19 (0.28%), NIFTY +66.25 (0.26%)) – never position P&L
  /^[+\-]?\s*[\d,]+\.?\d*\s*\(\s*[\d.]+%\s*\)\s*$/,
  // NOTE: Do NOT add pattern for standalone P&L like "+₹1,15,943.75" – we need it in block context!
];

function isNoiseLine(line) {
  return NOISE_PATTERNS.some((re) => re.test(line.trim()));
}

// Regex to detect an Indian contract header:  SYMBOL [optional expiry e.g. "03 Feb"] STRIKE CE/PE/Put/Call
const CONTRACT_HEADER_RE =
  /\b(NIFTY|BANKNIFTY|FINNIFTY|MIDCPNIFTY|SENSEX|BANKEX)\b[\s\w]*?\b(\d{4,6})\s*(CE|PE|CALL|PUT|Call|Put)\b/i;

/**
 * parseTradesFromOCR(text)
 *
 * Receives the raw OCR text extracted from an Indian broker screenshot,
 * detects every contract header (SYMBOL STRIKE CE/PE), collects the
 * subsequent lines as context for that trade, and extracts structured
 * fields from each block.
 *
 * @param {string} text  – raw OCR text (may contain multiple trades)
 * @returns {Array<{symbol:string, strike:number, optionType:string,
 *                   quantity:number|null, entryPrice:number|null, pnl:number|null}>}
 */
exports.parseTradesFromOCR = (text, opts = {}) => {
  if (!text || typeof text !== "string") return [];
  const broker = canonicalizeBroker(opts?.broker) || detectBroker(text);

  // Normalize broker labels + common OCR errors before splitting
  let normalized = normalizeBrokerLabels(text)
    // Fix common symbol OCR typos
    .replace(/N1FTY|NlFTY|NIFTY\s*50/gi, "NIFTY")
    .replace(/BANKN1FTY|BANK\s*N1FTY|\bBANK\s*NIFTY\b/gi, "BANKNIFTY")
    .replace(/\bFIN\s*NIFTY\b/gi, "FINNIFTY")
    .replace(/\bMID\s*CP\s*NIFTY\b/gi, "MIDCPNIFTY")
    .replace(/\bMIDCP\s*NIFTY\b/gi, "MIDCPNIFTY")
    // Remove stray unicode / special chars that OCR injects
    .replace(/[©®™●·○]/g, " ")
    .replace(/@/g, " ")
    // Normalize rupee symbols (₹ may OCR as various forms)
    .replace(/[\u20B9]/g, "₹");

  const lines = normalized
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // ── Step 1: Identify trade block boundaries ──────────────────
  // Each contract header starts a new block; lines between two
  // headers belong to the preceding trade.
  const blocks = []; // Array of { headerLine, contextLines[] }
  let currentBlock = null;
  let pendingPreHeader = []; // P&L lines before first header (e.g. "+₹1,15,943.75" under Total Returns)

  for (const line of lines) {
    // Skip pure noise
    if (isNoiseLine(line)) continue;

    const fixedLine = fixInstrumentOcrTypos(line);
    const headerMatch = fixedLine.match(CONTRACT_HEADER_RE);

    if (headerMatch) {
      // Start a new block
      currentBlock = { headerLine: fixedLine, contextLines: [] };
      blocks.push(currentBlock);
      // First block: add any P&L lines that appeared before header (Total Returns area)
      if (blocks.length === 1 && pendingPreHeader.length > 0) {
        currentBlock.contextLines.push(...pendingPreHeader);
        pendingPreHeader = [];
      }
    } else if (currentBlock) {
      currentBlock.contextLines.push(fixedLine);
    } else {
      // Before first header – keep lines that look like P&L for the first position.
      // EXCLUDE index change values (e.g. SENSEX +232.19, NIFTY +66.25) – these are small
      // and typically < 1000. Real position P&L is usually much larger or has ₹.
      const pnlLike = fixedLine.match(/^([+\-])\s*₹?\s*([\d,\s]+\.?\d+)\s*$/);
      if (pnlLike) {
        const val = cleanPnLValue(pnlLike[0]);
        const hasRupee = fixedLine.includes("₹");
        const isLarge = val != null && Math.abs(val) >= 500;
        // Only add if it has ₹ (Indian format) or is a large amount (position P&L, not index change)
        if (hasRupee || isLarge) {
          pendingPreHeader.push(fixedLine);
        }
      }
    }
  }

  if (blocks.length === 0) return [];

  // ── Step 2: Extract fields from each block ───────────────────
  const trades = blocks.map((block) => {
    const headerMatch = block.headerLine.match(CONTRACT_HEADER_RE);
    const symbol = headerMatch[1].toUpperCase().replace(/\s+/g, "");
    const rawStrike = headerMatch[2];
    const rawType = (headerMatch[3] || "").toUpperCase().replace("CALL", "CE").replace("PUT", "PE");

    // Correct OCR typos in strike
    const strike = parseFloat(correctStrikeOcrTypo(symbol, rawStrike));

    let quantity = null;
    let entryPrice = null; // Prioritized Avg Price
    let ltpPrice = null;   // Fallback
    let pnl = null;
    let pnlHasRupee = false;

    // P&L on header line: "+₹8,164.00" or "+₹1,15,943.75" (Indian lakh) or "NIFTY ... Put  +₹1,15,943.75 B>"
    const headerPnlMatch = block.headerLine.match(/([+\-]\s*₹?\s*[\d,\s]+\.?\d*)/);
    if (headerPnlMatch) {
      const val = cleanPnLValue(headerPnlMatch[0]);
      if (val != null && Math.abs(val) >= 1) {
        pnl = val;
        pnlHasRupee = headerPnlMatch[0].includes("₹");
      }
    } else if (broker === "Dhan") {
      // Dhan can show pnl without "+" at the end of the instrument line (e.g. "1,000.00")
      const dhanHeaderPnl = block.headerLine.match(/\s(-?\s*[\d,]+\.\d{2})\s*$/);
      if (dhanHeaderPnl) {
        const val = parseNumberWithSpaces(dhanHeaderPnl[1]);
        if (!Number.isNaN(val)) pnl = val;
      }
    }

    // Collect all P&L candidates – index changes (e.g. SENSEX +232.19) are small; position P&L is larger
    const pnlCandidates = [];
    const addPnlCandidate = (val, hasRupee) => {
      if (val != null && Math.abs(val) >= 1) pnlCandidates.push({ val, hasRupee });
    };

    // Parse context lines
    for (const ctx of block.contextLines) {
      // ── Quantity ──
      const qtyMatch = ctx.match(
        /(?:Qty\.?|QTY\.?|Quantity|Net\s*Qty|Lots?)\s*[:\s]*(\d[\d,]*)/i
      );
      if (qtyMatch && quantity === null) {
        quantity = parseInt(qtyMatch[1].replace(/,/g, ""), 10);
      }

      // ── DHAN: Qty. 50 x 83.00 NSE ──
      if (broker === "Dhan") {
        const dhanQtyX = ctx.match(/\bQty\.?\s*(\d[\d,]*)\s*x\s*([\d,]+(?:\.\d+)?)\b/i);
        if (dhanQtyX) {
          if (quantity === null) quantity = parseInt(dhanQtyX[1].replace(/,/g, ""), 10);
          if (entryPrice === null) entryPrice = parseFloat(dhanQtyX[2].replace(/,/g, ""));
        }
      }

      // ── Entry Price / Avg Price (handle "Avg ₹0.00" or "Avg 135.70") ──
      const avgMatch = ctx.match(
        /(?:Avg\.?\s*(?:Price)?|Average\s*Price|Entry|Buy\s*Avg)\s*₹?\s*[:\s]*([\d,]+\.?\d*)/i
      );
      if (avgMatch && entryPrice === null) {
        const raw = avgMatch[1].replace(/,/g, "");
        // "0", "0.00", "0,00" – common when broker shows Avg ₹0.00 for certain positions
        const v = /^0+\.?\d*$/.test(raw) ? 0 : parseFloat(raw);
        if (!Number.isNaN(v)) entryPrice = v;
      }

      // ── LTP / Mkt Price (brokers use "Mkt ₹82.25" or "LTP 161.60") ──
      const ltpMatch = ctx.match(/(?:LTP|Mkt)\s*₹?\s*[:\s]*([\d,]+\.?\d*)/i);
      if (ltpMatch && ltpPrice === null) {
        ltpPrice = parseFloat(ltpMatch[1].replace(/,/g, ""));
      }

      // ── P&L candidates (collect all, pick best later) ──
      const pnlMatch = ctx.match(
        /(?:P\s*&?\s*L|PNL|Profit)\s*[:\s]*([+\-]?\s*₹?\s*[\d,\s]+\.?\d*)/i
      );
      if (pnlMatch) addPnlCandidate(cleanPnLValue(pnlMatch[1]), pnlMatch[1].includes("₹"));

      const standalonePnl = ctx.match(/^[+\-]\s*₹?\s*([\d,\s]+\.?\d*)\s*$/);
      if (standalonePnl) addPnlCandidate(cleanPnLValue(ctx), ctx.includes("₹"));

      // DHAN: standalone pnl without '+' (e.g. "1,000.00") or with '-' (e.g. "-717.50")
      if (broker === "Dhan") {
        const dhanStandalone = ctx.match(/^\s*(-?\s*[\d,]+\.\d{2})\s*(?:Closed)?\s*$/i);
        if (dhanStandalone) addPnlCandidate(parseNumberWithSpaces(dhanStandalone[1]), false);
        const dhanAnywhere = ctx.match(/(-?\s*[\d,]+\.\d{2})\s*(?:Closed)?\s*$/i);
        if (dhanAnywhere) addPnlCandidate(parseNumberWithSpaces(dhanAnywhere[1]), false);
      }

      const anywherePnl = ctx.match(/([+\-]\s*₹?\s*[\d,\s]+\.?\d*)/);
      if (anywherePnl) addPnlCandidate(cleanPnLValue(anywherePnl[1]), anywherePnl[1].includes("₹"));

      const inlinePnl = ctx.match(/([+\-])\s*₹\s*([\d,\s]+\.?\d*)/);
      if (inlinePnl) addPnlCandidate(cleanPnLValue(inlinePnl[0]), true);
    }

    // Pick best P&L: prefer (1) values with ₹, (2) larger magnitude (position P&L >> index change like +232.19)
    if (pnl === null && pnlCandidates.length > 0) {
      const withRupee = pnlCandidates.filter((c) => c.hasRupee);
      const pool = withRupee.length > 0 ? withRupee : pnlCandidates;
      const best = pool.reduce((a, b) =>
        Math.abs(b.val) > Math.abs(a.val) ? b : a
      );
      if (broker === "Dhan") {
        // Dhan P&L can be small (e.g. -472.50) and has no ₹ or + sign.
        pnl = best.val;
        pnlHasRupee = false;
      } else {
        // Reject obvious index changes: small values without ₹ when a larger one exists
        const hasLarger = pool.some((c) => Math.abs(c.val) >= 500);
        if (!hasLarger || Math.abs(best.val) >= 500) {
          pnl = best.val;
          pnlHasRupee = !!best.hasRupee;
        }
      }
    }

    return {
      symbol,
      strike,
      optionType: rawType,
      quantity,
      entryPrice: entryPrice !== null ? entryPrice : ltpPrice,
      pnl,
      _pnlHasRupee: pnlHasRupee,
    };
  });

  // Global P&L candidates (prefer ₹ and large magnitude).
  // This is used both as (1) fallback when pnl is null, and (2) override when pnl is small
  // due to index-change text being misinterpreted as position P&L.
  const pnlMatchesAll = normalized.match(/[+\-]\s*₹\s*[\d,\s]+\.?\d+/g) || [];
  const globalRupeeValues = pnlMatchesAll
    .map((m) => cleanPnLValue(m))
    .filter((v) => v != null && Math.abs(v) >= 500);
  const globalBestRupeePnl =
    globalRupeeValues.length > 0
      ? globalRupeeValues.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a))
      : null;

  // If trade(s) have pnl null, fill from best ₹ value when we only have one trade
  const withNullPnl = trades.filter((t) => t.pnl == null);
  if (globalBestRupeePnl != null && withNullPnl.length === 1) {
    withNullPnl[0].pnl = globalBestRupeePnl;
    withNullPnl[0]._pnlHasRupee = true;
  }

  // If trade pnl is suspiciously small (< 500) but we do have a strong ₹ candidate elsewhere,
  // override it (this is the "232.19" issue).
  if (broker !== "Dhan" && globalBestRupeePnl != null) {
    for (const t of trades) {
      if (t._pnlHasRupee) continue;
      if (t.pnl != null && Math.abs(t.pnl) > 0 && Math.abs(t.pnl) < 500) {
        t.pnl = globalBestRupeePnl;
        t._pnlHasRupee = true;
      }
    }
  }

  return trades.map((t) => {
    // eslint-disable-next-line no-unused-vars
    const { _pnlHasRupee, ...rest } = t;
    return {
      ...rest,
      ...(broker && { broker }),
    };
  });
};
