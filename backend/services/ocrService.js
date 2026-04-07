const Tesseract = require("tesseract.js");
const { withTimeout, TIMEOUT_CONFIG } = require("../middleware/timeout");
const { logger } = require("../utils/logger");

let sharp = null;
try {
  // eslint-disable-next-line global-require
  sharp = require("sharp");
} catch (error) {
  console.warn("[Tesseract OCR] sharp not available, skipping preprocessing");
}

async function preprocessImageForTesseract(imageInput) {
  if (!sharp || !Buffer.isBuffer(imageInput)) return imageInput;

  try {
    // Keep width modest — larger images slow Tesseract dramatically
    return await sharp(imageInput)
      .rotate()
      .resize({ width: 1200, withoutEnlargement: true })
      .grayscale()
      .normalize()
      .png({ compressionLevel: 1 }) // fast encode
      .toBuffer();
  } catch (error) {
    console.warn("[Tesseract OCR] Preprocess failed, using raw image:", error.message);
    return imageInput;
  }
}

exports.extractText = async (imageInput, timeoutMs = TIMEOUT_CONFIG.ocrTimeout) => {
  const startTime = Date.now();
  
  try {
    const processedInput = await preprocessImageForTesseract(imageInput);
    
    // Wrap OCR operation with timeout
    const result = await withTimeout(
      Tesseract.recognize(processedInput, "eng", {
        logger: () => {},
        // SPARSE_TEXT is faster than SINGLE_BLOCK for trading screenshots
        // which contain mixed tables, numbers, and labels
        tessedit_pageseg_mode: String(Tesseract.PSM.SPARSE_TEXT),
        preserve_interword_spaces: "1",
        // Limit character set to what trading data actually contains
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,+-:/% #@()\n\t ",
      }),
      "OCR extraction",
      timeoutMs
    );
    
    const duration = Date.now() - startTime;
    logger.info(`OCR completed successfully | duration=${duration}ms`, {
      duration: `${duration}ms`,
      textLength: result.data.text?.length || 0,
    });
    
    return result.data.text;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (error.name === 'TimeoutError') {
      logger.error(`OCR timed out | duration=${duration}ms`, {
        duration: `${duration}ms`,
        timeout: `${timeoutMs}ms`,
        error: error.message,
      });
    } else {
      logger.error(`OCR failed | duration=${duration}ms`, {
        duration: `${duration}ms`,
        error: error.message,
        stack: error.stack,
      });
    }
    
    throw error;
  }
};
