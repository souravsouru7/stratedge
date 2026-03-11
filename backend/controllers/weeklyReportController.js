const WeeklyReport = require("../models/WeeklyReport");
const Trade = require("../models/Trade");
const IndianTrade = require("../models/IndianTrade");
const { generateWeeklyFeedback } = require("../services/geminiService");

const getLocalShiftMs = () => {
  const offsetHours = parseFloat(process.env.TIMEZONE_OFFSET_HOURS || "0");
  if (!offsetHours || Number.isNaN(offsetHours)) return 0;
  return offsetHours * 60 * 60 * 1000;
};

const startOfLocalDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Monday-based week boundaries in "local shifted time".
// Returns UTC dates to query createdAt so that:
// weekStartLocal <= createdAtLocal < weekEndLocal
const getRolling7dUtcRange = () => {
  const shiftMs = getLocalShiftMs();

  const nowUtc = new Date();
  const weekEndUtc = nowUtc;
  const weekStartUtc = new Date(nowUtc.getTime() - 7 * 24 * 60 * 60 * 1000);

  const weekStartLocal = new Date(weekStartUtc.getTime() + shiftMs);
  const weekEndLocal = new Date(weekEndUtc.getTime() + shiftMs);

  return {
    weekStartUtc,
    weekEndUtc,
    weekStartLocal,
    weekEndLocal,
  };
};

const computeSnapshot = (trades, marketType) => {
  const totalTrades = trades.length;
  const wins = trades.filter((t) => (t.profit || 0) > 0).length;
  const losses = trades.filter((t) => (t.profit || 0) < 0).length;
  const grossProfit = trades.reduce((acc, t) => acc + (t.profit || 0), 0);
  const isIndian = marketType === "Indian_Market";
  const commission = isIndian ? 0 : trades.reduce((acc, t) => acc + (t.commission || 0), 0);
  const swap = isIndian ? 0 : trades.reduce((acc, t) => acc + (t.swap || 0), 0);
  const brokerage = isIndian ? trades.reduce((acc, t) => acc + (t.brokerage || 0), 0) : 0;
  const sttTaxes = isIndian ? trades.reduce((acc, t) => acc + (t.sttTaxes || 0), 0) : 0;
  const netProfit = grossProfit - commission - swap - brokerage - sttTaxes;

  const winRatePct = totalTrades ? (wins / totalTrades) * 100 : 0;

  const winningTrades = trades.filter((t) => (t.profit || 0) > 0);
  const losingTrades = trades.filter((t) => (t.profit || 0) < 0);
  const avgWin = winningTrades.length
    ? winningTrades.reduce((acc, t) => acc + (t.profit || 0), 0) / winningTrades.length
    : 0;
  const avgLossAbs = losingTrades.length
    ? Math.abs(losingTrades.reduce((acc, t) => acc + (t.profit || 0), 0) / losingTrades.length)
    : 0;

  const totalWinsPnl = winningTrades.reduce((acc, t) => acc + (t.profit || 0), 0);
  const totalLossesAbs = Math.abs(losingTrades.reduce((acc, t) => acc + (t.profit || 0), 0));
  const profitFactor = totalLossesAbs > 0 ? totalWinsPnl / totalLossesAbs : totalWinsPnl > 0 ? Infinity : 0;

  // Discipline signals (market-specific)
  let discipline = {};
  if (!isIndian) {
    const scored = trades.filter((t) => typeof t.setupScore === "number");
    const avgSetupScore = scored.length
      ? scored.reduce((acc, t) => acc + t.setupScore, 0) / scored.length
      : null;

    const ruleBreakCounts = {};
    trades.forEach((t) => {
      if (!Array.isArray(t.setupRules)) return;
      t.setupRules.forEach((r) => {
        if (!r || !r.label) return;
        if (r.followed === false) {
          const k = String(r.label).trim();
          if (!k) return;
          ruleBreakCounts[k] = (ruleBreakCounts[k] || 0) + 1;
        }
      });
    });
    const topRuleBreaks = Object.entries(ruleBreakCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label, count }));

    discipline = {
      avgSetupScore: avgSetupScore === null ? null : Number(avgSetupScore.toFixed(1)),
      topRuleBreaks,
    };
  } else {
    // Indian Market: entryBasis + mistakeTag are present in schema
    const entryBasisCounts = { Plan: 0, Emotion: 0, Impulsive: 0, Other: 0 };
    const mistakeTagCounts = {};
    trades.forEach((t) => {
      const k =
        t.entryBasis === "Plan" || t.entryBasis === "Emotion" || t.entryBasis === "Impulsive"
          ? t.entryBasis
          : "Other";
      entryBasisCounts[k] += 1;

      const tag = (t.mistakeTag || "").trim() || "None";
      mistakeTagCounts[tag] = (mistakeTagCounts[tag] || 0) + 1;
    });
    const planPct = totalTrades ? (entryBasisCounts.Plan / totalTrades) * 100 : 0;
    const topMistakes = Object.entries(mistakeTagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label, count }));

    discipline = {
      entryBasis: {
        planPct: Number(planPct.toFixed(1)),
        emotionPct: Number(
          (totalTrades
            ? ((entryBasisCounts.Emotion + entryBasisCounts.Impulsive) / totalTrades) * 100
            : 0
          ).toFixed(1)
        ),
        counts: entryBasisCounts,
      },
      topMistakeTags: topMistakes,
    };
  }

  const byStrategy = {};
  const bySession = {};
  trades.forEach((t) => {
    const strat = t.strategy || "Unspecified";
    const sess = t.session || "Unspecified";
    if (!byStrategy[strat]) byStrategy[strat] = { trades: 0, wins: 0, net: 0 };
    if (!bySession[sess]) bySession[sess] = { trades: 0, wins: 0, net: 0 };
    byStrategy[strat].trades += 1;
    bySession[sess].trades += 1;
    const pnl = isIndian
      ? (t.profit || 0) - (t.brokerage || 0) - (t.sttTaxes || 0)
      : (t.profit || 0) - (t.commission || 0) - (t.swap || 0);
    byStrategy[strat].net += pnl;
    bySession[sess].net += pnl;
    if ((t.profit || 0) > 0) {
      byStrategy[strat].wins += 1;
      bySession[sess].wins += 1;
    }
  });

  const topStrategies = Object.entries(byStrategy)
    .map(([name, s]) => ({
      name,
      trades: s.trades,
      winRatePct: s.trades ? (s.wins / s.trades) * 100 : 0,
      net: s.net,
    }))
    .sort((a, b) => b.net - a.net)
    .slice(0, 5);

  const topSessions = Object.entries(bySession)
    .map(([name, s]) => ({
      name,
      trades: s.trades,
      winRatePct: s.trades ? (s.wins / s.trades) * 100 : 0,
      net: s.net,
    }))
    .sort((a, b) => b.net - a.net)
    .slice(0, 5);

  const bestTrades = [...trades]
    .sort((a, b) => (b.profit || 0) - (a.profit || 0))
    .slice(0, 3)
    .map((t) => ({
      id: t._id,
      pair: t.pair,
      profit: t.profit || 0,
      session: t.session || "",
      strategy: t.strategy || "",
      setupScore: typeof t.setupScore === "number" ? t.setupScore : null,
    }));

  const worstTrades = [...trades]
    .sort((a, b) => (a.profit || 0) - (b.profit || 0))
    .slice(0, 3)
    .map((t) => ({
      id: t._id,
      pair: t.pair,
      profit: t.profit || 0,
      session: t.session || "",
      strategy: t.strategy || "",
      setupScore: typeof t.setupScore === "number" ? t.setupScore : null,
    }));

  return {
    counts: { totalTrades, wins, losses },
    pnl: {
      gross: Number(grossProfit.toFixed(2)),
      costs: {
        commission: Number(commission.toFixed(2)),
        swap: Number(swap.toFixed(2)),
        brokerage: Number(brokerage.toFixed(2)),
        sttTaxes: Number(sttTaxes.toFixed(2)),
      },
      net: Number(netProfit.toFixed(2)),
    },
    rates: {
      winRatePct: Number(winRatePct.toFixed(1)),
      profitFactor: profitFactor === Infinity ? "∞" : Number(profitFactor.toFixed(2)),
      avgWin: Number(avgWin.toFixed(2)),
      avgLoss: Number(avgLossAbs.toFixed(2)),
    },
    discipline,
    breakdowns: {
      topStrategies,
      topSessions,
    },
    tradeSamples: { bestTrades, worstTrades },
  };
};

exports.listWeeklyReports = async (req, res) => {
  try {
    const marketType = (req.query.marketType || "Forex").toString();
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || "12", 10)));
    const reports = await WeeklyReport.find({ user: req.user._id, marketType })
      .sort({ weekStart: -1 })
      .limit(limit);
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getWeeklyReport = async (req, res) => {
  try {
    const report = await WeeklyReport.findOne({ _id: req.params.id, user: req.user._id });
    if (!report) return res.status(404).json({ message: "Report not found" });
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

async function generateRolling7dReportForUser({ userId, marketType }) {
  const isIndian = marketType === "Indian_Market";

  const { weekStartUtc, weekEndUtc, weekStartLocal, weekEndLocal } = getRolling7dUtcRange();
  const TradeModel = isIndian ? IndianTrade : Trade;
  const trades = await TradeModel.find({
    user: userId,
    createdAt: { $gte: weekStartUtc, $lt: weekEndUtc },
  }).sort({ createdAt: 1 });

  const weekLabel = `${weekStartLocal.toDateString()} → ${weekEndLocal.toDateString()} (Last 7 days)`;

  const snapshot = {
    week: {
      startUtc: weekStartUtc.toISOString(),
      endUtc: weekEndUtc.toISOString(),
      label: weekLabel,
      timezoneOffsetHours: parseFloat(process.env.TIMEZONE_OFFSET_HOURS || "0") || 0,
    },
    marketType,
    periodType: "rolling7d",
    ...computeSnapshot(trades, marketType),
  };

  // Upsert report shell first (so the week appears even if AI fails)
  const baseDoc = {
    user: userId,
    marketType,
    periodType: "rolling7d",
    weekStart: weekStartUtc,
    weekEnd: weekEndUtc,
    // NOTE: do not include snapshot here because we also $set snapshot below.
    // MongoDB rejects updates that try to set the same path in multiple operators.
  };

  let report = await WeeklyReport.findOneAndUpdate(
    { user: userId, marketType, periodType: "rolling7d", weekStart: weekStartUtc, weekEnd: weekEndUtc },
    { $setOnInsert: baseDoc, $set: { snapshot } },
    { new: true, upsert: true }
  );

  // If there are no trades at all, don't call Gemini – return a friendly message instead.
  if (trades.length === 0) {
    if (!report.aiFeedback) {
      report = await WeeklyReport.findByIdAndUpdate(
        report._id,
        {
          aiFeedback: {
            week: weekLabel,
            summary: "No trades logged in the last 7 days, so there is nothing to analyse yet.",
            mistakes: [],
            improvements: [
              {
                title: "Start logging trades",
                why: "AI can only give feedback based on your real trades.",
                how: "Log every trade you take over the next few days.",
              },
            ],
            nextWeekChecklist: ["Log every trade", "Use your checklist before saving"],
          },
          aiModel: "",
        },
        { new: true }
      );
    }
    return report;
  }

  // If already generated, do nothing (cost control)
  if (report.aiFeedback) return report;

  const { model, feedback } = await generateWeeklyFeedback({ snapshot, weekLabel });
  report = await WeeklyReport.findByIdAndUpdate(report._id, { aiFeedback: feedback, aiModel: model }, { new: true });
  return report;
}

exports.generateRolling7dReportForUser = generateRolling7dReportForUser;

// User-triggered: allow generating once every 7 days (rolling).
exports.generateNowOnce = async (req, res) => {
  try {
    const marketType = (req.query.marketType || "Forex").toString();
    const cooldownMs = 7 * 24 * 60 * 60 * 1000;
    const since = new Date(Date.now() - cooldownMs);

    const lastGenerated = await WeeklyReport.findOne({
      user: req.user._id,
      marketType,
      periodType: "rolling7d",
      aiFeedback: { $ne: null },
      createdAt: { $gte: since },
    }).sort({ createdAt: -1 });

    if (lastGenerated) {
      return res.status(409).json({
        message: "AI feedback already generated in the last 7 days. Please wait before generating again.",
        reportId: lastGenerated._id,
      });
    }

    const report = await generateRolling7dReportForUser({ userId: req.user._id, marketType });
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to generate weekly feedback" });
  }
};

