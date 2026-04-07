const User = require("../../models/Users");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { appConfig } = require("../../config");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");

// Generate JWT with role
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, appConfig.jwt.secret, {
    expiresIn: appConfig.jwt.expiresIn,
  });
};

/**
 * Admin Login
 * POST /api/admin/auth/login
 * Validates credentials and confirms user has admin role.
 */
exports.adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required", "VALIDATION_ERROR");
  }

    const user = await User.findOne({ email }).select("+password");

  if (!user) {
    throw new ApiError(401, "Invalid credentials", "INVALID_CREDENTIALS");
  }

  if (user.authProvider === "google") {
    throw new ApiError(401, "This account uses Google sign-in. Admin login requires email/password.", "AUTH_PROVIDER_MISMATCH");
  }

  if (!user.password) {
    throw new ApiError(401, "Invalid credentials", "INVALID_CREDENTIALS");
  }

    const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid credentials", "INVALID_CREDENTIALS");
  }

    // Check admin role
  if (user.role !== "admin") {
    throw new ApiError(403, "Access denied. You do not have admin privileges.", "FORBIDDEN");
  }

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    token: generateToken(user._id, user.role)
  });
});

/**
 * Get Admin Profile
 * GET /api/admin/auth/me
 * Returns the current admin's profile (requires adminAuth middleware).
 */
exports.getAdminProfile = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Not authorized", "AUTH_FAILED");
  }

  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    createdAt: req.user.createdAt
  });
});
