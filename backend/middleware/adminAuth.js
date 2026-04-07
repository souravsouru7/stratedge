const jwt = require("jsonwebtoken");
const User = require("../models/Users");
const { appConfig } = require("../config");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

/**
 * Admin authentication middleware.
 * Verifies JWT token AND checks that the user has role === "admin".
 * Returns 401 for invalid/missing token, 403 for non-admin users.
 */
const adminAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (!req.headers.authorization || !req.headers.authorization.startsWith("Bearer")) {
    throw new ApiError(401, "No token provided", "AUTH_REQUIRED");
  }

  token = req.headers.authorization.split(" ")[1];
  if (!token) {
    throw new ApiError(401, "No token provided", "AUTH_REQUIRED");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, appConfig.jwt.secret);
  } catch (error) {
    throw new ApiError(401, "Not authorized, token failed", "INVALID_TOKEN");
  }

  const user = await User.findById(decoded.id).select("-password");
  if (!user) {
    throw new ApiError(401, "Not authorized, user not found", "AUTH_FAILED");
  }

  if (user.role !== "admin") {
    throw new ApiError(403, "Access denied. Admin privileges required.", "FORBIDDEN");
  }

  req.user = user;
  next();
});

module.exports = { adminAuth };
