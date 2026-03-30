const multer = require("multer");

const storage = multer.memoryStorage();

// Limit uploads to reasonably sized image/PDF files
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg"
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      const error = new Error("Only image files are allowed");
      error.statusCode = 400;
      error.code = "INVALID_FILE_TYPE";
      console.warn(`[Security] Invalid file upload rejected | mimetype=${file.mimetype}`);
      return cb(error);
    }

    cb(null, true);
  }
});

module.exports = upload;
