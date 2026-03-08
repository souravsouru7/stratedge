const cloudinary = require("../config/cloudinary");
const { extractText } = require("../services/ocrService");
const { extractTextWithVision, isVisionAvailable } = require("../services/visionOcrService");
const { parseTrade, parseIndianTrade, parseTradesFromOCR } = require("../services/parsingService");
const { extractIndianTradeWithAI } = require("../services/aiExtractionService");

/**
 * Get OCR text - uses Google Vision for Indian market (high accuracy),
 * Tesseract for others
 */
async function getExtractedText(file, marketType, imageUrl) {
  const isIndian = marketType === "Indian_Market";

  if (isIndian && isVisionAvailable()) {
    const visionResult = await extractTextWithVision(file.buffer);
    if (visionResult && visionResult.text) {
      console.log("[Upload] Using Google Vision OCR | confidence:", visionResult.confidence?.toFixed(2) ?? "N/A");
      return visionResult.text;
    }
    console.warn("[Upload] Vision OCR failed/empty, falling back to Tesseract");
  }

  return extractText(imageUrl);
}

exports.uploadImage = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const marketType = String(req.body.marketType || req.query.marketType || "Forex").trim();
    const brokerOverrideRaw = String(req.body.broker || req.query.broker || "").trim();
    const brokerOverride =
      brokerOverrideRaw && brokerOverrideRaw.toUpperCase() !== "AUTO"
        ? brokerOverrideRaw
        : null;
    console.log("File received:", file.originalname, file.mimetype, file.size, "| market:", marketType);
    if (brokerOverride) console.log("[Upload] broker override:", brokerOverride);

    const b64 = Buffer.from(file.buffer).toString("base64");
    const dataURI = `data:${file.mimetype};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: "trades"
    });

    const imageUrl = result.secure_url;

    let extractedText = await getExtractedText(file, marketType, imageUrl);

    console.log("[Upload] marketType:", marketType, "| OCR length:", extractedText?.length ?? 0, "| OCR preview:", (extractedText || "").slice(0, 120) + "...");

    let parsedTrade;
    let parsedTrades = null;
    if (marketType === "Indian_Market") {
      parsedTrade = parseIndianTrade(extractedText, { broker: brokerOverride });
      parsedTrades = parseTradesFromOCR(extractedText, { broker: brokerOverride });
      const badPair =
        !parsedTrade.pair ||
        String(parsedTrade.pair).trim().length < 6 ||
        !/\b\d{4,5}\b/.test(String(parsedTrade.pair)) ||
        !/\b(CE|PE|CALL|PUT|FUT)\b/i.test(String(parsedTrade.pair));
      const needsFallback = badPair || parsedTrade.profit == null;
      if (needsFallback && extractedText.trim().length >= 10) {
        const aiResult = await extractIndianTradeWithAI(extractedText);
        if (aiResult) {
          if (!parsedTrade.pair && aiResult.pair) parsedTrade.pair = aiResult.pair;
          if (parsedTrade.profit == null && aiResult.profit != null) parsedTrade.profit = aiResult.profit;
          if (!parsedTrade.quantity && aiResult.quantity != null) parsedTrade.quantity = aiResult.quantity;
          if (!parsedTrade.strikePrice && aiResult.strikePrice != null) parsedTrade.strikePrice = aiResult.strikePrice;
          if (aiResult.optionType) parsedTrade.optionType = aiResult.optionType;
        }
      }
    } else {
      parsedTrade = parseTrade(extractedText);
    }

    console.log("[Upload] parsedTrade:", JSON.stringify(parsedTrade));
    if (parsedTrades) console.log("[Upload] parsedTrades:", JSON.stringify(parsedTrades));

    res.json({
      url: imageUrl,
      extractedText,
      parsedTrade,
      ...(parsedTrades && parsedTrades.length > 0 && { parsedTrades })
    });

  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: error.message });
  }
};
