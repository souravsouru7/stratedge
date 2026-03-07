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

    // Symbol, Action, Lot
    const tradeLineMatch = line.match(/^([A-Z0-9\.\+\#\-]+),\s*(buy|sell)\s*(\d+\.\d+)/i);
    if (tradeLineMatch) {
      pair = tradeLineMatch[1];
      action = tradeLineMatch[2].toLowerCase();
      lotSize = tradeLineMatch[3];
      continue;
    }

    // Prices (More robust: handles arrow, dots, dashes, or just spaces)
    const priceMatch = line.match(/(\d+\.\d+)\s*(?:->|→|[-\.\s]+)\s*(\d+\.\d+)/);
    if (priceMatch) {
      entryPrice = priceMatch[1];
      exitPrice = priceMatch[2];
      continue;
    }

    // SL / TP (More robust: handles missing colons, different slash spacing)
    const slMatch = line.match(/S\s*\/?\s*L[:\s]*(\d+\.\d+)/i);
    if (slMatch) stopLoss = slMatch[1];

    const tpMatch = line.match(/T\s*\/?\s*P[:\s]*(\d+\.\d+)/i);
    if (tpMatch) takeProfit = tpMatch[1];

    // Swap / Commission
    const lineSwapMatch = line.match(/Swap[:\s]*(-?\d+\.\d+|-?\d+)/i);
    if (lineSwapMatch) swap = lineSwapMatch[1];

    const lineCommMatch = line.match(/Commission[:\s]*(-?\d+\.\d+|-?\d+)/i);
    if (lineCommMatch) commission = lineCommMatch[1];

    // Balance
    const balanceMatch = line.match(/Balance[:\s]*(-?\d+\.\d+|-?\d+)/i);
    if (balanceMatch) balance = balanceMatch[1];

    // Open Time
    const openTimeMatch = line.match(/Open[:\s]*(\d{4}\.\d{2}\.\d{2}\s*\d{2}:\d{2}:\d{2})/i);
    if (openTimeMatch) openTime = openTimeMatch[1];

    // Profit summary
    const summaryProfitMatch = line.match(/^Profit[:\s]*(-?\d+\.\d+|-?\d+)/i);
    if (summaryProfitMatch && !profit) profit = summaryProfitMatch[1];

    // Individual profit fallback
    if (!profit && line.match(/^(-?\d+\.\d+|-?\d+)$/)) {
      // If it's the large number after a price line or symbol line
      if (i > 0 && lines[i - 1].match(/(\d+\.\d+)\s*(?:->|→|[-\.\s]+)\s*(\d+\.\d+)/)) {
        profit = line;
      }
    }
  }

  return {
    pair: pair || null,
    action: action || null,
    lotSize: lotSize ? parseFloat(lotSize) : null,
    entryPrice: entryPrice ? parseFloat(entryPrice) : null,
    exitPrice: exitPrice ? parseFloat(exitPrice) : null,
    profit: profit ? parseFloat(profit) : null,
    commission: commission ? parseFloat(commission) : null,
    balance: balance ? parseFloat(balance) : null,
    swap: swap ? parseFloat(swap) : null,
    stopLoss: stopLoss ? parseFloat(stopLoss) : null,
    takeProfit: takeProfit ? parseFloat(takeProfit) : null,
    session: getSession(openTime)
  };
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
    .replace(/BANKN1FTY|BANK\s*N1FTY/gi, "BANKNIFTY")
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

exports.parseIndianTrade = (text) => {
  const rawText = text;
  const lines = text
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
    // "Total P&L  +4,132.50"
    // "Overall P&L  -5,367.00 on 1 positions"
    const overallMatch = line.match(
      /(Total|Overall)\s*P\s*&\s*L[^\d\-+]*([+\-]?\s*[\d,\s]+(?:\.\d+)?)/
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
      // Broker line: "NIFTY 09th DEC 26000 PE +4,182.50" – instrument + optional P&L on same line
      const instrumentWithPnL = fixedLineForMatch.match(
        /(NIFTY|BANKNIFTY|FINNIFTY|MIDCPNIFTY|SENSEX|BANKEX)\s+[\dA-Za-z\s]+?\s*(\d{4,5})\s*(CE|PE|CALL|PUT)(?:\s*([+\-]?\s*[\d,\s]+\.?\d*))?$/i
      );
      if (instrumentWithPnL) {
        const u = instrumentWithPnL[1].toUpperCase().replace(/\s+/g, "");
        const strike = correctStrikeOcrTypo(u, instrumentWithPnL[2]);
        const ot = (instrumentWithPnL[3] || "CE").toUpperCase().replace("CALL", "CE").replace("PUT", "PE");
        // Use the matched substring (starts at underlying) to avoid prefix garbage like "pg"
        const instrumentPart = String(instrumentWithPnL[0] || "")
          .replace(/\s*[+\-]?\s*[\d,\s]+\.?\d*\s*$/, "")
          .trim();
        pair = instrumentPart || `${u} ${strike} ${ot}`;
        if (instrumentWithPnL[4] && !profit) {
          const pParsed = parseNumberWithSpaces(instrumentWithPnL[4]);
          if (!Number.isNaN(pParsed)) profit = pParsed;
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

    // Quantity (from contract-note style or some apps)
    const qtyMatch = line.match(/(?:Qty|Quantity|Lots?|Net\s*Qty)[:\s]*([\d,]+)/i);
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

    // Exit Price (LTP/CMP)
    const exitMatch = line.match(
      /(?:LTP|CMP|Exit\s*Price|Sell\s*Avg)[:\s]*([\d,]+\.?\d*)/i
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
  if (!pair && rawText) {
    const joined = fixInstrumentOcrTypos(rawText.replace(/\s+/g, " "));
    const looseMatch = joined.match(
      /(NIFTY|BANKNIFTY|FINNIFTY|MIDCPNIFTY|SENSEX)\s+(?:\d{1,2}(?:th|st|nd|rd)?\s*(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+)?(\d{4,5})\s*(CE|PE|CALL|PUT)/i
    );
    if (looseMatch) {
      const u = looseMatch[1].toUpperCase().replace(/\s+/g, "");
      const strike = correctStrikeOcrTypo(u, looseMatch[2]);
      const ot = (looseMatch[3] || "CE").toUpperCase().replace("CALL", "CE").replace("PUT", "PE");
      strikePrice = strike;
      pair = `${u} ${strike} ${ot}`;
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
    quantity: quantity ? parseFloat(quantity) : null,
    entryPrice: entryPrice ? parseFloat(entryPrice) : null,
    exitPrice: exitPrice ? parseFloat(exitPrice) : null,
    profit: profit != null ? profit : null,
    segment,
    instrumentType,
    strikePrice: strikePrice ? parseFloat(strikePrice) : null,
    expiryDate: expiryDate || null,
    marketType: "Indian_Market",
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
  /^[\u20B9₹]?\s*[+\-]?\s*[\d,\s]+\.\d{2}\s*$/,  // Total P&L value line like "+₹650.00"
];

function isNoiseLine(line) {
  return NOISE_PATTERNS.some((re) => re.test(line.trim()));
}

// Regex to detect an Indian contract header:  SYMBOL [optional expiry info] STRIKE CE/PE
const CONTRACT_HEADER_RE =
  /\b(NIFTY|BANKNIFTY|FINNIFTY|MIDCPNIFTY|SENSEX|BANKEX)\b[\s\w]*?\b(\d{4,6})\s*(CE|PE|CALL|PUT)\b/i;

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
exports.parseTradesFromOCR = (text) => {
  if (!text || typeof text !== "string") return [];

  // Normalize common OCR errors before splitting
  let normalized = text
    // Fix common symbol OCR typos
    .replace(/N1FTY|NlFTY/gi, "NIFTY")
    .replace(/BANKN1FTY|BANK\s*N1FTY/gi, "BANKNIFTY")
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

  for (const line of lines) {
    // Skip pure noise
    if (isNoiseLine(line)) continue;

    const fixedLine = fixInstrumentOcrTypos(line);
    const headerMatch = fixedLine.match(CONTRACT_HEADER_RE);

    if (headerMatch) {
      // Start a new block
      currentBlock = { headerLine: fixedLine, contextLines: [] };
      blocks.push(currentBlock);
    } else if (currentBlock) {
      currentBlock.contextLines.push(fixedLine);
    }
    // Lines before the first header are ignored (app chrome)
  }

  if (blocks.length === 0) return [];

  // ── Step 2: Extract fields from each block ───────────────────
  const trades = blocks.map((block) => {
    const headerMatch = block.headerLine.match(CONTRACT_HEADER_RE);
    const symbol = headerMatch[1].toUpperCase().replace(/\s+/g, "");
    const rawStrike = headerMatch[2];
    const rawType = headerMatch[3].toUpperCase().replace("CALL", "CE").replace("PUT", "PE");

    // Correct OCR typos in strike
    const strike = parseFloat(correctStrikeOcrTypo(symbol, rawStrike));

    let quantity = null;
    let entryPrice = null; // Prioritized Avg Price
    let ltpPrice = null;   // Fallback
    let pnl = null;

    // Check the header line itself for inline P&L like "+₹325.00" or "+325.00"
    const headerPnlMatch = block.headerLine.match(
      /[+\-]\s*₹?\s*([\d,\s]+\.?\d*)\s*$/
    );
    if (headerPnlMatch) {
      pnl = cleanPnLValue(headerPnlMatch[0]);
    }

    // Parse context lines
    for (const ctx of block.contextLines) {
      // ── Quantity ──
      const qtyMatch = ctx.match(
        /(?:Qty|QTY|Quantity|Net\s*Qty|Lots?)\s*[:\s]*(\d[\d,]*)/i
      );
      if (qtyMatch && quantity === null) {
        quantity = parseInt(qtyMatch[1].replace(/,/g, ""), 10);
      }

      // ── Entry Price / Avg Price ──
      const avgMatch = ctx.match(
        /(?:Avg\.?\s*(?:Price)?|Average\s*Price|Entry|Buy\s*Avg)\s*[:\s]*([\d,]+\.?\d*)/i
      );
      if (avgMatch && entryPrice === null) {
        entryPrice = parseFloat(avgMatch[1].replace(/,/g, ""));
      }

      // ── LTP Price (Candidate for fallback) ──
      const ltpMatch = ctx.match(/LTP\s*[:\s]*([\d,]+\.?\d*)/i);
      if (ltpMatch && ltpPrice === null) {
        ltpPrice = parseFloat(ltpMatch[1].replace(/,/g, ""));
      }

      // ── P&L / PNL / Profit ──
      if (pnl === null) {
        // Explicit label + value
        const pnlMatch = ctx.match(
          /(?:P\s*&?\s*L|PNL|Profit)\s*[:\s]*([+\-]?\s*₹?\s*[\d,\s]+\.?\d*)/i
        );
        if (pnlMatch) {
          pnl = cleanPnLValue(pnlMatch[1]);
        }
      }

      // ── Standalone P&L value like "+₹325.00" or "-120.50" ──
      if (pnl === null) {
        const standalonePnl = ctx.match(/^[+\-]\s*₹?\s*([\d,]+\.?\d*)$/);
        if (standalonePnl) {
          pnl = cleanPnLValue(ctx);
        }
      }

      // ── Inline P&L on same line as other data (e.g. after percentage) ──
      if (pnl === null) {
        const inlinePnl = ctx.match(/([+\-])\s*₹\s*([\d,]+\.?\d*)/);
        if (inlinePnl) {
          pnl = cleanPnLValue(inlinePnl[0]);
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
    };
  });

  return trades;
};