class ApiError extends Error {
  constructor(statusCode, message, errorCode = "INTERNAL_ERROR", details = null) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

module.exports = ApiError;
