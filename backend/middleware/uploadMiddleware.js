const { createUploadMiddleware } = require("./upload.middleware");

// Backward-compatible adapter for legacy routes that expect `upload.single(field)`.
module.exports = {
  single(fieldName) {
    return createUploadMiddleware({
      fieldName,
      folderName: "uploads",
      required: false,
    });
  },
};
