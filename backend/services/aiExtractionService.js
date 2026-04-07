const { withTimeout, TIMEOUT_CONFIG } = require("../middleware/timeout");
const { logger } = require("../utils/logger");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { appConfig } = require("../config");

const GEMINI_EXTRACTION_TIMEOUT_MS = Math.max(TIMEOUT_CONFIG.aiTimeout, 90_000);

async function callAIForTradeExtraction(prompt, timeoutMs = TIMEOUT_CONFIG.aiTimeout) {
  const openaiKey = appConfig.ai.openaiApiKey;
  const geminiKey = appConfig.ai.geminiApiKey;

  // Prefer OpenAI if configured, otherwise fall back to Gemini.
  if (openaiKey) {
    try {
      const fetchPromise = fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: appConfig.ai.openaiModel,
          messages: [{ role: "user", content: prompt }],
          temperature: 0,
          max_tokens: 500,
        }),
      });

      const res = await withTimeout(fetchPromise, "OpenAI AI API call", timeoutMs);

      if (!res.ok) {
        const err = await res.text();
        logger.warn(`OpenAI API error | status=${res.status}`, {
          status: res.status,
          error: err,
        });
        return null;
      }

      const result = await withTimeout(res.json(), "OpenAI AI API response parsing", 5000);
      return result;
    } catch (err) {
      if (err.name === "TimeoutError") {
        logger.error(`OpenAI AI extraction timed out`, {
          error: err.message,
          duration: err.duration,
        });
      } else {
        logger.warn(`OpenAI AI extraction error`, {
          error: err.message,
        });
      }
      return null;
    }
  }

  if (!geminiKey) {
    logger.warn("AI extraction skipped: neither OPENAI_API_KEY nor GEMINI_API_KEY is set");
    return null;
  }

  // Gemini fallback (returns an OpenAI-like shape so downstream parsing works unchanged)
  try {
    const genAI = new GoogleGenerativeAI(geminiKey);
    const modelName = appConfig.ai.geminiTradeModel;
    const model = genAI.getGenerativeModel({ model: modelName });
    const geminiTimeout = Math.max(timeoutMs, GEMINI_EXTRACTION_TIMEOUT_MS);

    const runGemini = async (inputPrompt) => {
      const geminiPromise = model.generateContent({
        contents: [{ role: "user", parts: [{ text: inputPrompt }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 600,
        },
      });
      return withTimeout(geminiPromise, "Gemini AI call", geminiTimeout);
    };

    let result;
    try {
      result = await runGemini(prompt);
    } catch (err) {
      if (err.name !== "TimeoutError") throw err;

      // Retry once with a shorter prompt to reduce model latency on large OCR text.
      logger.warn("Gemini AI extraction timed out on first attempt, retrying with compact prompt", {
        timeout: `${geminiTimeout}ms`,
      });
      const compactPrompt = String(prompt).slice(0, 2600);
      result = await runGemini(compactPrompt);
    }

    const text = result?.response?.text?.() || "";
    return { choices: [{ message: { content: text } }] };
  } catch (err) {
    if (err.name === "TimeoutError") {
      logger.error(`Gemini AI extraction timed out`, {
        error: err.message,
        duration: err.duration,
      });
    } else {
      logger.warn(`Gemini AI extraction error`, {
        error: err.message,
      });
    }
    return null;
  }
}

function stripJsonEnvelope(content) {
  if (!content) return null;
  return content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function toNumberOrNull(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function mapIndianTradePayload(parsed) {
  return {
    pair: parsed.pair && typeof parsed.pair === "string" ? parsed.pair.trim() : null,
    profit: toNumberOrNull(parsed.profit),
    quantity: toNumberOrNull(parsed.quantity),
    strikePrice: toNumberOrNull(parsed.strikePrice),
    optionType: parsed.optionType === "PE" || parsed.optionType === "CE" ? parsed.optionType : null,
    underlying: parsed.underlying && typeof parsed.underlying === "string" ? parsed.underlying.trim() : null,
    entryPrice: toNumberOrNull(parsed.entryPrice),
    exitPrice: toNumberOrNull(parsed.exitPrice),
    broker: parsed.broker && typeof parsed.broker === "string" ? parsed.broker.trim() : null,
  };
}

function mapIndianTradeList(parsed) {
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item) => mapIndianTradePayload(item || {}))
    .filter((item) => item.pair || item.quantity != null || item.profit != null || item.entryPrice != null);
}

async function extractIndianTradeWithAI(extractedText, options = {}) {
  if (!extractedText || extractedText.trim().length < 10) {
    return null;
  }

  const brokerHint = options.brokerHint ? `Broker hint: ${options.brokerHint}\n` : "";
  const multiHint = options.expectedMultiple
    ? "The screenshot may contain multiple trades. Return every detected trade in the trades array.\n"
    : "";
  const prompt = options.improvedPrompt
    ? `You are extracting structured Indian broker trade data from noisy OCR. Clean OCR mistakes mentally and return ONLY valid JSON.
${brokerHint}${multiHint}Required fields per trade: pair, quantity, entryPrice, profit.
Optional fields per trade: strikePrice, optionType, underlying, exitPrice, broker.
Detect broker-specific formats such as Zerodha, Upstox, Angel One, Groww, Dhan, Fyers, 5paisa, ICICI Direct, Kotak, Paytm Money.
If there are multiple positions, return all of them in "trades". If only one trade exists, "trades" may contain one item.
Never include markdown. Never include explanations. Use null for missing fields.

OCR text:
${String(extractedText).slice(0, 5000)}

JSON format:
{"pair":"NIFTY 26000 PE","quantity":0,"entryPrice":0,"exitPrice":0,"profit":0,"strikePrice":0,"optionType":"CE|PE","underlying":"NIFTY","broker":"Zerodha","trades":[{"pair":"NIFTY 26000 PE","quantity":0,"entryPrice":0,"exitPrice":0,"profit":0,"strikePrice":0,"optionType":"PE","underlying":"NIFTY","broker":"Zerodha"}]}`
    : `Extract Indian options/F&O trade data from this OCR text. Return ONLY valid JSON, no markdown.
${brokerHint}${multiHint}Fields per trade: pair (e.g. "NIFTY 26000 PE"), profit (number), quantity (lots, number), strikePrice (number), optionType ("CE" or "PE"), underlying (e.g. "NIFTY"), entryPrice, exitPrice, broker.
Return every visible trade inside "trades". Also set top-level fields to the best first/main trade.

OCR text:
${String(extractedText).slice(0, 4000)}

JSON format: {"pair": "...", "profit": 0, "quantity": 0, "entryPrice": 0, "exitPrice": 0, "strikePrice": 0, "optionType": "CE|PE", "underlying": "...", "broker": "...", "trades": [{"pair": "...", "profit": 0, "quantity": 0, "entryPrice": 0, "exitPrice": 0, "strikePrice": 0, "optionType": "CE|PE", "underlying": "...", "broker": "..."}]}
Use null for missing values.`;

  const data = await callAIForTradeExtraction(prompt);
  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) return null;

  try {
    const jsonStr = stripJsonEnvelope(content);
    const parsed = JSON.parse(jsonStr);
    const mapped = mapIndianTradePayload(parsed);
    const mappedTrades = mapIndianTradeList(parsed?.trades);
    const response = mappedTrades.length > 0 ? { ...mapped, trades: mappedTrades } : mapped;
    return options.includeRawResponse ? { ...response, rawResponse: content } : response;
  } catch (err) {
    // Gemini sometimes returns extra text around JSON. Try to recover the first JSON object.
    try {
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw err;
      const jsonStr = stripJsonEnvelope(match[0]);
      const parsed = JSON.parse(jsonStr);
      const mapped = mapIndianTradePayload(parsed);
      const mappedTrades = mapIndianTradeList(parsed?.trades);
      const response = mappedTrades.length > 0 ? { ...mapped, trades: mappedTrades } : mapped;
      return options.includeRawResponse ? { ...response, rawResponse: content } : response;
    } catch (err2) {
      console.warn("[AI extraction] JSON parse error:", err.message);
      return null;
    }
  }
}

async function extractTradeWithAI(extractedText, options = {}) {
  if (!extractedText || extractedText.trim().length < 10) {
    return null;
  }

  const marketType = options.marketType || "Forex";
  const prompt = `Extract structured ${marketType} trade data from noisy OCR text. Return ONLY valid JSON.
Required fields: pair, quantity, entryPrice, profit.
Optional fields: type, exitPrice, stopLoss, takeProfit, broker, strikePrice, optionType, underlying.
If a number is uncertain, still return the best numeric guess or null.
No markdown. No explanation.

OCR text:
${String(extractedText).slice(0, 5000)}

JSON format:
{"pair":"...","type":"BUY|SELL","quantity":0,"entryPrice":0,"exitPrice":0,"profit":0,"stopLoss":0,"takeProfit":0,"broker":"...","strikePrice":0,"optionType":"CE|PE","underlying":"..."}`;

  const data = await callAIForTradeExtraction(prompt);
  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) return null;

  try {
    const jsonStr = stripJsonEnvelope(content);
    const parsed = JSON.parse(jsonStr);
    const mapped = {
      pair: parsed.pair && typeof parsed.pair === "string" ? parsed.pair.trim() : null,
      type: parsed.type && typeof parsed.type === "string" ? parsed.type.trim().toUpperCase() : null,
      quantity: typeof parsed.quantity === "number" ? parsed.quantity : null,
      entryPrice: typeof parsed.entryPrice === "number" ? parsed.entryPrice : null,
      exitPrice: typeof parsed.exitPrice === "number" ? parsed.exitPrice : null,
      profit: typeof parsed.profit === "number" ? parsed.profit : null,
      stopLoss: typeof parsed.stopLoss === "number" ? parsed.stopLoss : null,
      takeProfit: typeof parsed.takeProfit === "number" ? parsed.takeProfit : null,
      broker: parsed.broker && typeof parsed.broker === "string" ? parsed.broker.trim() : null,
      strikePrice: typeof parsed.strikePrice === "number" ? parsed.strikePrice : null,
      optionType: parsed.optionType === "PE" || parsed.optionType === "CE" ? parsed.optionType : null,
      underlying: parsed.underlying && typeof parsed.underlying === "string" ? parsed.underlying.trim() : null,
    };
    return options.includeRawResponse ? { ...mapped, rawResponse: content } : mapped;
  } catch (err) {
    console.warn("[AI extraction] Generic JSON parse error:", err.message);
    return null;
  }
}

module.exports = { extractIndianTradeWithAI, extractTradeWithAI };
