// Basic request sanitization middleware applied globally.
// - Blocks keys starting with '$' or containing '.' to reduce NoSQL / Mongo operator injection risk
// - Can be extended later with more rules as needed.

function hasDangerousKey(obj) {
  if (!obj || typeof obj !== "object") return false;

  return Object.keys(obj).some((key) => {
    if (key.startsWith("$") || key.includes(".")) {
      return true;
    }
    const value = obj[key];
    if (value && typeof value === "object") {
      return hasDangerousKey(value);
    }
    return false;
  });
}

function sanitizeInput(req, res, next) {
  try {
    const targets = [req.body, req.query, req.params];

    for (const target of targets) {
      if (hasDangerousKey(target)) {
        return res.status(400).json({
          message: "Invalid input structure."
        });
      }
    }

    next();
  } catch (err) {
    return res.status(400).json({ message: "Invalid request payload." });
  }
}

module.exports = {
  sanitizeInput
};

