const User = require("../../models/Users");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Generate JWT with role
const generateToken = (id, role) => {
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn
  });
};

/**
 * Admin Login
 * POST /api/admin/auth/login
 * Validates credentials and confirms user has admin role.
 */
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.authProvider === "google") {
      return res.status(401).json({ message: "This account uses Google sign-in. Admin login requires email/password." });
    }

    if (!user.password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check admin role
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. You do not have admin privileges." });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get Admin Profile
 * GET /api/admin/auth/me
 * Returns the current admin's profile (requires adminAuth middleware).
 */
exports.getAdminProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    res.json({
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      createdAt: req.user.createdAt
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
