const express = require("express");
const router = express.Router();

const upload = require("../middleware/uploadMiddleware");
const { protect } = require("../middleware/authMiddleware");
const { uploadRateLimiter } = require("../middleware/rateLimit");

const { uploadImage } = require("../controllers/uploadController");

router.post("/", uploadRateLimiter, protect, upload.single("image"), uploadImage);

module.exports = router;
