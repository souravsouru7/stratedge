const express = require("express");
const router = express.Router();

const upload = require("../middleware/uploadMiddleware");

const { uploadImage } = require("../controllers/uploadController");

router.post("/", upload.single("image"), uploadImage);

module.exports = router;