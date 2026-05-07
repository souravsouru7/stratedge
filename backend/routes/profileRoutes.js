const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { registerFcmToken, removeFcmToken } = require("../controllers/profileController");

router.post("/fcm-token", protect, registerFcmToken);
router.delete("/fcm-token", protect, removeFcmToken);

module.exports = router;
