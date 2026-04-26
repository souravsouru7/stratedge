const Trade = require("../models/Trade");
const ExtractionLog = require("../models/ExtractionLog");
const { clearUserCache } = require("../utils/cacheUtils");
const { buildCacheKey, setCache } = require("../utils/cache");
const { extractText } = require("./ocrService");
const { extractTextWithVision, isVisionAvailable } = require("./visionOcrService");
const { extractIndianTradeWithAI, extractTradeWithAI, extractTradeWithGeminiVision } = require("./aiExtractionService");
const {
  parseTrade,
  parseIndianTrade,
  parseTradesFromOCR,
  parseForexTradesFromOCR,
} = require("./parsingService");
const cloudinary = require("../config/cloudinary");
const {
  cleanOcrText,
  detectBrokerPattern,
  validateExtractedTrade,
  validateIndianTrade,
  validateIndianTrades,
  calculateConfidenceScore,
  calculateIndianConfidenceScore,
  isTradeRelatedContent,
} = require("./extractionQualityService");
const { logger } = require("../utils/logger");
const { appConfig } = require("../config");

const PROCESSING_TIMEOUT_MS = appConfig.timeouts.processingTimeoutMs;

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

/**
 * Extracts a Cloudinary public_id from a secure_url.
 * e.g. https://res.cloudinary.com/cloud/image/upload/v123/trades/abc.jpg → trades/abc
 */
function extractCloudinaryPublicId(url) {
  try {
    const match = String(url || "").match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^./]+)?$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Marks a trade as failed with NOT_A_TRADE_IMAGE and deletes its Cloudinary image.
 * Called when we're confident the uploaded image is not a broker screenshot.
 */
async function rejectNonTradeImage(tradeId, trade, userMessage) {
  await Trade.findByIdAndUpdate(tradeId, {
    status: "failed",
    error: userMessage,
    processedAt: new Date(),
  });

  // Delete from Cloudinary so it doesn't consume storage
  const imageUrl = trade.imageUrl || trade.screenshot;
  const publicId = extractCloudinaryPublicId(imageUrl);
  if (publicId) {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" }).catch((err) => {
      logger.warn("Failed to delete non-trade image from Cloudinary", { publicId, error: err.message });
    });
  }

  await logExtraction({
    trade,
    extractedText: "",
    parsedTrade: null,
    parsedTrades: [],
    aiUsed: false,
    errorMessage: userMessage,
  });

  await clearUserCache(trade.user);

  logger.warn("Non-trade image rejected and deleted", { tradeId, publicId, userMessage });
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

async function downloadImageBuffer(imageUrl) {
  const res = await withTimeout(fetch(imageUrl), "Image download", 15000);
  if (!res.ok) throw new Error(`Image download failed: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function runOcrWithRetry(imagePath) {
  // 1. Google Cloud Vision — most accurate, handles complex broker UIs
  if (isVisionAvailable()) {
    try {
      logger.info("OCR: trying Google Cloud Vision (primary)");
      const buffer = await downloadImageBuffer(imagePath);
      const result = await withTimeout(
        extractTextWithVision(buffer),
        "Google Vision OCR timeout",
        PROCESSING_TIMEOUT_MS
      );
      if (result?.text && result.text.trim().length > 20) {
        logger.info("OCR: Google Cloud Vision succeeded", { textLength: result.text.length });
        return result.text;
      }
      logger.warn("OCR: Google Cloud Vision returned empty text, falling back to Tesseract");
    } catch (error) {
      logger.warn("OCR: Google Cloud Vision failed, falling back to Tesseract", {
        error: error.message,
      });
    }
  }

  // 2. Tesseract — last resort
  let lastError = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      logger.info(`OCR: Tesseract attempt ${attempt}`);
      return await withTimeout(extractText(imagePath), "Processing timeout");
    } catch (error) {
      lastError = error;
      logger.error(`OCR: Tesseract attempt ${attempt} failed`, {
        attempt,
        error: error.message,
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

      // If AI returned nothing or couldn't be parsed, we treat it as non-fatal.
      // The pipeline can continue using OCR-only extraction and mark for review.
      if (!result) {
        lastError = new Error("Empty AI response");
        logger.warn(`AI returned empty result | marketType=${marketType} | attempt=${attempt}`, {
          marketType,
          attempt,
        });
        continue;
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

  // Non-fatal: let the caller continue with OCR-only values.
  logger.warn(`AI extraction failed after retries | marketType=${marketType}`, {
    marketType,
    lastError: lastError?.message,
  });
  return null;
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

async function processTradeUpload({ tradeId, imageUrl, imagePath, jobId, attempt = 1 }) {
  const trade = await Trade.findById(tradeId);
  if (!trade) {
    throw new Error("Trade not found");
  }

  const sourceImage = imageUrl || imagePath || trade.imageUrl || trade.screenshot;
  if (!sourceImage) {
    throw new Error("No image URL available for OCR processing");
  }

  await Trade.findByIdAndUpdate(tradeId, {
    status: "processing",
    ocrJobId: jobId || trade.ocrJobId || tradeId,
    ocrAttempts: attempt,
    processingStartedAt: trade.processingStartedAt || new Date(),
    error: null,
  });

  return withTimeout((async () => {
    const marketType = trade.marketType || "Forex";
    let extractedText = "";
    let ocrSkipped = false;

    try {
      extractedText = await runOcrWithRetry(sourceImage);
    } catch (error) {
      // OCR timed out or failed — don't crash the job, fall back to AI-only mode
      ocrSkipped = true;
      logger.warn(`OCR failed | tradeId=${tradeId} | falling back to AI-only extraction`, {
        tradeId,
        reason: error.message,
      });
    }

    const cleanedText = cleanOcrText(extractedText);
    // Treat as weak if OCR was skipped or produced too little text
    const weakOcr = ocrSkipped || isWeakOcrText(cleanedText);
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

    // Early rejection: if OCR produced text but it contains zero trading signals,
    // this is almost certainly not a trade screenshot. Skip AI (saves API credits)
    // and reject immediately with a clear error.
    if (!ocrSkipped && !isTradeRelatedContent(cleanedText, marketType)) {
      logger.warn(`Non-trade image detected (no trading keywords) | tradeId=${tradeId}`, { tradeId, textLength: cleanedText.length });
      await rejectNonTradeImage(tradeId, trade, "Image does not appear to be a trade screenshot. Please upload a screenshot from your broker platform.");
      return { tradeId, status: "failed", reason: "NOT_A_TRADE_IMAGE" };
    }

    let aiData = null;
    let aiRawResponse = "";
    let parsedTrade = {};
    let parsedTrades = [];
    let geminiVisionUsed = false;

    // ── Primary extraction: Gemini Vision reads the image directly ──────────
    // Runs on every upload regardless of OCR quality. Direct image → JSON is
    // more accurate than OCR text → AI because it avoids all OCR corruption.
    try {
      const visionData = await withTimeout(
        extractTradeWithGeminiVision(sourceImage, { marketType }),
        "Gemini Vision timeout"
      ).catch((err) => {
        logger.warn(`Gemini Vision failed | tradeId=${tradeId}`, { error: err.message });
        return null;
      });

      if (visionData) {
        aiData = visionData;
        aiRawResponse = visionData.rawResponse || "";
        geminiVisionUsed = true;
        logger.info(`Gemini Vision primary extraction succeeded | tradeId=${tradeId}`, { tradeId, marketType });

        if (marketType === "Indian_Market") {
          parsedTrade = mergeIndianAiData({}, aiData);
          parsedTrades = mergeIndianAiTrades([], aiData?.trades || [], broker || aiData.broker || "");
        } else {
          parsedTrade = mergeGenericAiData({}, aiData);
        }

        logExtractedTrades({ tradeId, stage: "Gemini Vision extraction", parsedTrade, parsedTrades });
      }
    } catch (err) {
      logger.warn(`Gemini Vision step error | tradeId=${tradeId}`, { error: err.message });
    }

    // ── OCR-based parsing (runs when Gemini Vision unavailable or failed) ───
    if (!geminiVisionUsed) {
      if (marketType === "Indian_Market" && !weakOcr) {
        parsedTrade = safeParseIndianTrade(cleanedText, { broker });
        parsedTrades = safeParseTradesFromOCR(cleanedText, { broker });
      } else if (!weakOcr) {
        parsedTrade = safeParseTrade(cleanedText);
        parsedTrades = safeParseForexTradesFromOCR(cleanedText);
      } else {
        logger.warn(`Weak OCR detected | tradeId=${tradeId} | switching to text AI fallback`, {
          tradeId,
          textLength: cleanedText.length,
        });
      }

      logExtractedTrades({ tradeId, stage: "OCR-based extraction", parsedTrade, parsedTrades });
    }

    let quality = marketType === "Indian_Market"
      ? calculateIndianConfidenceScore({ parsedTrade, parsedTrades, ocrText: cleanedText, broker })
      : calculateConfidenceScore({ parsedTrade, ocrText: cleanedText });

    logger.info(`Confidence score | tradeId=${tradeId}`, {
      tradeId,
      score: quality.score,
      isValid: quality.validation.isValid,
      isLowConfidence: quality.isLowConfidence,
      source: geminiVisionUsed ? "gemini-vision" : "ocr",
    });

    // ── Text AI fallback (only when Gemini Vision failed AND quality is low) ─
    const shouldUseTextAi =
      !geminiVisionUsed &&
      (weakOcr ||
        (marketType === "Indian_Market" ? isIndianExtractionWeak({ parsedTrade, parsedTrades }) : false) ||
        !quality.validation.isValid ||
        quality.isLowConfidence);

    if (shouldUseTextAi) {
      try {
        aiData = await runAiWithRetry({
          marketType,
          text: cleanedText || sourceImage,
          includeRawResponse: true,
          brokerHint: broker,
          expectedMultiple: marketType === "Indian_Market" && ((parsedTrades && parsedTrades.length > 1) || /POSITIONS|HOLDINGS|CLOSED/i.test(cleanedText)),
        });
        aiRawResponse = aiData?.rawResponse || "";

        if (aiRawResponse.length < 1000) {
          logger.info(`Text AI output | tradeId=${tradeId}`, { response: aiRawResponse });
        } else {
          logger.info(`Text AI output | tradeId=${tradeId}`, { response: aiRawResponse.slice(0, 1000) });
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

        logExtractedTrades({ tradeId, stage: "Text AI extraction", parsedTrade, parsedTrades });
      } catch (error) {
        logger.error(`AI failure | tradeId=${tradeId}`, {
          tradeId,
          reason: error.message,
          stack: error.stack,
        });
        throw error;
      }

      quality = marketType === "Indian_Market"
        ? calculateIndianConfidenceScore({ parsedTrade, parsedTrades, ocrText: cleanedText, broker })
        : calculateConfidenceScore({ parsedTrade, ocrText: cleanedText });

      logger.info(`Confidence score after text AI | tradeId=${tradeId}`, {
        tradeId,
        score: quality.score,
        isValid: quality.validation.isValid,
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

    // Post-pipeline rejection: if confidence is still near-zero after both OCR + AI,
    // the image is very likely unrelated to trading (e.g. AI also couldn't find anything).
    // Distinct from needsReview (score 10–60) which is a blurry/partial trade screenshot.
    if (quality.score < 10) {
      logger.warn(`Near-zero confidence after full pipeline | tradeId=${tradeId} | score=${quality.score}`, { tradeId, score: quality.score });
      await rejectNonTradeImage(tradeId, trade, "Could not extract any trade data from this image. Please upload a clear screenshot from your broker platform.");
      return { tradeId, status: "failed", reason: "NOT_A_TRADE_IMAGE" };
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

    // When multiple trades are parsed, the ghost/placeholder trade that was created
    // on upload must be DELETED — it was never a real trade, just a job tracker.
    // The user will create individual trades from the frontend after reviewing.
    // Only keep (and update) the ghost trade when there is exactly one parsed trade.
    const isMultiTrade = Array.isArray(parsedTrades) && parsedTrades.length > 1;

    if (isMultiTrade) {
      const statusBridgeKey = buildCacheKey("trade_status_bridge", trade.user?.toString(), tradeId);
      await setCache(
        statusBridgeKey,
        {
          jobId: trade.ocrJobId || tradeId,
          status: "completed",
          attemptsMade: attempt || trade.ocrAttempts || 0,
          error: null,
          data: {
            parsedData: { parsedTrade, parsedTrades },
            parsedTrade,
            parsedTrades,
            imageUrl: trade.imageUrl || trade.screenshot || "",
            screenshot: trade.screenshot || trade.imageUrl || "",
            extractedText: cleanedText,
            marketType: trade.marketType || "Forex",
          },
        },
        15 * 60
      );

      await Trade.findByIdAndDelete(tradeId);
      logger.info(`Ghost trade deleted (multi-trade result) | tradeId=${tradeId} | count=${parsedTrades.length}`, {
        tradeId,
        parsedTradeCount: parsedTrades.length,
      });
    } else {
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
      await Trade.findByIdAndUpdate(tradeId, update, { returnDocument: "after", runValidators: true });
    }

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
    { returnDocument: "after" }
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
