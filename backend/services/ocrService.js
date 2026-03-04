const Tesseract = require("tesseract.js");

exports.extractText = async (imageUrl) => {

  try {

    const result = await Tesseract.recognize(
      imageUrl,
      "eng"
    );

    return result.data.text;

  } catch (error) {
    console.error(error);
    throw error;
  }

};