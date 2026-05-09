const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { registerFcmToken, removeFcmToken, getPushStatus, sendTestNotification } = require("../controllers/profileController");

router.post("/fcm-token", protect, registerFcmToken);
router.delete("/fcm-token", protect, removeFcmToken);
router.get("/push-status", protect, getPushStatus);
router.post("/test-notification", protect, sendTestNotification);

module.exports = router;
