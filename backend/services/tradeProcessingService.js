const Trade = require("../models/Trade");
const ExtractionLog = require("../models/ExtractionLog");
const { clearUserCache } = require("../utils/cacheUtils");
const { extractText } = require("./ocrService");
const { extractIndianTradeWithAI, extractTradeWithAI } = require("./aiExtractionService");
const {
  parseTrade,
  parseIndianTrade,
  parseTradesFromOCR,
  parseForexTradesFromOCR,
} = require("./parsingService");
const {
  cleanOcrText,
  detectBrokerPattern,
  validateExtractedTrade,
  validateIndianTrade,
  validateIndianTrades,
  calculateConfidenceScore,
  calculateIndianConfidenceScore,
} = require("./extractionQualityService");
const { logger } = require("../utils/logger");
const { TIMEOUT_CONFIG } = require("../middleware/timeout");

const PROCESSING_TIMEOUT_MS = parseInt(process.env.PROCESSING_TIMEOUT_MS || "20000", 10); // 20 seconds

/**
 * Enhanced timeout wrapper with proper error handling and cleanup
 */
function enhancedTimeout(promise, operationName, timeoutMs = PROCESSING_TIMEOUT_MS) {
  const startTime = Date.now();
  let completed = false;
  
  return Promise.race([
    promise.then((result) => {
      completed = true;
      return result;
    }),
    new Promise((_, reject) => {
      setTimeout(() => {
        if (!completed) {
          const duration = Date.now() - startTime;
          const error = new Error(`${operationName} timed out after ${duration}ms (limit: ${timeoutMs}ms)`);
          error.name = 'TimeoutError';
          error.code = 'ETIMEDOUT';
          error.duration = duration;
          
          logger.error(`${operationName} timeout`, {
            operation: operationName,
            duration: `${duration}ms`,
            timeout: `${timeoutMs}ms`,
          });
          
          reject(error);
        }
      }, timeoutMs);
    }),
  ]);
}

function logExtractedTrades({ tradeId, stage, parsedTrade, parsedTrades }) {
  const multiTrades = Array.isArray(parsedTrades) ? parsedTrades.filter(Boolean) : [];

  if (multiTrades.length > 0) {
    logger.info(`${stage} | tradeId=${tradeId} | extractedTrades=${multiTrades.length}`, {
      tradeId,
      stage,
      count: multiTrades.length,
      trades: multiTrades,
    });
    return;
  }

  if (parsedTrade && Object.keys(parsedTrade).length > 0) {
    logger.info(`${stage} | tradeId=${tradeId}`, {
      tradeId,
      stage,
      trade: parsedTrade,
    });
  } else {
    logger.warn(`${stage} | tradeId=${tradeId} | no structured trade extracted`, {
      tradeId,
      stage,
    });
  }
}

function normalizeTradeType(type) {
  const normalized = String(type || "").toUpperCase();
  return normalized === "BUY" || normalized === "SELL" ? normalized : undefined;
}

function withTimeout(promise, message, timeoutMs = PROCESSING_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
}

function isWeakOcrText(text) {
  const cleaned = cleanOcrText(text);
  return !cleaned || cleaned.length < 20;
}

function safeParseTrade(text) {
  try {
    return parseTrade(text || "");
  } catch (error) {
    logger.error("Safe parseTrade failed", {
      error: error.message,
      stack: error.stack,
    });
    return {};
  }
}

function safeParseIndianTrade(text, options) {
  try {
    return parseIndianTrade(text || "", options || {});
  } catch (error) {
    logger.error("Safe parseIndianTrade failed", {
      error: error.message,
      stack: error.stack,
    });
    return {};
  }
}

function safeParseTradesFromOCR(text, options) {
  try {
    return parseTradesFromOCR(text || "", options || {});
  } catch (error) {
    logger.error("Safe parseTradesFromOCR failed", {
      error: error.message,
      stack: error.stack,
    });
    return [];
  }
}

function safeParseForexTradesFromOCR(text) {
  try {
    return parseForexTradesFromOCR(text || "");
  } catch (error) {
    logger.error("Safe parseForexTradesFromOCR failed", {
      error: error.message,
      stack: error.stack,
    });
    return [];
  }
}

async function runOcrWithRetry(imagePath) {
  let lastError = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      logger.info(`OCR attempt ${attempt} started`);
      return await withTimeout(extractText(imagePath), "Processing timeout");
    } catch (error) {
      lastError = error;
      logger.error(`OCR attempt ${attempt} failed`, {
        attempt,
        error: error.message,
        stack: error.stack,
      });
    }
  }

  const failure = new Error("OCR failed after retry");
  failure.cause = lastError;
  throw failure;
}

async function runAiWithRetry({ marketType, text, includeRawResponse = true, brokerHint = "", expectedMultiple = false }) {
  let lastError = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      logger.info(`AI attempt ${attempt} started | marketType=${marketType}`, {
        attempt,
        marketType,
      });
      const result = await withTimeout(
        marketType === "Indian_Market"
          ? extractIndianTradeWithAI(text, {
              includeRawResponse,
              improvedPrompt: attempt === 2,
              brokerHint,
              expectedMultiple,
            })
          : extractTradeWithAI(text, {
              marketType,
              includeRawResponse,
            }),
        "Processing timeout"
      );

      if (!result) {
        throw new Error("Empty AI response");
      }

      return result;
    } catch (error) {
      lastError = error;
      logger.error(`AI attempt ${attempt} failed`, {
        attempt,
        marketType,
        error: error.message,
        stack: error.stack,
      });
    }
  }

  const failure = new Error("AI processing failed");
  failure.cause = lastError;
  throw failure;
}

function mergeIndianAiData(parsedTrade, aiData) {
  if (!aiData) return parsedTrade;

  const merged = { ...parsedTrade };
  if (!merged.pair && aiData.pair) merged.pair = aiData.pair;
  if (merged.profit == null && aiData.profit != null) merged.profit = aiData.profit;
  if (merged.quantity == null && aiData.quantity != null) merged.quantity = aiData.quantity;
  if (merged.strikePrice == null && aiData.strikePrice != null) merged.strikePrice = aiData.strikePrice;
  if (!merged.optionType && aiData.optionType) merged.optionType = aiData.optionType;
  return merged;
}

function mergeIndianAiTrades(parsedTrades = [], aiTrades = [], broker = "") {
  const existingTrades = Array.isArray(parsedTrades) ? parsedTrades : [];
  const incomingTrades = Array.isArray(aiTrades) ? aiTrades : [];

  if (incomingTrades.length === 0) {
    return existingTrades;
  }

  if (existingTrades.length === 0) {
    return incomingTrades.map((trade) => ({
      symbol: trade.underlying || trade.pair?.split(" ")[0] || "",
      strike: trade.strikePrice ?? null,
      optionType: trade.optionType || null,
      quantity: trade.quantity ?? null,
      entryPrice: trade.entryPrice ?? null,
      pnl: trade.profit ?? null,
      broker: trade.broker || broker || "",
    }));
  }

  return existingTrades.map((trade, index) => {
    const aiTrade = incomingTrades[index];
    if (!aiTrade) {
      return {
        ...trade,
        ...(broker && !trade.broker ? { broker } : {}),
      };
    }

    return {
      ...trade,
      symbol: trade.symbol || aiTrade.underlying || aiTrade.pair?.split(" ")[0] || trade.symbol,
      strike: trade.strike ?? aiTrade.strikePrice ?? null,
      optionType: trade.optionType || aiTrade.optionType || null,
      quantity: trade.quantity ?? aiTrade.quantity ?? null,
      entryPrice: trade.entryPrice ?? aiTrade.entryPrice ?? null,
      pnl: trade.pnl ?? aiTrade.profit ?? null,
      broker: trade.broker || aiTrade.broker || broker || "",
    };
  });
}

function isIndianExtractionWeak({ parsedTrade, parsedTrades }) {
  const singleValidation = validateIndianTrade(parsedTrade);
  const multiValidation = validateIndianTrades(parsedTrades);

  if (multiValidation.totalCount > 0) {
    return multiValidation.validCount === 0 || multiValidation.validCount < multiValidation.totalCount;
  }

  return !singleValidation.isValid;
}

function mergeGenericAiData(parsedTrade, aiData) {
  if (!aiData) return parsedTrade;

  return {
    ...parsedTrade,
    pair: parsedTrade?.pair || aiData.pair || null,
    type: parsedTrade?.type || parsedTrade?.action || aiData.type || null,
    quantity: parsedTrade?.quantity ?? aiData.quantity ?? parsedTrade?.lotSize ?? null,
    lotSize: parsedTrade?.lotSize ?? aiData.quantity ?? null,
    entryPrice: parsedTrade?.entryPrice ?? aiData.entryPrice ?? null,
    exitPrice: parsedTrade?.exitPrice ?? aiData.exitPrice ?? null,
    profit: parsedTrade?.profit ?? aiData.profit ?? null,
    stopLoss: parsedTrade?.stopLoss ?? aiData.stopLoss ?? null,
    takeProfit: parsedTrade?.takeProfit ?? aiData.takeProfit ?? null,
    broker: parsedTrade?.broker || aiData.broker || null,
    strikePrice: parsedTrade?.strikePrice ?? aiData.strikePrice ?? null,
    optionType: parsedTrade?.optionType || aiData.optionType || null,
    underlying: parsedTrade?.underlying || aiData.underlying || null,
  };
}

function buildTradeUpdate({
  trade,
  parsedTrade,
  parsedTrades,
  extractedText,
  aiRawResponse,
  confidenceScore,
  isValid,
  needsReview,
  validationFailures,
}) {
  return {
    pair: parsedTrade?.pair || trade.pair || undefined,
    type: normalizeTradeType(parsedTrade?.type || parsedTrade?.action) || trade.type || undefined,
    quantity: parsedTrade?.quantity ?? trade.quantity ?? undefined,
    lotSize: parsedTrade?.lotSize ?? trade.lotSize ?? undefined,
    entryPrice: parsedTrade?.entryPrice ?? trade.entryPrice ?? undefined,
    exitPrice: parsedTrade?.exitPrice ?? trade.exitPrice ?? undefined,
    stopLoss: parsedTrade?.stopLoss ?? trade.stopLoss ?? undefined,
    takeProfit: parsedTrade?.takeProfit ?? trade.takeProfit ?? undefined,
    profit: parsedTrade?.profit ?? trade.profit ?? undefined,
    commission: parsedTrade?.commission ?? trade.commission ?? undefined,
    swap: parsedTrade?.swap ?? trade.swap ?? undefined,
    balance: parsedTrade?.balance ?? trade.balance ?? undefined,
    session: parsedTrade?.session ?? trade.session ?? undefined,
    broker: parsedTrade?.broker || trade.broker || "",
    segment: parsedTrade?.segment || trade.segment || "",
    instrumentType: parsedTrade?.instrumentType || trade.instrumentType || "",
    strikePrice: parsedTrade?.strikePrice ?? trade.strikePrice ?? undefined,
    expiryDate: parsedTrade?.expiryDate || trade.expiryDate || "",
    extractedText,
    rawOCRText: extractedText,
    aiRawResponse: aiRawResponse || "",
    extractionConfidence: confidenceScore ?? 0,
    isValid,
    needsReview,
    parsedData: {
      parsedTrade,
      validation: {
        isValid,
        failures: validationFailures,
        confidenceScore: confidenceScore ?? 0,
      },
      ...(Array.isArray(parsedTrades) && parsedTrades.length > 0 ? { parsedTrades } : {}),
    },
    status: "completed",
    error: needsReview ? (validationFailures.join(", ") || "Needs manual review") : null,
    processedAt: new Date(),
  };
}

async function logExtraction({ trade, extractedText, parsedTrade, parsedTrades, aiUsed, errorMessage }) {
  try {
    await ExtractionLog.create({
      user: trade.user,
      imageUrl: trade.imageUrl || trade.screenshot,
      marketType: trade.marketType || "Forex",
      extractedText,
      parsedData: parsedTrades && parsedTrades.length > 0 ? { parsedTrade, parsedTrades } : parsedTrade,
      isSuccess: !errorMessage,
      aiUsed: !!aiUsed,
      errorMessage: errorMessage || undefined,
    });
    logger.info(`Extraction log saved | tradeId=${trade._id}`, {
      tradeId: trade._id,
      success: !errorMessage,
      aiUsed,
    });
  } catch (error) {
    logger.error("Failed to save extraction log", {
      error: error.message,
      stack: error.stack,
      tradeId: trade._id,
    });
  }
}

async function processTradeUpload({ tradeId, imagePath }) {
  const trade = await Trade.findById(tradeId);
  if (!trade) {
    throw new Error("Trade not found");
  }

  await Trade.findByIdAndUpdate(tradeId, {
    status: "processing",
    error: null,
  });

  return withTimeout((async () => {
    const marketType = trade.marketType || "Forex";
    let extractedText;

    try {
      extractedText = await runOcrWithRetry(imagePath);
    } catch (error) {
      logger.error(`OCR failure | tradeId=${tradeId}`, {
        tradeId,
        reason: error.message,
        stack: error.stack,
      });
      throw error.message === "Processing timeout" ? error : new Error("OCR failed after retry");
    }

    const cleanedText = cleanOcrText(extractedText);
    const weakOcr = isWeakOcrText(cleanedText);
    const broker = detectBrokerPattern(cleanedText, trade.broker || undefined);

    logger.info(`OCR output | tradeId=${tradeId}`, {
      tradeId,
      textLength: cleanedText.length,
      broker,
      weakOcr: weakOcr,
    });
    
    if (cleanedText.length < 1000) {
      logger.debug(`OCR text preview | tradeId=${tradeId}`, { text: cleanedText });
    } else {
      logger.debug(`OCR text preview | tradeId=${tradeId}`, { text: cleanedText.slice(0, 1000) });
    }

    let aiData = null;
    let aiRawResponse = "";
    let parsedTrade = {};
    let parsedTrades = [];

    if (marketType === "Indian_Market" && !weakOcr) {
      parsedTrade = safeParseIndianTrade(cleanedText, { broker });
      parsedTrades = safeParseTradesFromOCR(cleanedText, { broker });
    } else if (!weakOcr) {
      parsedTrade = safeParseTrade(cleanedText);
      parsedTrades = safeParseForexTradesFromOCR(cleanedText);
    } else {
      logger.warn(`Weak OCR detected | tradeId=${tradeId} | switching to AI fallback mode`, {
        tradeId,
        textLength: cleanedText.length,
      });
    }

    logExtractedTrades({
      tradeId,
      stage: "Initial extraction",
      parsedTrade,
      parsedTrades,
    });

    let quality = marketType === "Indian_Market"
      ? calculateIndianConfidenceScore({
          parsedTrade,
          parsedTrades,
          ocrText: cleanedText,
          broker,
        })
      : calculateConfidenceScore({
          parsedTrade,
          ocrText: cleanedText,
        });

    logger.info(`Confidence score | tradeId=${tradeId}`, {
      tradeId,
      score: quality.score,
      isValid: quality.validation.isValid,
      isLowConfidence: quality.isLowConfidence,
    });

    const shouldUseAi =
      weakOcr ||
      (marketType === "Indian_Market" ? isIndianExtractionWeak({ parsedTrade, parsedTrades }) : false) ||
      !quality.validation.isValid ||
      quality.isLowConfidence;

    if (shouldUseAi) {
      try {
        aiData = await runAiWithRetry({
          marketType,
          text: cleanedText || imagePath,
          includeRawResponse: true,
          brokerHint: broker,
          expectedMultiple: marketType === "Indian_Market" && ((parsedTrades && parsedTrades.length > 1) || /POSITIONS|HOLDINGS|CLOSED/i.test(cleanedText)),
        });
        aiRawResponse = aiData?.rawResponse || "";
        
        if (aiRawResponse.length < 1000) {
          logger.info(`AI output | tradeId=${tradeId}`, { response: aiRawResponse });
        } else {
          logger.info(`AI output | tradeId=${tradeId}`, { response: aiRawResponse.slice(0, 1000) });
        }

        if (marketType === "Indian_Market") {
          parsedTrade = mergeIndianAiData(safeParseIndianTrade(cleanedText, { broker }), aiData);
          parsedTrades = mergeIndianAiTrades(
            safeParseTradesFromOCR(cleanedText, { broker }),
            aiData?.trades || [],
            broker
          );
        } else {
          parsedTrade = mergeGenericAiData(safeParseTrade(cleanedText), aiData);
          parsedTrades = safeParseForexTradesFromOCR(cleanedText);
        }

        logExtractedTrades({
          tradeId,
          stage: "Post-AI extraction",
          parsedTrade,
          parsedTrades,
        });
      } catch (error) {
        logger.error(`AI failure | tradeId=${tradeId}`, {
          tradeId,
          reason: error.message,
          stack: error.stack,
        });
        throw error.message === "Processing timeout" ? error : new Error("AI processing failed");
      }

      quality = marketType === "Indian_Market"
        ? calculateIndianConfidenceScore({
            parsedTrade,
            parsedTrades,
            ocrText: cleanedText,
            broker,
          })
        : calculateConfidenceScore({
            parsedTrade,
            ocrText: cleanedText,
          });
      logger.info(`Confidence score after AI | tradeId=${tradeId}`, {
        tradeId,
        score: quality.score,
        isValid: quality.validation.isValid,
        isLowConfidence: quality.isLowConfidence,
      });
    }

    const finalValidation = marketType === "Indian_Market"
      ? validateIndianTrade(parsedTrade)
      : validateExtractedTrade(parsedTrade);
    if (!finalValidation.isValid) {
      logger.warn(`Validation failed after processing | tradeId=${tradeId}`, {
        tradeId,
        failures: finalValidation.failures.join("; "),
      });
    }

    const multiIndianValidation = marketType === "Indian_Market" ? validateIndianTrades(parsedTrades) : null;
    if (marketType === "Indian_Market" && multiIndianValidation && !multiIndianValidation.isValid) {
      logger.warn(`Indian multi-trade validation | tradeId=${tradeId}`, {
        tradeId,
        validCount: multiIndianValidation.validCount,
        totalCount: multiIndianValidation.totalCount,
        isValid: multiIndianValidation.isValid,
      });
    }

    const needsReview =
      !finalValidation.isValid ||
      quality.isLowConfidence ||
      (marketType === "Indian_Market" && multiIndianValidation && !multiIndianValidation.isValid);

    logExtractedTrades({
      tradeId,
      stage: "Final extraction",
      parsedTrade,
      parsedTrades,
    });

    const update = buildTradeUpdate({
      trade,
      parsedTrade,
      parsedTrades,
      extractedText: cleanedText,
      aiRawResponse,
      confidenceScore: quality.score,
      isValid: finalValidation.isValid,
      needsReview,
      validationFailures: finalValidation.failures,
    });

    await Trade.findByIdAndUpdate(tradeId, update, { new: true, runValidators: true });
    await logExtraction({ trade, extractedText: cleanedText, parsedTrade, parsedTrades, aiUsed: !!aiData });
    await clearUserCache(trade.user);

    return {
      tradeId,
      status: "completed",
      parsedTrade,
      parsedTrades,
    };
  })(), "Processing timeout");
}

async function failTradeProcessing(tradeId, error) {
  const failureMessage = error?.message || "Processing failed";
  const trade = await Trade.findByIdAndUpdate(
    tradeId,
    {
      status: "failed",
      error: failureMessage,
      processedAt: null,
    },
    { new: true }
  );

  if (trade) {
    await logExtraction({
      trade,
      extractedText: trade.extractedText || "",
      parsedTrade: trade.parsedData?.parsedTrade || null,
      parsedTrades: trade.parsedData?.parsedTrades || [],
      aiUsed: false,
      errorMessage: failureMessage,
    });
    await clearUserCache(trade.user);
  }
}

module.exports = {
  processTradeUpload,
  failTradeProcessing,
};
