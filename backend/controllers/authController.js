const User = require("../models/Users");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d"
  });
};

const getGoogleClientId = () => {
  return (
    process.env.GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_OAUTH_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  );
};

const getGoogleClient = () => {
  const clientId = getGoogleClientId();
  if (!clientId) {
    const err = new Error("Missing Google OAuth client id in backend env (set GOOGLE_CLIENT_ID)");
    err.code = "GOOGLE_OAUTH_CONFIG_MISSING";
    throw err;
  }
  return new OAuth2Client(clientId);
};

// Register User
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required (name, email, password)" });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      authProvider: "local"
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id)
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login User
exports.loginUser = async (req, res) => {
  try {

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");

    if (user && user.authProvider === "google") {
      return res.status(401).json({ message: "This account uses Google sign-in. Please continue with Google." });
    }

    if (user && user.password && (await bcrypt.compare(password, user.password))) {

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id)
      });

    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Google Login (ID token -> verify -> find/create -> JWT)
exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body || {};
    if (!credential) {
      return res.status(400).json({ message: "Missing credential" });
    }

    const client = getGoogleClient();
    const clientId = getGoogleClientId();
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId
    });

    const payload = ticket.getPayload();
    const email = payload?.email;
    const emailVerified = payload?.email_verified;

    if (!email || !emailVerified) {
      return res.status(401).json({ message: "Google email not verified" });
    }

    const googleId = payload.sub;
    const name = payload.name || (payload.given_name ? `${payload.given_name} ${payload.family_name || ""}`.trim() : "Trader");
    const avatar = payload.picture || null;

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name,
        email,
        password: undefined,
        authProvider: "google",
        googleId,
        avatar
      });
    } else {
      // Upgrade existing local user to have googleId/avatar if missing (keep provider local unless it was google)
      const updates = {};
      if (!user.googleId) updates.googleId = googleId;
      if (!user.avatar && avatar) updates.avatar = avatar;
      if (user.authProvider !== "google" && user.authProvider !== "local") updates.authProvider = "local";
      if (Object.keys(updates).length > 0) {
        await User.updateOne({ _id: user._id }, { $set: updates });
        user = await User.findById(user._id);
      }
    }

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id)
    });
  } catch (error) {
    console.error("[Auth] googleLogin error:", error);
    if (error?.code === "GOOGLE_OAUTH_CONFIG_MISSING") {
      return res.status(500).json({ message: "Server misconfigured for Google login" });
    }
    return res.status(401).json({ message: "Google authentication failed" });
  }
};

// Get current user's basic profile
exports.getMe = async (req, res) => {
  try {
    // `protect` middleware attaches the full user document (without password)
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    res.json({
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      createdAt: req.user.createdAt
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};