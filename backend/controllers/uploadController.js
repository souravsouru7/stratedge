const cloudinary = require("../config/cloudinary");
const { extractText } = require("../services/ocrService");
const { parseTrade } = require("../services/parsingService");

exports.uploadImage = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    console.log("File received:", file.originalname, file.mimetype, file.size);

    // Convert buffer to base64 for Cloudinary
    const b64 = Buffer.from(file.buffer).toString("base64");
    const dataURI = `data:${file.mimetype};base64,${b64}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: "trades"
    });

    const imageUrl = result.secure_url;
    console.log("Image uploaded to Cloudinary:", imageUrl);

    // Run OCR on the uploaded image
    const extractedText = await extractText(imageUrl);
    console.log("Extracted text:", extractedText);

    // Parse the extracted text to get trade data
    const parsedTrade = parseTrade(extractedText);
    console.log("Parsed trade:", parsedTrade);

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
