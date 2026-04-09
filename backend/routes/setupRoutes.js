const express = require("express");
const router = express.Router();

const { getSetups, saveSetups, uploadSetupReferenceImage } = require("../controllers/setupController");
const { protect } = require("../middleware/authMiddleware");
const { uploadSetupReferenceImage: uploadSetupReferenceImageMiddleware } = require("../middleware/upload.middleware");

// Get all setups for current user
router.get("/", protect, getSetups);

router.post("/image", protect, uploadSetupReferenceImageMiddleware, uploadSetupReferenceImage);

// Replace all setups for current user
router.put("/", protect, saveSetups);

module.exports = router;

