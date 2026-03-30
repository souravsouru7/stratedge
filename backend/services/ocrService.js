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
    return await sharp(imageInput)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .grayscale()
      .normalize()
      .sharpen()
      .png()
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
        tessedit_pageseg_mode: String(Tesseract.PSM.SINGLE_BLOCK),
        preserve_interword_spaces: "1",
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
