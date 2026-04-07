const ApiError = require("../utils/ApiError");
const { buildCacheKey, getCache, rememberCache } = require("../utils/cache");
const { clearUserCache } = require("../utils/cacheUtils");
const tradeRepository = require("../repositories/trade.repository");

const TRADE_LIST_TTL_SECONDS = 45;
const TRADE_STATUS_TTL_SECONDS = 3;
const TRADE_DETAILS_TTL_SECONDS = 45;

function normalizeTradeType(type) {
  const normalizedType = String(type || "").toUpperCase();
  if (normalizedType !== "BUY" && normalizedType !== "SELL") {
    throw new ApiError(400, "Type must be BUY or SELL", "VALIDATION_ERROR");
  }
  return normalizedType;
}

async function createTrade(userId, payload) {
  if (!payload.pair) {
    throw new ApiError(400, "Pair is required", "VALIDATION_ERROR");
  }
  if (!payload.type) {
    throw new ApiError(400, "Action/Type is required", "VALIDATION_ERROR");
  }

  const trade = await tradeRepository.createTrade({
    ...payload,
    type: normalizeTradeType(payload.type),
    user: userId,
    status: payload.status || "completed",
    error: payload.error ?? null,
    processedAt: payload.processedAt || new Date(),
  });

  await clearUserCache(userId);
  return trade;
}

async function getTrades(userId, query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
  const key = buildCacheKey("trades", userId, "list", `page=${page}`, `limit=${limit}`);
  const startedAt = Date.now();
  const { data: trades } = await rememberCache(key, TRADE_LIST_TTL_SECONDS, async () => {
    const rows = await tradeRepository.findForexTradesByUser(userId, { page, limit });
    return rows.map((trade) => ({
      ...trade,
      symbol: trade.pair ?? null,
      pnl: trade.profit ?? 0,
    }));
  });
  const duration = Date.now() - startedAt;

  if (duration > 500) {
    console.warn(`[Performance] Slow DB query detected in getTrades: ${duration}ms`);
  }

  return trades;
}

async function getTrade(userId, tradeId) {
  const key = buildCacheKey("trades", userId, "detail", tradeId);
  const startedAt = Date.now();
  const { data: trade } = await rememberCache(key, TRADE_DETAILS_TTL_SECONDS, () =>
    tradeRepository.findForexTradeByUser(tradeId, userId)
  );
  const duration = Date.now() - startedAt;

  if (duration > 500) {
    console.warn(`[Performance] Slow DB query detected in getTrade: ${duration}ms`);
  }

  if (!trade) {
    throw new ApiError(404, "Trade not found or unauthorized", "NOT_FOUND");
  }

  return trade;
}

async function getTradeStatus(userId, tradeId) {
  const key = buildCacheKey("trades", userId, "status", tradeId);
  const startedAt = Date.now();
  const { data: trade } = await rememberCache(key, TRADE_STATUS_TTL_SECONDS, () =>
    tradeRepository.findTradeByIdAndUser(tradeId, userId)
  );
  const duration = Date.now() - startedAt;

  if (duration > 500) {
    console.warn(`[Performance] Slow DB query detected in getTradeStatus: ${duration}ms`);
  }

  if (!trade) {
    const bridgeKey = buildCacheKey("trade_status_bridge", userId, tradeId);
    const bridgedStatus = await getCache(bridgeKey);
    if (bridgedStatus) {
      return bridgedStatus;
    }
    throw new ApiError(404, "Trade not found or unauthorized", "NOT_FOUND");
  }

  return {
    jobId: trade.ocrJobId || trade._id.toString(),
    status: trade.status,
    attemptsMade: trade.ocrAttempts || 0,
    data: trade.status === "completed" ? trade : null,
    error: trade.error || null,
  };
}

async function updateTrade(userId, tradeId, payload) {
  const update = { ...payload };
  if (payload.type) {
    update.type = normalizeTradeType(payload.type);
  }

  const trade = await tradeRepository.updateForexTradeByUser(tradeId, userId, update);
  if (!trade) {
    throw new ApiError(404, "Trade not found or unauthorized", "NOT_FOUND");
  }

  await clearUserCache(userId);
  return trade;
}

async function deleteTrade(userId, tradeId) {
  const trade = await tradeRepository.deleteForexTradeByUser(tradeId, userId);
  if (!trade) {
    throw new ApiError(404, "Trade not found or unauthorized", "NOT_FOUND");
  }

  await clearUserCache(userId);
  return { message: "Trade deleted" };
}

module.exports = {
  createTrade,
  deleteTrade,
  getTrade,
  getTrades,
  getTradeStatus,
  updateTrade,
};
