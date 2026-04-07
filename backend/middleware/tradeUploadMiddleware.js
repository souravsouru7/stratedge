const { uploadTradeImage } = require("./upload.middleware");

// Backward-compatible adapter for existing routes that expect `tradeUpload.single("image")`.
module.exports = {
  single() {
    return uploadTradeImage;
  },
};
