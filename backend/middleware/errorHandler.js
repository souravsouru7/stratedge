// Centralized error handler so users see friendly messages
// and internals are only logged on the server.

const multer = require("multer");

function errorHandler(err, req, res, next) {
  console.error("Error handler caught:", err);

  if (res.headersSent) {
    return next(err);
  }

  // Handle Multer-specific errors (file uploads)
  if (err instanceof multer.MulterError) {
    let message = "File upload error.";
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "File is too large. Maximum size is 5MB.";
    }
    return res.status(400).json({ message });
  }

  // Custom status code if provided, otherwise 500
  const status = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;

  // Do not leak internal error details to clients for server errors
  const isServerError = status >= 500;
  const message = isServerError
    ? "Something went wrong. Please try again later."
    : err.message || "Request failed.";

  res.status(status).json({ message });
}

module.exports = {
  errorHandler
};

