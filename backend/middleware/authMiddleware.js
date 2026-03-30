const jwt = require("jsonwebtoken");
const User = require("../models/Users");

const protect = async (req, res, next) => {
  let token;

  if (!req.headers.authorization || !req.headers.authorization.startsWith("Bearer")) {
    console.warn(`[Security] Missing token | path=${req.originalUrl} | ip=${req.ip}`);
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    token = req.headers.authorization.split(" ")[1];

    if (!token) {
      console.warn(`[Security] Malformed authorization header | path=${req.originalUrl} | ip=${req.ip}`);
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      console.warn(`[Security] Token for missing user | path=${req.originalUrl} | ip=${req.ip}`);
      return res.status(401).json({ message: "Not authorized" });
    }

    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      console.warn(`[Security] Expired token | path=${req.originalUrl} | ip=${req.ip}`);
      return res.status(401).json({ message: "Token expired, please login again" });
    }

    if (error.name === "JsonWebTokenError" || error.name === "NotBeforeError") {
      console.warn(`[Security] Invalid token | path=${req.originalUrl} | ip=${req.ip}`);
      return res.status(403).json({ message: "Invalid token" });
    }

    console.error("[Security] Token verification failure:", error.message);
    return res.status(401).json({ message: "Not authorized" });
  }
};

module.exports = { protect };
