const IndianTrade = require("../models/IndianTrade");
const { clearUserCache } = require("../utils/cacheUtils");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

function normalizeTradeDate(tradeDate) {
  const parsed = new Date(tradeDate);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, "Trade date is invalid", "VALIDATION_ERROR");
  }
  return parsed;
}

function getEffectiveTradeTime(trade) {
  return new Date(trade.tradeDate || trade.createdAt || 0).getTime();
}

function getPeriodStart(period) {
  const now = new Date();
  const start = new Date(now);

  switch (String(period || "all").toLowerCase()) {
    case "1w":
      start.setDate(start.getDate() - 7);
      return start;
    case "1m":
      start.setMonth(start.getMonth() - 1);
      return start;
    case "3m":
      start.setMonth(start.getMonth() - 3);
      return start;
    case "1y":
      start.setFullYear(start.getFullYear() - 1);
      return start;
    default:
      return null;
  }
}

exports.createTrade = asyncHandler(async (req, res) => {
  const { pair, type, underlying, strikePrice, optionType, tradeDate } = req.body;

  if (!type) {
    throw new ApiError(400, "Type (BUY/SELL) is required", "VALIDATION_ERROR");
  }
  const validTypes = ["BUY", "SELL"];
  if (!validTypes.includes(type.toUpperCase())) {
    throw new ApiError(400, "Type must be BUY or SELL", "VALIDATION_ERROR");
  }

  const validOptionTypes = ["CE", "PE"];
  const ot = (optionType || "CE").toUpperCase();
  if (!validOptionTypes.includes(ot)) {
    throw new ApiError(400, "Option type must be CE or PE", "VALIDATION_ERROR");
  }

  let symbol = pair;
  if (!symbol && underlying && strikePrice != null) {
    symbol = `${String(underlying).trim()} ${strikePrice} ${ot}`;
  }
  if (!symbol) {
    throw new ApiError(400, "Symbol is required (provide pair or underlying + strike + optionType)", "VALIDATION_ERROR");
  }

  if (!tradeDate) {
    throw new ApiError(400, "Trade date is required", "VALIDATION_ERROR");
  }

  const trade = await IndianTrade.create({
    ...req.body,
    pair: symbol,
    type: type.toUpperCase(),
    optionType: ot,
    tradeDate: normalizeTradeDate(tradeDate),
    user: req.user._id,
  });

  await clearUserCache(req.user._id);

  res.status(201).json(trade);
});

exports.getTrades = asyncHandler(async (req, res) => {
  const period = String(req.query.period || "all").toLowerCase();
  const query = { user: req.user._id };
  const periodStart = getPeriodStart(period);
  const trades = await IndianTrade.find(query)
    .select(
      "pair underlying type optionType quantity lotSize entryPrice exitPrice profit strategy session entryBasis entryBasisCustom createdAt tradeDate"
    )
    .lean();
  res.json(
    trades
      .filter((trade) => !periodStart || getEffectiveTradeTime(trade) >= periodStart.getTime())
      .sort((a, b) => getEffectiveTradeTime(b) - getEffectiveTradeTime(a))
  );
});

exports.getTrade = asyncHandler(async (req, res) => {
  const trade = await IndianTrade.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!trade) {
    throw new ApiError(404, "Trade not found or unauthorized", "NOT_FOUND");
  }

  res.json(trade);
});

exports.updateTrade = asyncHandler(async (req, res) => {
  const { type, tradeDate } = req.body;

  const validTypes = ["BUY", "SELL"];
  if (type && !validTypes.includes(type.toUpperCase())) {
    throw new ApiError(400, "Type must be BUY or SELL", "VALIDATION_ERROR");
  }

  const trade = await IndianTrade.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    {
      ...req.body,
      ...(tradeDate && { tradeDate: normalizeTradeDate(tradeDate) }),
      ...(type && { type: type.toUpperCase() }),
    },
    {
      returnDocument: "after",
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true
    }
  );

  if (!trade) {
    throw new ApiError(404, "Trade not found or unauthorized", "NOT_FOUND");
  }

  await clearUserCache(req.user._id);

  res.json(trade);
});

exports.deleteTrade = asyncHandler(async (req, res) => {
  const trade = await IndianTrade.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id
  });

  if (!trade) {
    throw new ApiError(404, "Trade not found or unauthorized", "NOT_FOUND");
  }

  await clearUserCache(req.user._id);

  res.json({ message: "Trade deleted" });
});
