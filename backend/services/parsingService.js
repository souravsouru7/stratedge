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

exports.parseIndianTrade = (text) => {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Symbol / Instrument Name
    // Pattern: Look for uppercase words, sometimes with dates and numbers for F&O
    // e.g., NIFTY 24 MAR 22000 CE, RELIANCE, HDFCBANK
    const instrumentMatch = line.match(/^([A-Z\&0-9]{2,}\s*(?:\d+\s*[A-Z]{3})?.*(?:CE|PE|FUT)?)$/i);
    if (instrumentMatch && !pair && !line.match(/Avg|Price|Qty|Quantity|Profit|P&L/i)) {
      pair = instrumentMatch[1].trim();
      if (pair.match(/CE|PE/i)) {
        segment = "F&O";
        instrumentType = "OPTION";
        const strikeMatch = pair.match(/(\d+)\s*(?:CE|PE)/i);
        if (strikeMatch) strikePrice = strikeMatch[1];
      } else if (pair.match(/FUT/i)) {
        segment = "F&O";
        instrumentType = "FUTURE";
      }
    }

    // Quantity
    const qtyMatch = line.match(/(?:Qty|Quantity|Lots?)[:\s]*(\d+)/i);
    if (qtyMatch) {
      quantity = qtyMatch[1];
    }

    // Entry Price (Avg. Price)
    const entryMatch = line.match(/(?:Avg\.?\s*Price|Average\s*Price|Entry)[:\s]*(\d+\.?\d*)/i);
    if (entryMatch) {
      entryPrice = entryMatch[1];
    }

    // Exit Price (LTP/CMP)
    const exitMatch = line.match(/(?:LTP|CMP|Exit\s*Price)[:\s]*(\d+\.?\d*)/i);
    if (exitMatch) {
      exitPrice = exitMatch[1];
    }

    // Profit (P&L)
    const profitMatch = line.match(/(?:Realized\s*)?P\s*&\s*L|Profit[:\s]*([-+]?\d+\.?\d*)/i);
    if (profitMatch) {
      profit = profitMatch[1];
    }

    // Fallback Profit: Large numbers with + or -
    if (!profit) {
      const fallbackProfit = line.match(/^([-+]?\s*\d+\.?\d*)$/);
      if (fallbackProfit && i > 0 && lines[i - 1].match(/P\s*&\s*L|Profit/i)) {
        profit = fallbackProfit[1].replace(/\s+/g, '');
      }
    }
  }

  return {
    pair: pair || null,
    type: action,
    quantity: quantity ? parseFloat(quantity) : null,
    entryPrice: entryPrice ? parseFloat(entryPrice) : null,
    exitPrice: exitPrice ? parseFloat(exitPrice) : null,
    profit: profit ? parseFloat(profit) : null,
    segment,
    instrumentType,
    strikePrice: strikePrice ? parseFloat(strikePrice) : null,
    expiryDate: expiryDate || null,
    marketType: 'Indian_Market'
  };
};