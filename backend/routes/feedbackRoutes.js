const express = require("express");
const router = express.Router();
const { submitFeedback } = require("../controllers/feedbackController");
const { protect } = require("../middleware/authMiddleware");
const { uploadFeedbackScreenshot } = require("../middleware/upload.middleware");

router.post("/", protect, uploadFeedbackScreenshot, submitFeedback);

module.exports = router;
