/**
 * Google Cloud Vision OCR for Indian market screenshots
 * High-accuracy text extraction vs Tesseract for broker layouts
 */

const vision = require("@google-cloud/vision");
const path = require("path");

// Optional: image pre-processing to make OCR easier
let sharp = null;
let hasSharp = false;
try {
  // sharp is a native module; if install fails we just skip preprocessing
  // (this try/catch prevents the server from crashing on require error)
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  sharp = require("sharp");
  hasSharp = true;
} catch (e) {
  console.warn("[Vision OCR] sharp not available, skipping image preprocessing");
}

let client = null;

function getVisionClient() {
  if (client) return client;
  const keyPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(__dirname, "../config/even-plating-440012-a9-0dc833ee5b8e.json");
  try {
    client = new vision.ImageAnnotatorClient({ keyFilename: keyPath });
    return client;
  } catch (err) {
    console.error("[Vision OCR] Failed to init client:", err.message);
    return null;
  }
}

/**
 * Light preprocessing to improve text clarity for broker screenshots:
 * - auto-rotate using EXIF
 * - resize to max width ~1200px
 * - convert to grayscale
 * - normalize contrast
 * - sharpen edges
 */
async function preprocessImageForVision(imageBuffer) {
  if (!hasSharp || !imageBuffer) return imageBuffer;

  try {
    const processed = await sharp(imageBuffer)
      .rotate() // deskew / use EXIF
      .resize({ width: 1200, withoutEnlargement: true })
      .grayscale()
      .normalize()
      .sharpen()
      .toFormat("png")
      .toBuffer();

    console.log("[Vision OCR] Preprocessed image (grayscale + sharpen + resize) before OCR");
    return processed;
  } catch (err) {
    console.warn("[Vision OCR] Preprocess failed, using raw buffer:", err.message);
    return imageBuffer;
  }
}

/**

 * @param {Buffer} imageBuffer - Raw image bytes
 * @returns {{ text: string, confidence?: number } | null}
 */
async function extractTextWithVision(imageBuffer) {
  const visionClient = getVisionClient();
  if (!visionClient) return null;

  // Try to make the image easier for OCR to read
  const processedBuffer = await preprocessImageForVision(imageBuffer);

  try {
    // Run both modes; on mobile screenshots sometimes textDetection performs better
    const [docResult] = await visionClient.documentTextDetection({
      image: { content: processedBuffer },
    });
    const [textResult] = await visionClient.textDetection({
      image: { content: processedBuffer },
    });

    const docText = docResult?.fullTextAnnotation?.text || "";
    const docConf =
      docResult?.fullTextAnnotation?.pages?.[0]?.confidence ??
      docResult?.fullTextAnnotation?.confidence ??
      0;

    const textText = textResult?.fullTextAnnotation?.text || "";
    const textConf =
      textResult?.fullTextAnnotation?.pages?.[0]?.confidence ??
      textResult?.fullTextAnnotation?.confidence ??
      0;

    const score = (t, c) => {
      const s = String(t || "");
      const hasContract = /\b(NIFTY|BANKNIFTY|FINNIFTY|MIDCPNIFTY|SENSEX|BANKEX)\b/i.test(s) && /\b(CE|PE|CALL|PUT)\b/i.test(s);
      const hasRupee = /₹/.test(s);
      const hasPnL = /P\s*&?\s*L|Profit|PNL/i.test(s);
      // Prefer text that contains contract + ₹ + P&L signals, then length, then confidence
      return (hasContract ? 400 : 0) + (hasRupee ? 250 : 0) + (hasPnL ? 120 : 0) + Math.min(s.length, 2000) * 0.05 + (c || 0) * 20;
    };

    const docScore = score(docText, docConf);
    const textScore = score(textText, textConf);

    const picked = textScore > docScore
      ? { text: textText, confidence: textConf, mode: "textDetection" }
      : { text: docText, confidence: docConf, mode: "documentTextDetection" };

    if (!picked.text) return { text: "", confidence: 0, mode: picked.mode };
    console.log("[Vision OCR] Mode picked:", picked.mode, "| score:", (picked.mode === "textDetection" ? textScore : docScore).toFixed(1));
    return { text: picked.text.trim(), confidence: picked.confidence, mode: picked.mode };
  } catch (err) {
    console.error("[Vision OCR] Error:", err.message);
    return null;
  }
}

/**
 * Check if Vision OCR is available (credentials present)
 */
function isVisionAvailable() {
  const keyPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(__dirname, "../config/even-plating-440012-a9-0dc833ee5b8e.json");
  const fs = require("fs");
  return fs.existsSync(keyPath);
}

module.exports = {
  extractTextWithVision,
  isVisionAvailable,
};
