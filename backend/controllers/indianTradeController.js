const IndianTrade = require("../models/IndianTrade");
const { clearUserCache } = require("../utils/cacheUtils");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

exports.createTrade = asyncHandler(async (req, res) => {
  const { pair, type, underlying, strikePrice, optionType } = req.body;

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

    // Build pair from underlying + strike + optionType if not provided
  let symbol = pair;
  if (!symbol && underlying && strikePrice != null) {
    symbol = `${String(underlying).trim()} ${strikePrice} ${ot}`;
  }
  if (!symbol) {
    throw new ApiError(400, "Symbol is required (provide pair or underlying + strike + optionType)", "VALIDATION_ERROR");
  }

  const trade = await IndianTrade.create({
    ...req.body,
    pair: symbol,
    type: type.toUpperCase(),
    optionType: ot,
    user: req.user._id
  });

  await clearUserCache(req.user._id);

  res.status(201).json(trade);
});

exports.getTrades = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const query = { user: req.user._id };
  const trades = await IndianTrade.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .select(
      "pair underlying type optionType quantity lotSize entryPrice exitPrice profit strategy session createdAt"
    )
    .lean();
  res.json(trades);
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
  const { type } = req.body;

  const validTypes = ["BUY", "SELL"];
  if (type && !validTypes.includes(type.toUpperCase())) {
    throw new ApiError(400, "Type must be BUY or SELL", "VALIDATION_ERROR");
  }

    const trade = await IndianTrade.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { ...req.body, ...(type && { type: type.toUpperCase() }) },
      {
        returnDocument: "after",
        // Allow "save after OCR" to upsert the first trade (jobId is an OCR id,
        // not an existing IndianTrade _id yet).
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
