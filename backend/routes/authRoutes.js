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

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/google", googleLogin);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOTP);
router.post("/reset-password", resetPassword);

// Terms acceptance (requires valid token — user must be authenticated)
router.post("/accept-terms", protect, acceptTerms);

// Basic profile for logged-in user
router.get("/me", protect, getMe);
router.get("/me/preferences", protect, getMyPreferences);
router.patch("/me/preferences", protect, updateMyPreferences);

module.exports = router;
