const asyncHandler = require("../utils/asyncHandler");
const tradeService = require("../services/trade.service");

exports.createTrade = asyncHandler(async (req, res) => {
  const trade = await tradeService.createTrade(req.user._id, req.body);
  res.status(201).json(trade);
});

exports.getTrades = asyncHandler(async (req, res) => {
  console.time("getTradesQuery");
  try {
    const trades = await tradeService.getTrades(req.user._id, req.query);
    res.json(trades);
  } finally {
    console.timeEnd("getTradesQuery");
  }
});

exports.getTrade = asyncHandler(async (req, res) => {
  console.time("getTradeQuery");
  try {
    const trade = await tradeService.getTrade(req.user._id, req.params.id);
    res.json(trade);
  } finally {
    console.timeEnd("getTradeQuery");
  }
});

exports.getTradeStatus = asyncHandler(async (req, res) => {
  const tradeStatus = await tradeService.getTradeStatus(req.user._id, req.params.id);
  res.json(tradeStatus);
});

exports.updateTrade = asyncHandler(async (req, res) => {
  const trade = await tradeService.updateTrade(req.user._id, req.params.id, req.body);
  res.json(trade);
});

exports.deleteTrade = asyncHandler(async (req, res) => {
  const result = await tradeService.deleteTrade(req.user._id, req.params.id);
  res.json(result);
});
