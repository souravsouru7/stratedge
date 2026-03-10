const Trade = require("../models/Trade");

// Small helper to shift trade timestamps into a configurable
// "trader timezone" before bucketing by day/hour.
// Set TIMEZONE_OFFSET_HOURS in your backend .env (e.g. 5.5 for IST),
// leave unset/0 to keep server-local time.
const getAnalyticsLocalDate = (dateLike) => {
  const base = new Date(dateLike);
  const offsetHours = parseFloat(process.env.TIMEZONE_OFFSET_HOURS || "0");
  if (!offsetHours || Number.isNaN(offsetHours)) return base;
  const shiftedMs = base.getTime() + offsetHours * 60 * 60 * 1000;
  return new Date(shiftedMs);
};

// ============================================
// BASIC ANALYTICS
// ============================================

exports.getSummary = async (req, res) => {
  try {
    const query = { user: req.user._id };
    const trades = await Trade.find(query).sort({ createdAt: -1 });

    const totalTrades = trades.length;
    const totalProfit = trades.reduce((acc, t) => acc + (t.profit || 0), 0);
    const wins = trades.filter(t => t.profit > 0).length;
    const winRate = totalTrades ? (wins / totalTrades) * 100 : 0;

    const winningTrades = trades.filter(t => t.profit > 0);
    const losingTrades = trades.filter(t => t.profit < 0);

    const avgWin = winningTrades.length
      ? winningTrades.reduce((acc, t) => acc + t.profit, 0) / winningTrades.length
      : 0;
    const avgLoss = losingTrades.length
      ? Math.abs(losingTrades.reduce((acc, t) => acc + t.profit, 0) / losingTrades.length)
      : 0;

    const totalCommission = trades.reduce((acc, t) => acc + (t.commission || 0), 0);
    const totalSwap = trades.reduce((acc, t) => acc + (t.swap || 0), 0);
    const totalCosts = totalCommission + totalSwap;
    const netProfit = totalProfit - totalCosts;

    res.json({
      totalTrades,
      totalProfit: totalProfit.toFixed(2),
      netProfit: netProfit.toFixed(2),
      winRate: winRate.toFixed(1),
      avgTrade: (totalTrades ? totalProfit / totalTrades : 0).toFixed(2),
      avgWin: avgWin.toFixed(2),
      avgLoss: avgLoss.toFixed(2),
      totalCosts: totalCosts.toFixed(2),
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getWeeklyStats = async (req, res) => {
  try {
    const query = { user: req.user._id };
    const trades = await Trade.find(query);
    const weekly = {};

    trades.forEach(trade => {
      const date = new Date(trade.createdAt);
      const week = `${date.getFullYear()}-W${Math.ceil(date.getDate() / 7)}`;
      if (!weekly[week]) weekly[week] = 0;
      weekly[week] += trade.profit || 0;
    });

    res.json(weekly);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================
// ADVANCED ANALYTICS
// ============================================

// 1. Risk/Reward Analysis
exports.getRiskRewardAnalysis = async (req, res) => {
  try {
    const query = { user: req.user._id };
    const trades = await Trade.find(query);

    const tradesWithRR = trades.filter(t => t.stopLoss && t.takeProfit && t.entryPrice);

    // Calculate realized R:R from actual profits (works for all trades with profit/loss)
    const winningTrades = trades.filter(t => t.profit > 0);
    const losingTrades = trades.filter(t => t.profit < 0);
    const avgWin = winningTrades.length ? winningTrades.reduce((acc, t) => acc + t.profit, 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length ? Math.abs(losingTrades.reduce((acc, t) => acc + t.profit, 0) / losingTrades.length) : 0;
    const actualRR = avgLoss > 0 ? avgWin / avgLoss : 0;

    // Calculate planned R:R from SL/TP (only for trades with stopLoss and takeProfit)
    let plannedRR = 0;
    let totalRRFromPrices = 0;
    let totalRisk = 0;
    let tradesCountedForRR = 0;

    // Additionally, calculate average R:R purely from the manual field
    // (riskRewardRatio / riskRewardCustom) so the UI reflects what the
    // trader actually planned (e.g. 1:2), without being distorted by
    // tiny price differences or P&L.
    let fieldRRTotal = 0;
    let fieldRRCount = 0;

    trades.forEach(trade => {
      let tradeRRFromPrices = 0;
      const hasValidPrices =
        trade.entryPrice &&
        trade.stopLoss &&
        trade.takeProfit &&
        Math.abs(trade.entryPrice - trade.stopLoss) > 0;

      if (hasValidPrices) {
        const risk = Math.abs(trade.entryPrice - trade.stopLoss);
        const reward = Math.abs(trade.takeProfit - trade.entryPrice);
        tradeRRFromPrices = reward / risk;
        totalRisk += risk;
      }

      // Always try to read the explicit riskRewardRatio field
      let tradeRRFromField = 0;
      if (trade.riskRewardRatio) {
        if (trade.riskRewardRatio === "custom" && trade.riskRewardCustom) {
          const parts = trade.riskRewardCustom.split(":");
          if (parts.length === 2) {
            const customVal = parseFloat(parts[1]);
            if (!isNaN(customVal)) tradeRRFromField = customVal;
          }
        } else if (trade.riskRewardRatio.includes(":")) {
          const parts = trade.riskRewardRatio.split(":");
          if (parts.length === 2) {
            const val = parseFloat(parts[1]);
            if (!isNaN(val)) tradeRRFromField = val;
          }
        }
      }

      // Aggregate price‑based RR (for risk per trade etc.)
      if (tradeRRFromPrices > 0) {
        totalRRFromPrices += tradeRRFromPrices;
        tradesCountedForRR++;
      }

      // Aggregate field‑based RR for the "planned" average shown in UI
      if (tradeRRFromField > 0) {
        fieldRRTotal += tradeRRFromField;
        fieldRRCount++;
      }
    });

    plannedRR = tradesCountedForRR > 0 ? totalRRFromPrices / tradesCountedForRR : 0;

    // For the avgRR we return to the client:
    // 1) Prefer the explicit RR field entered by the user (1:2, 1:3, custom)
    // 2) Fallback to price‑based planned RR
    // 3) Finally, fallback to realized RR from P&L
    let avgRR = 0;
    if (fieldRRCount > 0) {
      avgRR = fieldRRTotal / fieldRRCount;
    } else if (plannedRR > 0) {
      avgRR = plannedRR;
    } else {
      avgRR = actualRR;
    }
    const riskPerTrade = tradesCountedForRR > 0 ? totalRisk / tradesCountedForRR : 0;

    // Calculate expectancy
    const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
    const expectancy = ((avgRR * (winRate / 100)) - ((100 - winRate) / 100)).toFixed(2);

    // Risk-adjusted return (Sharpe-like ratio)
    const returns = trades.map(t => t.profit || 0);
    const meanReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const variance = returns.length > 0 ? returns.reduce((acc, r) => acc + Math.pow(r - meanReturn, 2), 0) / returns.length : 0;
    const stdDev = Math.sqrt(variance);
    const riskAdjustedReturn = stdDev > 0 ? meanReturn / stdDev : 0;

    res.json({
      avgRR: avgRR.toFixed(2),
      actualRR: actualRR.toFixed(2),
      plannedRR: tradesWithRR.length > 0 ? plannedRR.toFixed(2) : "N/A",
      riskPerTrade: riskPerTrade.toFixed(2),
      riskAdjustedReturn: riskAdjustedReturn.toFixed(2),
      tradesWithRR: tradesWithRR.length,
      tradesWithoutRR: trades.length - tradesWithRR.length,
      avgWin: avgWin.toFixed(2),
      avgLoss: avgLoss.toFixed(2),
      expectancy,
      winRate: winRate.toFixed(1)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. Trade Distribution
exports.getTradeDistribution = async (req, res) => {
  try {
    const query = { user: req.user._id };
    const trades = await Trade.find(query);

    // By Currency Pair
    const byPair = {};
    trades.forEach(t => {
      if (!byPair[t.pair]) byPair[t.pair] = { total: 0, wins: 0, losses: 0, profit: 0 };
      byPair[t.pair].total++;
      if (t.profit > 0) byPair[t.pair].wins++;
      else if (t.profit < 0) byPair[t.pair].losses++;
      byPair[t.pair].profit += t.profit || 0;
    });
    Object.keys(byPair).forEach(pair => byPair[pair].winRate = ((byPair[pair].wins / byPair[pair].total) * 100).toFixed(1));

    // By Trade Type (BUY/SELL)
    const byType = { BUY: { total: 0, wins: 0, losses: 0, profit: 0 }, SELL: { total: 0, wins: 0, losses: 0, profit: 0 } };
    trades.forEach(t => {
      if (byType[t.type]) {
        byType[t.type].total++;
        if (t.profit > 0) byType[t.type].wins++;
        else if (t.profit < 0) byType[t.type].losses++;
        byType[t.type].profit += t.profit || 0;
      }
    });
    Object.keys(byType).forEach(type => byType[type].winRate = byType[type].total ? ((byType[type].wins / byType[type].total) * 100).toFixed(1) : 0);

    // By Strategy
    const byStrategy = {};
    trades.forEach(t => {
      const strat = t.strategy || "Unspecified";
      if (!byStrategy[strat]) byStrategy[strat] = { total: 0, wins: 0, losses: 0, profit: 0 };
      byStrategy[strat].total++;
      if (t.profit > 0) byStrategy[strat].wins++;
      else if (t.profit < 0) byStrategy[strat].losses++;
      byStrategy[strat].profit += t.profit || 0;
    });
    Object.keys(byStrategy).forEach(strat => byStrategy[strat].winRate = ((byStrategy[strat].wins / byStrategy[strat].total) * 100).toFixed(1));

    // By Session (determine from time)
    const bySession = {
      "Asia Session": { total: 0, wins: 0, losses: 0, profit: 0 },
      "London Session": { total: 0, wins: 0, losses: 0, profit: 0 },
      "NY Session": { total: 0, wins: 0, losses: 0, profit: 0 },
      "Other": { total: 0, wins: 0, losses: 0, profit: 0 }
    };

    trades.forEach(t => {
      const hour = new Date(t.createdAt).getUTCHours();
      let session = "Other";

      // UTC hours for sessions
      // Asia: 0-8 (midnight to 8am UTC)
      // London: 8-16 (8am to 4pm UTC) 
      // NY: 13-21 (1pm to 9pm UTC) - overlaps with London

      if (hour >= 0 && hour < 8) session = "Asia Session";
      else if (hour >= 8 && hour < 16) session = "London Session";
      else if (hour >= 13 && hour < 21) session = "NY Session";

      // Use stored session if available
      if (t.session) {
        session = t.session;
        if (!bySession[session]) bySession[session] = { total: 0, wins: 0, losses: 0, profit: 0 };
      }

      bySession[session].total++;
      if (t.profit > 0) bySession[session].wins++;
      else if (t.profit < 0) bySession[session].losses++;
      bySession[session].profit += t.profit || 0;
    });

    Object.keys(bySession).forEach(session => {
      bySession[session].winRate = bySession[session].total ? ((bySession[session].wins / bySession[session].total) * 100).toFixed(1) : 0;
    });

    res.json({ byPair, byType, byStrategy, bySession });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. Performance Metrics
exports.getPerformanceMetrics = async (req, res) => {
  try {
    const query = { user: req.user._id };
    const trades = await Trade.find(query).sort({ createdAt: 1 });

    const winningTrades = trades.filter(t => t.profit > 0);
    const losingTrades = trades.filter(t => t.profit < 0);

    const largestWin = winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.profit)) : 0;
    const largestLoss = losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.profit)) : 0;

    const avgWin = winningTrades.length ? winningTrades.reduce((acc, t) => acc + t.profit, 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length ? losingTrades.reduce((acc, t) => acc + t.profit, 0) / losingTrades.length : 0;

    let maxWinStreak = 0, maxLossStreak = 0, tempWinStreak = 0, tempLossStreak = 0;
    trades.forEach(t => {
      if (t.profit > 0) { tempWinStreak++; tempLossStreak = 0; maxWinStreak = Math.max(maxWinStreak, tempWinStreak); }
      else if (t.profit < 0) { tempLossStreak++; tempWinStreak = 0; maxLossStreak = Math.max(maxLossStreak, tempLossStreak); }
    });

    const totalWins = winningTrades.reduce((acc, t) => acc + t.profit, 0);
    const totalLosses = Math.abs(losingTrades.reduce((acc, t) => acc + t.profit, 0));
    const profitFactor = totalLosses > 0 ? (totalWins / totalLosses).toFixed(2) : totalWins > 0 ? "∞" : "0.00";

    const winRate = trades.length ? (winningTrades.length / trades.length) * 100 : 0;
    const expectancy = ((avgWin * (winRate / 100)) + (avgLoss * ((100 - winRate) / 100))).toFixed(2);

    res.json({
      largestWin: largestWin.toFixed(2),
      largestLoss: largestLoss.toFixed(2),
      avgWin: avgWin.toFixed(2),
      avgLoss: avgLoss.toFixed(2),
      maxWinStreak,
      maxLossStreak,
      profitFactor,
      expectancy,
      totalWins: totalWins.toFixed(2),
      totalLosses: totalLosses.toFixed(2),
      winRate: winRate.toFixed(1),
      losingTradesCount: losingTrades.length,
      winningTradesCount: winningTrades.length,
      recoveryFactor: "0"
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 4. Time Analysis (Fixed)
exports.getTimeAnalysis = async (req, res) => {
  try {
    const query = { user: req.user._id };
    let trades = await Trade.find(query);

    // Optional date range filter for "byDay/byHour" style widgets.
    // range=all (default) | range=thisWeek
    const range = (req.query.range || "all").toString();
    if (range === "thisWeek") {
      const nowLocal = getAnalyticsLocalDate(new Date());
      const startOfToday = new Date(nowLocal);
      startOfToday.setHours(0, 0, 0, 0);
      // Monday-based week start
      const day = startOfToday.getDay(); // 0=Sun..6=Sat
      const daysSinceMonday = (day + 6) % 7;
      const weekStart = new Date(startOfToday);
      weekStart.setDate(weekStart.getDate() - daysSinceMonday);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      trades = trades.filter(t => {
        const d = getAnalyticsLocalDate(t.createdAt);
        return d >= weekStart && d < weekEnd;
      });
    }

    // By Month
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const byMonth = {};

    trades.forEach(t => {
      const date = getAnalyticsLocalDate(t.createdAt);
      const key = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      if (!byMonth[key]) byMonth[key] = { total: 0, wins: 0, losses: 0, profit: 0, avgProfit: 0 };
      byMonth[key].total++;
      if (t.profit > 0) byMonth[key].wins++;
      else if (t.profit < 0) byMonth[key].losses++;
      byMonth[key].profit += t.profit || 0;
    });

    // Calculate win rates for months
    Object.keys(byMonth).forEach(month => {
      byMonth[month].winRate = byMonth[month].total ? ((byMonth[month].wins / byMonth[month].total) * 100).toFixed(1) : 0;
      byMonth[month].avgProfit = byMonth[month].total ? (byMonth[month].profit / byMonth[month].total).toFixed(2) : 0;
    });

    // By Day of Week
    const byDay = {
      Monday: { total: 0, wins: 0, losses: 0, profit: 0, winRate: 0, avgProfit: 0 },
      Tuesday: { total: 0, wins: 0, losses: 0, profit: 0, winRate: 0, avgProfit: 0 },
      Wednesday: { total: 0, wins: 0, losses: 0, profit: 0, winRate: 0, avgProfit: 0 },
      Thursday: { total: 0, wins: 0, losses: 0, profit: 0, winRate: 0, avgProfit: 0 },
      Friday: { total: 0, wins: 0, losses: 0, profit: 0, winRate: 0, avgProfit: 0 },
      Saturday: { total: 0, wins: 0, losses: 0, profit: 0, winRate: 0, avgProfit: 0 },
      Sunday: { total: 0, wins: 0, losses: 0, profit: 0, winRate: 0, avgProfit: 0 }
    };
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    trades.forEach(t => {
      const day = dayNames[getAnalyticsLocalDate(t.createdAt).getDay()];
      if (byDay[day]) {
        byDay[day].total++;
        if (t.profit > 0) byDay[day].wins++;
        else if (t.profit < 0) byDay[day].losses++;
        byDay[day].profit += t.profit || 0;
      }
    });

    Object.keys(byDay).forEach(day => {
      byDay[day].winRate = byDay[day].total ? ((byDay[day].wins / byDay[day].total) * 100).toFixed(1) : 0;
      byDay[day].avgProfit = byDay[day].total ? (byDay[day].profit / byDay[day].total).toFixed(2) : 0;
    });

    // By Hour (0-23)
    const byHour = {};
    for (let i = 0; i < 24; i++) { byHour[i] = { total: 0, wins: 0, losses: 0, profit: 0, winRate: 0, avgProfit: 0 }; }

    trades.forEach(t => {
      const hour = getAnalyticsLocalDate(t.createdAt).getHours();
      byHour[hour].total++;
      if (t.profit > 0) byHour[hour].wins++;
      else if (t.profit < 0) byHour[hour].losses++;
      byHour[hour].profit += t.profit || 0;
    });

    Object.keys(byHour).forEach(hour => {
      byHour[hour].winRate = byHour[hour].total ? ((byHour[hour].wins / byHour[hour].total) * 100).toFixed(1) : 0;
      byHour[hour].avgProfit = byHour[hour].total ? (byHour[hour].profit / byHour[hour].total).toFixed(2) : 0;
    });

    // Find best and worst (handle single trade case)
    const dayEntries = Object.entries(byDay).filter(([_, d]) => d.total > 0);
    let bestDay = ["0", { profit: 0, winRate: 0 }];
    let worstDay = ["0", { profit: 0, winRate: 0 }];

    if (dayEntries.length > 0) {
      // Worst day is always the lowest profit (most negative).
      worstDay = dayEntries.reduce((a, b) =>
        parseFloat(a[1].profit) < parseFloat(b[1].profit) ? a : b
      );

      // Best day should only be counted if there is at least one POSITIVE day.
      const positiveDays = dayEntries.filter(
        ([_, d]) => parseFloat(d.profit) > 0
      );
      if (positiveDays.length > 0) {
        bestDay = positiveDays.reduce((a, b) =>
          parseFloat(a[1].profit) > parseFloat(b[1].profit) ? a : b
        );
      }
    }

    const bestDayWinRate =
      dayEntries.length > 1
        ? dayEntries.reduce((a, b) =>
            parseFloat(a[1].winRate) > parseFloat(b[1].winRate) ? a : b
          )
        : ["0", { winRate: 0 }];
    const worstDayWinRate =
      dayEntries.length > 1
        ? dayEntries.reduce((a, b) =>
            parseFloat(a[1].winRate) < parseFloat(b[1].winRate) ? a : b
          )
        : ["0", { winRate: 0 }];

    const hourEntries = Object.entries(byHour).filter(([_, h]) => h.total > 0);
    let bestHour = [0, { profit: 0, winRate: 0 }];
    let worstHour = [0, { profit: 0, winRate: 0 }];

    if (hourEntries.length > 0) {
      // Worst hour is always the lowest profit.
      worstHour = hourEntries.reduce((a, b) =>
        parseFloat(a[1].profit) < parseFloat(b[1].profit) ? a : b
      );

      // Best hour only if there is at least one positive hour.
      const positiveHours = hourEntries.filter(
        ([_, h]) => parseFloat(h.profit) > 0
      );
      if (positiveHours.length > 0) {
        bestHour = positiveHours.reduce((a, b) =>
          parseFloat(a[1].profit) > parseFloat(b[1].profit) ? a : b
        );
      }
    }

    const bestHourWinRate = hourEntries.length > 1 ? hourEntries.reduce((a, b) => parseFloat(a[1].winRate) > parseFloat(b[1].winRate) ? a : b) : [0, { winRate: 0 }];

    // Session Analysis
    // IMPORTANT: Only respect the session explicitly chosen by the user
    // (trade.session). If none is set, bucket into "Unspecified", but we
    // don't treat that as a "best" session in the summary.
    const bySession = {};

    trades.forEach(t => {
      const session = t.session || "Unspecified";
      if (!bySession[session]) {
        bySession[session] = {
          total: 0,
          wins: 0,
          losses: 0,
          profit: 0,
          winRate: 0,
          avgProfit: 0
        };
      }

      bySession[session].total++;
      if (t.profit > 0) bySession[session].wins++;
      else if (t.profit < 0) bySession[session].losses++;
      bySession[session].profit += t.profit || 0;
    });

    Object.keys(bySession).forEach(session => {
      const s = bySession[session];
      s.winRate = s.total ? ((s.wins / s.total) * 100).toFixed(1) : 0;
      s.avgProfit = s.total ? (s.profit / s.total).toFixed(2) : 0;
    });

    const sessionEntries = Object.entries(bySession).filter(
      ([name, s]) => name !== "Unspecified" && s.total > 0
    );

    let bestSession = ["0", { profit: 0, winRate: 0, total: 0 }];
    let worstSession = ["0", { profit: 0, winRate: 0, total: 0 }];

    if (sessionEntries.length > 0) {
      // Worst session is always the lowest profit.
      worstSession = sessionEntries.reduce((a, b) =>
        parseFloat(a[1].profit) < parseFloat(b[1].profit) ? a : b
      );

      // Best session only if there is at least one positive session.
      const positiveSessions = sessionEntries.filter(
        ([_, s]) => parseFloat(s.profit) > 0
      );
      if (positiveSessions.length > 0) {
        bestSession = positiveSessions.reduce((a, b) =>
          parseFloat(a[1].profit) > parseFloat(b[1].profit) ? a : b
        );
      }
    }

    const bestSessionWR =
      sessionEntries.length > 1
        ? sessionEntries.reduce((a, b) =>
            parseFloat(a[1].winRate) > parseFloat(b[1].winRate) ? a : b
          )
        : ["0", { winRate: 0, total: 0 }];

    res.json({
      byMonth,
      byDay,
      byHour,
      bySession,
      bestDay: { name: bestDay[0], profit: parseFloat(bestDay[1].profit).toFixed(2), winRate: bestDay[1].winRate },
      worstDay: { name: worstDay[0], profit: parseFloat(worstDay[1].profit).toFixed(2), winRate: worstDay[1].winRate },
      bestDayWinRate: { name: bestDayWinRate[0], winRate: bestDayWinRate[1].winRate },
      worstDayWinRate: { name: worstDayWinRate[0], winRate: worstDayWinRate[1].winRate },
      bestHour: { hour: bestHour[0], profit: parseFloat(bestHour[1].profit).toFixed(2), winRate: bestHour[1].winRate },
      worstHour: { hour: worstHour[0], profit: parseFloat(worstHour[1].profit).toFixed(2), winRate: worstHour[1].winRate },
      bestHourWinRate: { hour: bestHourWinRate[0], winRate: bestHourWinRate[1].winRate },
      bestSession: { name: bestSession[0], profit: parseFloat(bestSession[1].profit).toFixed(2), winRate: bestSession[1].winRate, trades: bestSession[1].total },
      worstSession: { name: worstSession[0], profit: parseFloat(worstSession[1].profit).toFixed(2), winRate: worstSession[1].winRate, trades: worstSession[1].total },
      bestSessionWR: { name: bestSessionWR[0], winRate: bestSessionWR[1].winRate, trades: bestSessionWR[1].total }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 5. Trade Quality
exports.getTradeQuality = async (req, res) => {
  try {
    const query = { user: req.user._id };
    const trades = await Trade.find(query);

    const rrRanges = [
      { label: "0-0.5R", min: 0, max: 0.5, trades: [] },
      { label: "0.5-1R", min: 0.5, max: 1, trades: [] },
      { label: "1-1.5R", min: 1, max: 1.5, trades: [] },
      { label: "1.5-2R", min: 1.5, max: 2, trades: [] },
      { label: "2-3R", min: 2, max: 3, trades: [] },
      { label: "3R+", min: 3, max: Infinity, trades: [] }
    ];

    trades.forEach(t => {
      if (t.stopLoss && t.takeProfit && t.entryPrice) {
        const risk = Math.abs(t.entryPrice - t.stopLoss);
        const reward = Math.abs(t.takeProfit - t.entryPrice);
        const rr = risk > 0 ? reward / risk : 0;
        rrRanges.forEach(range => {
          if (rr >= range.min && rr < range.max) range.trades.push({ profit: t.profit, win: t.profit > 0 });
        });
      }
    });

    const rrAnalysis = rrRanges.map(range => {
      const total = range.trades.length;
      const wins = range.trades.filter(t => t.win).length;
      return {
        label: range.label,
        total,
        wins,
        losses: total - wins,
        winRate: total ? ((wins / total) * 100).toFixed(1) : 0,
        avgProfit: total ? (range.trades.reduce((a, t) => a + t.profit, 0) / total).toFixed(2) : 0
      };
    }).filter(r => r.total > 0);

    const breakevenTrades = trades.filter(t => Math.abs(t.profit) < 5);
    const breakevenRate = trades.length ? ((breakevenTrades.length / trades.length) * 100).toFixed(1) : 0;

    const totalCommission = trades.reduce((acc, t) => acc + (t.commission || 0), 0);
    const totalSwap = trades.reduce((acc, t) => acc + (t.swap || 0), 0);
    const totalCosts = totalCommission + totalSwap;

    let costImpactedTrades = 0;
    trades.forEach(t => { if (t.profit > 0 && (t.commission || 0) + (t.swap || 0) > t.profit) costImpactedTrades++; });

    const winningTrades = trades.filter(t => t.profit > 0).length;
    const avgRR = rrAnalysis.length > 0 ? rrAnalysis.reduce((a, r) => a + parseFloat(r.label), 0) / rrAnalysis.length : 0;
    const qualityScore = Math.min(100, Math.max(0, (winningTrades / Math.max(1, trades.length)) * 50 + (100 - parseFloat(breakevenRate)) * 0.3 + Math.min(20, avgRR * 5))).toFixed(0);

    res.json({
      rrAnalysis,
      breakevenTrades: breakevenTrades.length,
      breakevenRate,
      totalCommission: totalCommission.toFixed(2),
      totalSwap: totalSwap.toFixed(2),
      totalCosts: totalCosts.toFixed(2),
      costImpactedTrades,
      qualityScore,
      tradesWithRR: trades.filter(t => t.stopLoss && t.takeProfit && t.entryPrice).length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 6. Drawdown Analysis
exports.getDrawdownAnalysis = async (req, res) => {
  try {
    const query = { user: req.user._id };
    const trades = await Trade.find(query).sort({ createdAt: 1 });

    if (trades.length === 0) {
      return res.json({ currentDrawdown: 0, maxDrawdown: 0, maxDrawdownPercent: 0, recoveryFactor: 0, avgDrawdown: 0, drawdownDuration: 0, equityCurve: [] });
    }

    let balance = trades[0].balance || 10000;
    let peak = balance;
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;
    const equityCurve = [];

    trades.forEach(t => {
      balance += t.profit || 0;
      equityCurve.push({ date: t.createdAt, balance });
      if (balance > peak) peak = balance;
      const drawdown = peak - balance;
      if (drawdown > maxDrawdown) { maxDrawdown = drawdown; maxDrawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0; }
    });

    const totalProfit = trades.reduce((acc, t) => acc + (t.profit || 0), 0);
    const currentDrawdown = peak - balance;
    const currentDrawdownPercent = peak > 0 ? (currentDrawdown / peak) * 100 : 0;
    const recoveryFactor = maxDrawdown > 0 ? totalProfit / maxDrawdown : 0;

    res.json({
      currentDrawdown: currentDrawdown.toFixed(2),
      currentDrawdownPercent: currentDrawdownPercent.toFixed(1),
      maxDrawdown: maxDrawdown.toFixed(2),
      maxDrawdownPercent: maxDrawdownPercent.toFixed(1),
      recoveryFactor: recoveryFactor.toFixed(2),
      avgDrawdown: "0",
      drawdownDurationDays: 0,
      peakBalance: peak.toFixed(2),
      currentBalance: balance.toFixed(2),
      totalProfit: totalProfit.toFixed(2),
      equityCurve: equityCurve.slice(-30),
      drawdownPeriods: []
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 7. AI Insights (Enhanced with Session)
exports.getAIInsights = async (req, res) => {
  try {
    const query = { user: req.user._id };
    const trades = await Trade.find(query);

    if (trades.length < 5) {
      return res.json({
        insights: ["Not enough data for AI analysis. Keep logging trades!"],
        recommendations: ["Log at least 10 trades for meaningful insights"],
        score: 0
      });
    }

    const winningTrades = trades.filter(t => t.profit > 0);
    const losingTrades = trades.filter(t => t.profit < 0);
    const winRate = (winningTrades.length / trades.length) * 100;
    const totalProfit = trades.reduce((acc, t) => acc + (t.profit || 0), 0);
    const avgWin = winningTrades.length ? winningTrades.reduce((acc, t) => acc + t.profit, 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length ? Math.abs(losingTrades.reduce((acc, t) => acc + t.profit, 0) / losingTrades.length) : 0;

    const insights = [];
    const recommendations = [];

    // Win rate insights
    if (winRate >= 60) insights.push(`🔥 Excellent win rate of ${winRate.toFixed(1)}% - Your strategy has a strong edge!`);
    else if (winRate >= 50) insights.push(`✅ Good win rate of ${winRate.toFixed(1)}% - You're above breakeven`);
    else if (winRate < 40) insights.push(`⚠️ Win rate of ${winRate.toFixed(1)}% is below optimal - Consider reviewing your entries`);

    // R:R insights
    if (avgWin > 0 && avgLoss > 0) {
      const rr = avgWin / avgLoss;
      if (rr >= 2) insights.push(`📊 Great risk-reward ratio of 1:${rr.toFixed(1)} - You need fewer wins to be profitable`);
      else if (rr < 1) insights.push(`⚠️ Risk-reward ratio of 1:${rr.toFixed(1)} is unfavorable - Aim for at least 1:1.5`);
    }

    // Profit insights
    if (totalProfit > 0) insights.push(`💰 Total profit: $${totalProfit.toFixed(2)} - Keep up the good work!`);
    else insights.push(`📉 Currently in drawdown - Stay disciplined and follow your rules`);

    // Session Analysis (used for both insights and structured analytics)
    const bySession = {};

    trades.forEach(t => {
      const session = t.session || "Unspecified";
      if (!bySession[session]) {
        bySession[session] = { profit: 0, wins: 0, total: 0 };
      }
      bySession[session].total++;
      bySession[session].profit += t.profit || 0;
      if (t.profit > 0) bySession[session].wins++;
    });

    const sessionEntries = Object.entries(bySession).filter(
      ([name, s]) => name !== "Unspecified" && s.total > 0
    );

    let bestSessionEntry = null;
    let bestSessionWinRateEntry = null;

    if (sessionEntries.length > 0) {
      bestSessionEntry = sessionEntries.reduce((a, b) => a[1].profit > b[1].profit ? a : b);
      bestSessionWinRateEntry = sessionEntries.reduce(
        (a, b) => (a[1].wins / a[1].total) > (b[1].wins / b[1].total) ? a : b
      );

      if (bestSessionEntry[1].profit > 0) {
        insights.push(`🌏 Best trading session: ${bestSessionEntry[0]} ($${bestSessionEntry[1].profit.toFixed(2)})`);
      }
      insights.push(
        `📈 Highest win rate: ${bestSessionWinRateEntry[0]} (${(
          (bestSessionWinRateEntry[1].wins / bestSessionWinRateEntry[1].total) *
          100
        ).toFixed(1)}%)`
      );

      // Recommendations for sessions
      if (
        bestSessionEntry[0] !== "London (08-16 UTC)" &&
        bestSessionEntry[0] !== "Overlap (13-16 UTC)"
      ) {
        recommendations.push(
          `Consider trading during ${bestSessionEntry[0]} - your most profitable session`
        );
      }
    }

    // Pair analysis
    const pairStats = {};
    trades.forEach(t => {
      if (!pairStats[t.pair]) pairStats[t.pair] = { wins: 0, total: 0, profit: 0 };
      pairStats[t.pair].total++;
      if (t.profit > 0) pairStats[t.pair].wins++;
      pairStats[t.pair].profit += t.profit || 0;
    });
    const pairs = Object.entries(pairStats).map(([name, stats]) => ({
      name,
      winRate: ((stats.wins / stats.total) * 100).toFixed(1),
      profit: stats.profit.toFixed(2),
      count: stats.total
    })).sort((a, b) => parseFloat(b.profit) - parseFloat(a.profit));

    if (pairs.length > 0 && parseFloat(pairs[0].profit) > 0) insights.push(`🎯 Best performing pair: ${pairs[0].name} ($${pairs[0].profit})`);
    if (pairs.length > 2) recommendations.push(`Focus on: ${pairs.slice(0, 2).map(p => p.name).join(", ")} - your top performers`);

    // Day analysis
    const dayStats = { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0 };
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    trades.forEach(t => {
      const day = dayNames[getAnalyticsLocalDate(t.createdAt).getDay()];
      if (dayStats[day] !== undefined) dayStats[day] += t.profit || 0;
    });
    const bestDay = Object.entries(dayStats).reduce((a, b) => a[1] > b[1] ? a : b);
    if (bestDay[1] > 0) {
      insights.push(`📅 Most profitable day: ${bestDay[0]} ($${bestDay[1].toFixed(2)})`);
      recommendations.push(`Focus your trading on ${bestDay[0]} - your best performing day`);
    }

    const worstDay = Object.entries(dayStats).reduce((a, b) => a[1] < b[1] ? a : b);
    if (worstDay[1] < -50) {
      recommendations.push(`Avoid or reduce size on ${worstDay[0]} - your least profitable day`);
    }

    // =====================================================
    // NEW: Structured analytics for AI Analytics page
    // =====================================================

    // 1) Behavior & discipline (Rule vs Emotion + plan adherence + revenge)
    const behaviorBuckets = {
      Plan: { count: 0, pnl: 0 },
      Emotion: { count: 0, pnl: 0 },
      Impulsive: { count: 0, pnl: 0 },
      Other: { count: 0, pnl: 0 }
    };

    trades.forEach(t => {
      const key =
        t.entryBasis === "Plan" ||
        t.entryBasis === "Emotion" ||
        t.entryBasis === "Impulsive"
          ? t.entryBasis
          : "Other";
      behaviorBuckets[key].count += 1;
      behaviorBuckets[key].pnl += t.profit || 0;
    });

    const behaviorTotal = trades.length || 1;
    const behaviorRuleEmotion = {
      planPct: ((behaviorBuckets.Plan.count / behaviorTotal) * 100).toFixed(1),
      emotionPct: (
        ((behaviorBuckets.Emotion.count + behaviorBuckets.Impulsive.count) / behaviorTotal) *
        100
      ).toFixed(1),
      planPnl: behaviorBuckets.Plan.pnl.toFixed(2),
      emotionPnl: (behaviorBuckets.Emotion.pnl + behaviorBuckets.Impulsive.pnl).toFixed(2)
    };

    // Weekly plan adherence timeline
    const weeklyPlan = {};
    trades.forEach(t => {
      const d = new Date(t.createdAt);
      const year = d.getFullYear();
      const week = Math.ceil(((d - new Date(year, 0, 1)) / 86400000 + d.getDay() + 1) / 7);
      const key = `${year}-W${week}`;
      if (!weeklyPlan[key]) {
        weeklyPlan[key] = { total: 0, plan: 0 };
      }
      weeklyPlan[key].total += 1;
      if (t.entryBasis === "Plan") weeklyPlan[key].plan += 1;
    });

    const planTimeline = Object.entries(weeklyPlan)
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([week, v]) => ({
        week,
        planAdherencePct: v.total ? ((v.plan / v.total) * 100).toFixed(1) : "0.0"
      }));

    // Revenge trading detector (size up immediately after a loss)
    const revengeTrades = [];
    for (let i = 1; i < trades.length; i++) {
      const prev = trades[i - 1];
      const curr = trades[i];

      const prevLoss = (prev.profit || 0) < 0;

      const prevRisk =
        prev.entryPrice && prev.stopLoss ? Math.abs(prev.entryPrice - prev.stopLoss) : 0;
      const currRisk =
        curr.entryPrice && curr.stopLoss ? Math.abs(curr.entryPrice - curr.stopLoss) : 0;

      const sameDay =
        new Date(prev.createdAt).toDateString() === new Date(curr.createdAt).toDateString();

      if (prevLoss && sameDay && prevRisk > 0 && currRisk > prevRisk * 1.5) {
        revengeTrades.push({
          id: curr._id,
          pair: curr.pair,
          createdAt: curr.createdAt,
          prevProfit: prev.profit,
          currRisk,
          prevRisk
        });
      }
    }

    const behaviorDiscipline = {
      ruleEmotion: behaviorRuleEmotion,
      planTimeline,
      revengeTradesCount: revengeTrades.length,
      revengeTrades: revengeTrades.slice(-10) // cap payload
    };

    // 2) Session edge card
    const sessionEdge = sessionEntries.map(([name, s]) => {
      const wr = s.total ? (s.wins / s.total) * 100 : 0;
      return {
        session: name,
        winRate: wr.toFixed(1),
        avgProfit: (s.total ? s.profit / s.total : 0).toFixed(2),
        totalProfit: (s.profit || 0).toFixed(2),
        trades: s.total,
        tag: s.profit > 0 ? "Green" : "Red"
      };
    });

    // 3) Psychological patterns: after-win / after-loss + tilt days
    const afterBigWin = [];
    const afterBigLoss = [];
    const tiltDays = [];

    // Define "big" as > 1.5x avg absolute loss if available
    let avgAbsLoss = 0;
    if (losingTrades.length > 0) {
      avgAbsLoss =
        Math.abs(
          losingTrades.reduce((acc, t) => acc + (t.profit || 0), 0) / losingTrades.length
        ) || 0;
    }
    const bigThreshold = avgAbsLoss > 0 ? avgAbsLoss * 1.5 : 0;

    // After big win/loss
    for (let i = 1; i < trades.length; i++) {
      const prev = trades[i - 1];
      const curr = trades[i];
      const prevPnl = prev.profit || 0;

      if (bigThreshold > 0) {
        if (prevPnl >= bigThreshold) {
          afterBigWin.push(curr);
        } else if (prevPnl <= -bigThreshold) {
          afterBigLoss.push(curr);
        }
      }
    }

    const calcBucketStats = bucket => {
      if (!bucket.length) return { trades: 0, winRate: "0.0", avgProfit: "0.00" };
      const winsLocal = bucket.filter(t => (t.profit || 0) > 0).length;
      const pnlLocal = bucket.reduce((acc, t) => acc + (t.profit || 0), 0);
      return {
        trades: bucket.length,
        winRate: ((winsLocal / bucket.length) * 100).toFixed(1),
        avgProfit: (pnlLocal / bucket.length).toFixed(2)
      };
    };

    // Tilt: 3+ losing trades in a row with increasing size (risk or lot)
    let currentStreak = [];
    const pushTiltStreakIfNeeded = () => {
      if (currentStreak.length >= 3) {
        const increasing =
          currentStreak.every((t, idx) => {
            if (idx === 0) return true;
            const prev = currentStreak[idx - 1];
            const sizePrev = prev.lotSize || 0;
            const sizeCurr = t.lotSize || 0;
            return sizeCurr >= sizePrev;
          }) || false;

        if (increasing) {
          const day = new Date(currentStreak[0].createdAt).toDateString();
          tiltDays.push({
            day,
            streakLength: currentStreak.length,
            totalLoss: currentStreak.reduce((acc, t) => acc + (t.profit || 0), 0).toFixed(2)
          });
        }
      }
      currentStreak = [];
    };

    trades.forEach(t => {
      const pnl = t.profit || 0;
      if (pnl < 0) {
        currentStreak.push(t);
      } else {
        pushTiltStreakIfNeeded();
      }
    });
    pushTiltStreakIfNeeded();

    const psychologicalPatterns = {
      afterBigWin: calcBucketStats(afterBigWin),
      afterBigLoss: calcBucketStats(afterBigLoss),
      tiltDays
    };

    // 4) Strategy performance league table
    const strategyStats = {};
    trades.forEach(t => {
      const key = t.strategy || "Unspecified";
      if (!strategyStats[key]) {
        strategyStats[key] = { trades: 0, wins: 0, pnl: 0 };
      }
      strategyStats[key].trades += 1;
      strategyStats[key].pnl += t.profit || 0;
      if ((t.profit || 0) > 0) strategyStats[key].wins += 1;
    });

    const strategyLeague = Object.entries(strategyStats)
      .map(([name, s]) => ({
        strategy: name,
        trades: s.trades,
        winRate: s.trades ? ((s.wins / s.trades) * 100).toFixed(1) : "0.0",
        totalProfit: s.pnl.toFixed(2),
        avgProfit: (s.trades ? s.pnl / s.trades : 0).toFixed(2)
      }))
      .sort((a, b) => parseFloat(b.totalProfit) - parseFloat(a.totalProfit));

    // 5) Weekly narrative + checklist (plain language)
    const recentWeeks = planTimeline.slice(-4);
    const latestWeek = recentWeeks[recentWeeks.length - 1];

    const bestSessionStructured =
      bestSessionEntry && bestSessionEntry[1].profit > 0 ? bestSessionEntry[0] : null;

    const worstHourEntry = Object.entries(dayStats).reduce((a, b) => (a[1] < b[1] ? a : b));

    const weeklyNarrativeParts = [];
    if (latestWeek) {
      weeklyNarrativeParts.push(
        `This week you followed your plan on ${latestWeek.planAdherencePct}% of trades.`
      );
    }
    if (bestSessionStructured) {
      weeklyNarrativeParts.push(
        `Most of your profit came from the ${bestSessionStructured} session.`
      );
    }
    if (worstDay[1] < 0) {
      weeklyNarrativeParts.push(
        `You lost the most on ${worstDay[0]}, especially when trading outside your best conditions.`
      );
    }
    const weeklyNarrative = weeklyNarrativeParts.join(" ");

    const nextWeekChecklist = [];
    if (behaviorRuleEmotion.planPct < 70) {
      nextWeekChecklist.push("Increase the share of 'Plan' trades above 70% by using your checklist.");
    }
    if (tiltDays.length > 0) {
      nextWeekChecklist.push("Avoid new trades after 3 consecutive losses or reduce size significantly.");
    }
    if (bestSessionStructured) {
      nextWeekChecklist.push(`Prioritize setups during the ${bestSessionStructured} session.`);
    }
    if (nextWeekChecklist.length === 0) {
      nextWeekChecklist.push("Keep following your current process; maintain discipline and journaling.");
    }

    // Risk management
    const tradesWithSL = trades.filter(t => t.stopLoss).length;
    if (tradesWithSL / trades.length < 0.5) recommendations.push(`⚠️ Use stop losses on more trades - only ${((tradesWithSL / trades.length) * 100).toFixed(0)}% have SL set`);

    // Calculate score
    let score = 50;
    score += Math.min(20, winRate - 40);
    if (avgWin / Math.max(0.01, avgLoss) >= 2) score += 15;
    if (totalProfit > 0) score += 15;
    if (tradesWithSL / Math.max(1, trades.length) >= 0.8) score += 10;
    score = Math.min(100, Math.max(0, score));

    res.json({
      insights,
      recommendations,
      score: score.toFixed(0),
      // New structured analytics payloads for the AI Analytics page
      behaviorDiscipline,
      sessionEdge,
      psychologicalPatterns,
      strategyLeague,
      weeklyNarrative,
      nextWeekChecklist,
      topStrategies: [],
      topPairs: pairs.slice(0, 5),
      bestDay: bestDay[0],
      worstDay: worstDay[0],
      bestSession:
        bestSessionEntry && bestSessionEntry[1].profit > 0 ? bestSessionEntry[0] : null,
      stats: {
        totalTrades: trades.length,
        winRate: winRate.toFixed(1),
        avgWin: avgWin.toFixed(2),
        avgLoss: avgLoss.toFixed(2),
        profitFactor:
          avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : avgWin > 0 ? "∞" : "0.00"
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 8. Advanced Analytics (all-in-one)
exports.getAdvancedAnalytics = async (req, res) => {
  try {
    const query = { user: req.user._id };
    const trades = await Trade.find(query).sort({ createdAt: 1 });

    const totalTrades = trades.length;
    const totalProfit = trades.reduce((acc, t) => acc + (t.profit || 0), 0);
    const wins = trades.filter(t => t.profit > 0).length;
    const winRate = totalTrades ? (wins / totalTrades) * 100 : 0;

    const winningTrades = trades.filter(t => t.profit > 0);
    const losingTrades = trades.filter(t => t.profit < 0);
    const avgWin = winningTrades.length ? winningTrades.reduce((acc, t) => acc + t.profit, 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length ? Math.abs(losingTrades.reduce((acc, t) => acc + t.profit, 0) / losingTrades.length) : 0;

    const totalCommission = trades.reduce((acc, t) => acc + (t.commission || 0), 0);
    const totalSwap = trades.reduce((acc, t) => acc + (t.swap || 0), 0);
    const netProfit = totalProfit - totalCommission - totalSwap;

    let maxWinStreak = 0, maxLossStreak = 0, tempWinStreak = 0, tempLossStreak = 0;
    trades.forEach(t => {
      if (t.profit > 0) { tempWinStreak++; tempLossStreak = 0; maxWinStreak = Math.max(maxWinStreak, tempWinStreak); }
      else if (t.profit < 0) { tempLossStreak++; tempWinStreak = 0; maxLossStreak = Math.max(maxLossStreak, tempLossStreak); }
    });

    const totalWins = winningTrades.reduce((acc, t) => acc + t.profit, 0);
    const totalLosses = Math.abs(losingTrades.reduce((acc, t) => acc + t.profit, 0));
    const profitFactor = totalLosses > 0 ? (totalWins / totalLosses).toFixed(2) : totalWins > 0 ? "∞" : "0.00";

    let balance = trades[0]?.balance || 10000;
    let peak = balance, maxDrawdown = 0;
    trades.forEach(t => { balance += t.profit || 0; if (balance > peak) peak = balance; maxDrawdown = Math.max(maxDrawdown, peak - balance); });

    // RR with fallback
    let totalRR = 0, rrCount = 0;
    trades.forEach(t => {
      let trr = (t.entryPrice && t.stopLoss && t.takeProfit && Math.abs(t.entryPrice - t.stopLoss) > 0)
        ? Math.abs(t.takeProfit - t.entryPrice) / Math.abs(t.entryPrice - t.stopLoss)
        : 0;
      if (trr <= 0 && t.riskRewardRatio && t.riskRewardRatio.includes(":")) {
        const val = parseFloat(t.riskRewardRatio.split(":")[1]);
        if (!isNaN(val)) trr = val;
      }
      if (trr > 0) { totalRR += trr; rrCount++; }
    });
    const avgRR = rrCount > 0 ? totalRR / rrCount : (avgLoss > 0 ? avgWin / avgLoss : 0);

    let score = 50;
    score += Math.min(20, winRate - 40);
    if (avgRR >= 2) score += 15;
    if (totalProfit > 0) score += 15;
    const tradesWithSL = trades.filter(t => t.stopLoss).length;
    if (tradesWithSL / Math.max(1, trades.length) >= 0.8) score += 10;
    score = Math.min(100, Math.max(0, score));

    res.json({
      totalTrades,
      totalProfit: totalProfit.toFixed(2),
      netProfit: netProfit.toFixed(2),
      winRate: winRate.toFixed(1),
      avgWin: avgWin.toFixed(2),
      avgLoss: avgLoss.toFixed(2),
      avgRR: avgRR.toFixed(2),
      actualRR: avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : "0.00",
      profitFactor,
      maxWinStreak,
      maxLossStreak,
      maxDrawdown: maxDrawdown.toFixed(2),
      totalCosts: (totalCommission + totalSwap).toFixed(2),
      aiScore: score.toFixed(0),
      recentTrades: trades.slice(-10).reverse().map(t => ({ pair: t.pair, type: t.type, profit: t.profit, createdAt: t.createdAt }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
