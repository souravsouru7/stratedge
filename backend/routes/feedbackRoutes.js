const express = require("express");
const router = express.Router();
const { submitFeedback } = require("../controllers/feedbackController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

router.post("/", protect, upload.single("screenshot"), submitFeedback);

module.exports = router;
