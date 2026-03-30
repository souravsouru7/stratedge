const jwt = require("jsonwebtoken");
const User = require("../models/Users");

/**
 * Admin authentication middleware.
 * Verifies JWT token AND checks that the user has role === "admin".
 * Returns 401 for invalid/missing token, 403 for non-admin users.
 */
const adminAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return res.status(401).json({ message: "Not authorized, user not found" });
      }

      if (user.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    return res.status(401).json({ message: "No token provided" });
  }
};

module.exports = { adminAuth };
