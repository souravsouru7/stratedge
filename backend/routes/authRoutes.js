const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser,
  googleLogin,
  getMe,
  getMyPreferences,
  updateMyPreferences,
  acceptTerms,
  forgotPassword,
  verifyOTP,
  resetPassword
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");
const { authRateLimiter } = require("../middleware/rateLimiter");

router.post("/register", authRateLimiter, registerUser);
router.post("/login", authRateLimiter, loginUser);
router.post("/google", authRateLimiter, googleLogin);
router.post("/forgot-password", authRateLimiter, forgotPassword);
router.post("/verify-otp", authRateLimiter, verifyOTP);
router.post("/reset-password", authRateLimiter, resetPassword);

// Terms acceptance (requires valid token — user must be authenticated)
router.post("/accept-terms", protect, acceptTerms);

// Basic profile for logged-in user
router.get("/me", protect, getMe);
router.get("/me/preferences", protect, getMyPreferences);
router.patch("/me/preferences", protect, updateMyPreferences);

module.exports = router;
