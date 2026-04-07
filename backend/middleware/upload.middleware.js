const multer = require("multer");
const path = require("path");
const cloudinary = require("../config/cloudinary");
const { appConfig } = require("../config");
const { logger } = require("../utils/logger");

const ALLOWED_IMAGE_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function isAllowedImage(file) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const expectedMimeType = ALLOWED_IMAGE_TYPES[ext];

  return Boolean(expectedMimeType && file.mimetype === expectedMimeType);
}

function createCloudinaryStorage(folderName) {
  return {
    _handleFile(req, file, cb) {
      if (!isAllowedImage(file)) {
        return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
      }

      let settled = false;
      const done = (error, payload) => {
        if (settled) return;
        settled = true;
        cb(error, payload);
      };

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folderName,
          resource_type: "image",
          secure: true,
          unique_filename: true,
          use_filename: false,
        },
        (error, result) => {
          if (error) {
            return done(error);
          }

          return done(null, {
            path: result.secure_url,
            imageUrl: result.secure_url,
            publicId: result.public_id,
            bytes: result.bytes,
            format: result.format,
            originalname: file.originalname,
            mimetype: file.mimetype,
          });
        }
      );

      file.stream.once("limit", () => {
        uploadStream.destroy(new multer.MulterError("LIMIT_FILE_SIZE", file.fieldname));
      });

      file.stream.once("error", (error) => uploadStream.destroy(error));
      uploadStream.once("error", (error) => done(error));

      file.stream.pipe(uploadStream);
      return undefined;
    },

    _removeFile(req, file, cb) {
      if (!file.publicId) {
        cb(null);
        return;
      }

      cloudinary.uploader.destroy(file.publicId, { resource_type: "image" })
        .then(() => cb(null))
        .catch((error) => cb(error));
    },
  };
}

function createCloudinaryUpload(folderName) {
  return multer({
    storage: createCloudinaryStorage(folderName),
    limits: {
      fileSize: appConfig.upload.maxFileSizeBytes,
      files: 1,
      fields: 20,
      parts: 25,
    },
    fileFilter: (req, file, cb) => {
      if (!isAllowedImage(file)) {
        return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
      }

      return cb(null, true);
    },
  });
}

function formatUploadError(error) {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return `File too large. Max allowed size is ${Math.floor(appConfig.upload.maxFileSizeBytes / (1024 * 1024))}MB.`;
    }

    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return "Invalid file type. Only JPEG, PNG, and WEBP images are allowed.";
    }

    return "Invalid file upload request.";
  }

  return error?.message || "Image upload failed.";
}

function createUploadMiddleware({ fieldName, folderName, required = true }) {
  const cloudinaryUpload = createCloudinaryUpload(folderName);

  return (req, res, next) => {
    cloudinaryUpload.single(fieldName)(req, res, (error) => {
    if (error) {
      logger.warn("Image upload rejected", {
        path: req.originalUrl,
        method: req.method,
        error: error.message,
        code: error.code,
      });

      return res.status(400).json({
        status: "error",
        message: formatUploadError(error),
      });
    }

    if (required && !req.file?.path) {
      return res.status(400).json({
        status: "error",
        message: "Image file is required.",
      });
    }

      req.uploadedImage = req.file?.path
        ? {
            imageUrl: req.file.path,
            publicId: req.file.publicId,
            bytes: req.file.bytes,
            format: req.file.format,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
          }
        : null;

      return next();
    });
  };
}

const uploadTradeImage = createUploadMiddleware({
  fieldName: "image",
  folderName: "trades",
  required: true,
});

const uploadFeedbackScreenshot = createUploadMiddleware({
  fieldName: "screenshot",
  folderName: "feedback",
  required: false,
});

module.exports = {
  createUploadMiddleware,
  uploadFeedbackScreenshot,
  uploadTradeImage,
};
