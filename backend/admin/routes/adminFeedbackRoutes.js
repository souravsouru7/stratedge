const express = require("express");
const router = express.Router();
const { 
  getAllFeedback, 
  updateFeedbackStatus, 
  deleteFeedback 
} = require("../../controllers/feedbackController");
const { adminAuth } = require("../../middleware/adminAuth");

router.get("/", adminAuth, getAllFeedback);
router.patch("/:id", adminAuth, updateFeedbackStatus);
router.delete("/:id", adminAuth, deleteFeedback);

module.exports = router;
