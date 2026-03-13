const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser,
  googleLogin,
  getMe,
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

// Basic profile for logged-in user
router.get("/me", protect, getMe);

module.exports = router;