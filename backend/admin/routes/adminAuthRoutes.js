const express = require("express");
const router = express.Router();

const { adminLogin, getAdminProfile } = require("../controllers/adminAuthController");
const { adminAuth } = require("../../middleware/adminAuth");

// POST /api/admin/auth/login
router.post("/login", adminLogin);

// GET /api/admin/auth/me (protected – admin only)
router.get("/me", adminAuth, getAdminProfile);

module.exports = router;
