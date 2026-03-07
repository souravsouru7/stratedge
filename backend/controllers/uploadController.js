const cloudinary = require("../config/cloudinary");
const { extractText } = require("../services/ocrService");
const { parseTrade, parseIndianTrade } = require("../services/parsingService");
const { extractIndianTradeWithAI } = require("../services/aiExtractionService");

exports.uploadImage = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    console.log("File received:", file.originalname, file.mimetype, file.size);

    const b64 = Buffer.from(file.buffer).toString("base64");
    const dataURI = `data:${file.mimetype};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: "trades"
    });

    const imageUrl = result.secure_url;
    const extractedText = await extractText(imageUrl);
    const marketType = String(req.body.marketType || req.query.marketType || "Forex").trim();

    console.log("[Upload] marketType:", marketType, "| OCR length:", extractedText?.length ?? 0, "| OCR preview:", (extractedText || "").slice(0, 120) + "...");

    let parsedTrade;
    if (marketType === "Indian_Market") {
      parsedTrade = parseIndianTrade(extractedText);
      // AI fallback when parser misses pair or profit
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

    res.json({
      url: imageUrl,
      extractedText,
      parsedTrade
    });

  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: error.message });
  }
};
