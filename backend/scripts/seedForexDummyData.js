const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/Users");
const Trade = require("../models/Trade");
const SetupStrategy = require("../models/SetupStrategy");

const DEFAULT_EMAIL = "demo.forex@stratedge.local";
const DEFAULT_PASSWORD = "Demo@12345";
const DEFAULT_COUNT = 50;
const DUMMY_NOTE_PREFIX = "[seed:forex-demo]";

const PAIRS = [
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "AUDUSD",
  "USDCAD",
  "USDCHF",
  "NZDUSD",
  "EURJPY",
  "GBPJPY",
  "EURGBP",
];

const SESSIONS = ["London", "New York", "Asia", "London-NY Overlap"];
const BROKERS = ["IC Markets", "OANDA", "Pepperstone", "FXCM"];
const ENTRY_BASIS_VALUES = ["Plan", "Emotion", "Impulsive", "Custom"];
const CONFIDENCE_VALUES = ["Low", "Medium", "High", "Overconfident"];
const EMOTIONAL_TAG_SETS = [
  ["Calm", "Focused"],
  ["Patient", "Confident"],
  ["Disciplined", "Composed"],
  ["Hesitant", "Cautious"],
  ["Frustrated", "Rushed"],
  ["Greedy", "Overconfident"],
];

const SETUPS = [
  {
    name: "London Breakout",
    rules: [
      { label: "Bias aligned with higher timeframe" },
      { label: "Break of Asian range confirmed" },
      { label: "Retest held before entry" },
      { label: "Risk capped to 1R" },
    ],
  },
  {
    name: "NY Reversal",
    rules: [
      { label: "Liquidity sweep into key level" },
      { label: "Rejection candle closed strong" },
      { label: "Entry taken only after structure shift" },
      { label: "No trade against major news" },
    ],
  },
  {
    name: "Trend Pullback",
    rules: [
      { label: "Trend confirmed on 1H and 15M" },
      { label: "Pullback reached value zone" },
      { label: "Momentum resumed before entry" },
      { label: "Reward at least 1:2" },
    ],
  },
  {
    name: "Range Fade",
    rules: [
      { label: "Range edges clearly respected" },
      { label: "Entry only at premium or discount edge" },
      { label: "Target set before execution" },
      { label: "No averaging into losers" },
    ],
  },
];

function parseArgs(argv) {
  const args = { email: DEFAULT_EMAIL, count: DEFAULT_COUNT };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--email" && argv[index + 1]) {
      args.email = argv[index + 1].trim().toLowerCase();
      index += 1;
    } else if (token === "--count" && argv[index + 1]) {
      const parsed = Number.parseInt(argv[index + 1], 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        args.count = Math.max(parsed, DEFAULT_COUNT);
      }
      index += 1;
    }
  }

  return args;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeMongoUri(uri) {
  const value = String(uri || "").trim();
  if (!value) return "mongodb://localhost:27017/trading_db";
  if (value.startsWith("mongodb://") || value.startsWith("mongodb+srv://")) {
    return value;
  }
  return `mongodb://${value.replace(/^\/+/, "")}`;
}

function round(value, decimals = 5) {
  return Number(value.toFixed(decimals));
}

function buildPriceProfile(pair, index) {
  const priceMap = {
    EURUSD: 1.0845,
    GBPUSD: 1.2675,
    USDJPY: 151.42,
    AUDUSD: 0.6612,
    USDCAD: 1.3514,
    USDCHF: 0.9042,
    NZDUSD: 0.6088,
    EURJPY: 163.95,
    GBPJPY: 191.84,
    EURGBP: 0.8551,
  };

  const pipMap = {
    USDJPY: 0.01,
    EURJPY: 0.01,
    GBPJPY: 0.01,
  };

  const basePrice = priceMap[pair] || 1.2;
  const pip = pipMap[pair] || 0.0001;
  const biasOffset = ((index % 5) - 2) * pip * 12;
  const entryPrice = round(basePrice + biasOffset, pip >= 0.01 ? 3 : 5);
  const riskPips = 12 + (index % 8) * 3;
  const rewardRatio = [1, 2, 3, 4, 5][index % 5];

  return {
    entryPrice,
    pip,
    riskPips,
    rewardRatio,
  };
}

function buildSetupRules(setup, index, profitable) {
  const rules = setup.rules.map((rule, ruleIndex) => ({
    label: rule.label,
    followed: profitable ? ruleIndex !== 3 || index % 4 !== 0 : ruleIndex < 2 || index % 3 === 0,
  }));

  const followedCount = rules.filter((rule) => rule.followed).length;
  const setupScore = Math.round((followedCount / rules.length) * 100);

  return { rules, setupScore };
}

function buildPsychology(index, profitable) {
  const entryBasis = profitable
    ? ENTRY_BASIS_VALUES[index % 2 === 0 ? 0 : 3]
    : ENTRY_BASIS_VALUES[index % 2 === 0 ? 1 : 2];
  const confidence = profitable
    ? CONFIDENCE_VALUES[(index % 3) + 1]
    : CONFIDENCE_VALUES[index % 2 === 0 ? 0 : 3];
  const mood = profitable ? 3 + (index % 3) : 1 + (index % 3);
  const emotionalTags = EMOTIONAL_TAG_SETS[index % EMOTIONAL_TAG_SETS.length];
  const mistakeTag = profitable
    ? ["Held to target", "Managed risk well", "Stayed patient"][index % 3]
    : ["Early entry", "Moved stop loss", "Overtrading", "Skipped confirmation"][index % 4];
  const lesson = profitable
    ? [
        "Patience at the level improved execution.",
        "Following the plan kept risk controlled.",
        "Waiting for confirmation produced cleaner entries.",
      ][index % 3]
    : [
        "Wait for candle confirmation before entering.",
        "Do not increase risk after a prior loss.",
        "Stick to the original stop and target.",
        "Skip low-conviction setups during choppy conditions.",
      ][index % 4];
  const wouldRetake = profitable || index % 3 === 0 ? "Yes" : "No";

  return {
    entryBasis,
    entryBasisCustom: entryBasis === "Custom" ? "Checklist-based discretionary entry" : "",
    mood: Math.min(5, Math.max(1, mood)),
    confidence,
    emotionalTags,
    mistakeTag,
    lesson,
    wouldRetake,
  };
}

function buildTrade({ userId, index, createdAt, balance }) {
  const pair = PAIRS[index % PAIRS.length];
  const type = index % 3 === 0 ? "SELL" : "BUY";
  const session = SESSIONS[index % SESSIONS.length];
  const broker = BROKERS[index % BROKERS.length];
  const setup = SETUPS[index % SETUPS.length];
  const profitable = index % 5 !== 0 && index % 11 !== 0;
  const quantity = [0.5, 0.75, 1, 1.25, 1.5][index % 5];
  const lotSize = quantity;
  const { entryPrice, pip, riskPips, rewardRatio } = buildPriceProfile(pair, index);
  const riskDistance = round(riskPips * pip, pip >= 0.01 ? 3 : 5);

  let stopLoss;
  let takeProfit;
  let exitPrice;

  if (type === "BUY") {
    stopLoss = round(entryPrice - riskDistance, pip >= 0.01 ? 3 : 5);
    takeProfit = round(entryPrice + riskDistance * rewardRatio, pip >= 0.01 ? 3 : 5);
    exitPrice = profitable
      ? round(entryPrice + riskDistance * Math.max(0.7, rewardRatio - 0.2), pip >= 0.01 ? 3 : 5)
      : round(entryPrice - riskDistance * (0.7 + (index % 3) * 0.2), pip >= 0.01 ? 3 : 5);
  } else {
    stopLoss = round(entryPrice + riskDistance, pip >= 0.01 ? 3 : 5);
    takeProfit = round(entryPrice - riskDistance * rewardRatio, pip >= 0.01 ? 3 : 5);
    exitPrice = profitable
      ? round(entryPrice - riskDistance * Math.max(0.7, rewardRatio - 0.2), pip >= 0.01 ? 3 : 5)
      : round(entryPrice + riskDistance * (0.7 + (index % 3) * 0.2), pip >= 0.01 ? 3 : 5);
  }

  const priceMove = type === "BUY" ? exitPrice - entryPrice : entryPrice - exitPrice;
  const pipMove = priceMove / pip;
  const profit = round(pipMove * quantity * 10 - (2 + (index % 3) * 0.5), 2);
  const commission = round(1.25 + quantity * 0.85, 2);
  const swap = round(index % 7 === 0 ? -0.65 : index % 9 === 0 ? 0.35 : 0, 2);
  const { rules, setupScore } = buildSetupRules(setup, index, profit > 0);
  const psychology = buildPsychology(index, profit > 0);
  const riskRewardRatio = index % 6 === 0 ? "custom" : `1:${rewardRatio}`;
  const processedAt = new Date(createdAt.getTime() + (2 + (index % 5)) * 60000);
  const queuedAt = new Date(createdAt.getTime() - 120000);
  const processingStartedAt = new Date(createdAt.getTime() - 30000);

  return {
    user: userId,
    pair,
    type,
    quantity,
    lotSize,
    entryPrice,
    exitPrice,
    stopLoss,
    takeProfit,
    profit,
    commission,
    swap,
    balance: round(balance + profit - commission + swap, 2),
    strategy: setup.name,
    session,
    notes: `${DUMMY_NOTE_PREFIX} ${setup.name} on ${pair} during ${session}.`,
    riskRewardRatio,
    riskRewardCustom: riskRewardRatio === "custom" ? `1:${round(rewardRatio + 0.5, 1)}` : "",
    screenshot: "",
    imageUrl: "",
    marketType: "Forex",
    broker,
    segment: "Major FX",
    instrumentType: "Spot",
    strikePrice: null,
    expiryDate: "",
    extractedText: "",
    rawOCRText: "",
    aiRawResponse: "",
    parsedData: {
      source: "dummy-seed",
      quality: "complete",
      setup: setup.name,
    },
    extractionConfidence: 100,
    isValid: true,
    needsReview: false,
    status: "completed",
    ocrJobId: "",
    ocrJobName: "processTrade",
    ocrAttempts: 0,
    queuedAt,
    processingStartedAt,
    error: null,
    processedAt,
    setupRules: rules,
    setupScore,
    createdAt,
    updatedAt: processedAt,
    ...psychology,
  };
}

function buildTradeDates(count) {
  const dates = [];
  const baseDate = new Date("2026-01-06T07:15:00.000Z");
  let tradeDate = new Date(baseDate);

  for (let index = 0; index < count; index += 1) {
    if (index > 0) {
      tradeDate.setUTCDate(tradeDate.getUTCDate() + 1);
      while (tradeDate.getUTCDay() === 0 || tradeDate.getUTCDay() === 6) {
        tradeDate.setUTCDate(tradeDate.getUTCDate() + 1);
      }
    }

    const date = new Date(tradeDate);
    const hourBlock = [7, 9, 12, 14, 18][index % 5];
    const minuteBlock = [5, 18, 27, 41, 52][index % 5];
    date.setUTCHours(hourBlock, minuteBlock, 0, 0);
    dates.push(date);
  }

  return dates;
}

async function ensureUser(email) {
  let user = await User.findOne({ email });

  if (user) {
    return { user, created: false };
  }

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  user = await User.create({
    name: "Forex Demo User",
    email,
    password: hashedPassword,
    authProvider: "local",
    subscriptionStatus: "active",
    subscriptionPlan: "monthly",
    freeUploadUsed: true,
    lastLogin: new Date(),
  });

  return { user, created: true };
}

async function seedSetups(userId) {
  await SetupStrategy.deleteMany({
    user: userId,
    marketType: "Forex",
    name: { $in: SETUPS.map((setup) => setup.name) },
  });

  return SetupStrategy.insertMany(
    SETUPS.map((setup) => ({
      user: userId,
      marketType: "Forex",
      name: setup.name,
      rules: setup.rules,
    }))
  );
}

async function seedTrades(userId, count) {
  await Trade.deleteMany({
    user: userId,
    marketType: "Forex",
    notes: { $regex: `^${escapeRegex(DUMMY_NOTE_PREFIX)}` },
  });

  const dates = buildTradeDates(count);
  let runningBalance = 10000;

  const trades = dates.map((createdAt, index) => {
    const trade = buildTrade({
      userId,
      index,
      createdAt,
      balance: runningBalance,
    });
    runningBalance = trade.balance;
    return trade;
  });

  return Trade.insertMany(trades);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mongoUri = normalizeMongoUri(process.env.MONGO_URI);

  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    const { user, created } = await ensureUser(args.email);
    const setups = await seedSetups(user._id);
    const trades = await seedTrades(user._id, args.count);

    console.log(created ? `Created demo user: ${user.email}` : `Using existing user: ${user.email}`);
    if (created) {
      console.log(`Default password: ${DEFAULT_PASSWORD}`);
    }
    console.log(`Seeded ${setups.length} forex setups.`);
    console.log(`Seeded ${trades.length} forex dummy trades.`);
    console.log(`Date range: ${trades[0].createdAt.toISOString()} -> ${trades[trades.length - 1].createdAt.toISOString()}`);
    console.log("All seeded trades include setup checklist and psychology fields.");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding forex dummy data:", error);
    process.exit(1);
  }
}

main();
