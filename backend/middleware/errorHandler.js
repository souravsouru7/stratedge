const multer = require("multer");
const mongoose = require("mongoose");
const ApiError = require("../utils/ApiError");
const { appConfig } = require("../config");
const { logger } = require("../utils/logger");

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let normalizedError = err;

  if (err instanceof multer.MulterError) {
    let message = "File upload error.";
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "File is too large.";
    } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
      message = "Invalid file type. Only supported image files are allowed.";
    }
    normalizedError = new ApiError(400, message, err.code || "UPLOAD_ERROR");
  }

  if (err?.code === "INVALID_FILE_TYPE") {
    normalizedError = new ApiError(400, err.message || "Invalid file type.", "INVALID_FILE_TYPE");
  }

  if (err instanceof mongoose.Error.ValidationError) {
    normalizedError = new ApiError(
      400,
      Object.values(err.errors).map((entry) => entry.message).join(", ") || "Validation failed.",
      "VALIDATION_ERROR"
    );
  }

  if (err instanceof mongoose.Error.CastError) {
    normalizedError = new ApiError(400, `Invalid ${err.path}.`, "INVALID_ID");
  }

  if (err?.code === 11000) {
    const duplicateField = Object.keys(err.keyPattern || {})[0] || "resource";
    normalizedError = new ApiError(409, `${duplicateField} already exists.`, "DUPLICATE_RESOURCE");
  }

  const statusCode = normalizedError?.statusCode && Number.isInteger(normalizedError.statusCode)
    ? normalizedError.statusCode
    : 500;
  const errorCode = normalizedError?.errorCode || "INTERNAL_ERROR";
  const isServerError = statusCode >= 500;
  const responseMessage = isServerError
    ? "Something went wrong"
    : normalizedError?.message || "Request failed";

  logger[isServerError ? "error" : "warn"](`Error in ${req.method} ${req.originalUrl}`, {
    statusCode,
    errorCode,
    message: normalizedError?.message,
    stack: normalizedError?.stack,
    route: req.originalUrl,
    method: req.method,
    userAgent: req.get("user-agent"),
    ip: req.ip,
  });

  const payload = {
    status: "error",
    message: responseMessage,
    errorCode,
  };

  if (normalizedError?.details) {
    payload.details = normalizedError.details;
  }

  if (appConfig.env !== "production" && normalizedError?.stack) {
    payload.stack = normalizedError.stack;
  }

  res.status(statusCode).json(payload);
}

module.exports = {
  errorHandler
};
