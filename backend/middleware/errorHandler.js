// Centralized error handler so users see friendly messages
// and internals are only logged on the server.

const multer = require("multer");
const { logger } = require("../utils/logger");

function errorHandler(err, req, res, next) {
  // Log all errors centrally
  logger.error(`Error in ${req.method} ${req.originalUrl}`, {
    message: err.message,
    stack: err.stack,
    route: req.originalUrl,
    method: req.method,
    userAgent: req.get('user-agent'),
    ip: req.ip,
  });

  if (res.headersSent) {
    return next(err);
  }

  // Handle Multer-specific errors (file uploads)
  if (err instanceof multer.MulterError) {
    let message = "File upload error.";
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "File is too large. Maximum size is 5MB.";
    }
    logger.warn(`Multer upload error | code=${err.code} | path=${req.originalUrl}`, {
      code: err.code,
      route: req.originalUrl,
      message: err.message,
    });
    return res.status(400).json({ message });
  }

  if (err.code === "INVALID_FILE_TYPE") {
    logger.warn(`Invalid file type error | path=${req.originalUrl}`, {
      route: req.originalUrl,
      message: err.message,
    });
    return res.status(400).json({ message: err.message || "Only image files are allowed" });
  }

  // Custom status code if provided, otherwise 500
  const status = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;

  // Do not leak internal error details to clients for server errors
  const isServerError = status >= 500;
  const message = isServerError
    ? "Something went wrong. Please try again later."
    : err.message || "Request failed.";

  if (status === 401 || status === 403) {
    logger.warn(`Authorization error response | status=${status} | path=${req.originalUrl}`, {
      status,
      route: req.originalUrl,
      message: err.message,
    });
  }

  res.status(status).json({ message });
}

module.exports = {
  errorHandler
};
