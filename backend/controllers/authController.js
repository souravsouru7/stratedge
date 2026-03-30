const User = require("../models/Users");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const { sendOTPEmail } = require("../services/mailService");
const crypto = require("crypto");

// Generate JWT
const generateToken = (id, role) => {
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn
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
      role: user.role,
      token: generateToken(user._id, user.role)
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
      user.lastLogin = new Date();
      await user.save();

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id, user.role)
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
    const webClientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const androidClientId = process.env.ANDROID_GOOGLE_CLIENT_ID?.trim();
    
    const audiences = [];
    if (webClientId) audiences.push(webClientId);
    if (androidClientId) audiences.push(androidClientId);

    // Debug: Print the audience from the token before verification
    try {
      const parts = credential.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        console.log("[Auth] Token Audience (aud):", payload.aud);
        console.log("[Auth] Token Authorized Party (azp):", payload.azp);
      }
    } catch (e) {
      console.error("[Auth] Failed to parse token payload for debugging");
    }

    console.log("[Auth] Attempting Google login with allowed audiences:", audiences);

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: audiences
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
        name: payload.name,
        email: payload.email,
        googleId: payload.sub,
        avatar: payload.picture,
        authProvider: "google",
        lastLogin: new Date()
      });
    } else {
      // Upgrade existing local user to have googleId/avatar if missing (keep provider local unless it was google)
      const updates = {};
      if (!user.googleId) updates.googleId = googleId;
      if (!user.avatar && avatar) updates.avatar = avatar;
      if (user.authProvider !== "google" && user.authProvider !== "local") updates.authProvider = "local";
      if (Object.keys(updates).length > 0) {
        updates.lastLogin = new Date(); // Track activity
        await User.updateOne({ _id: user._id }, { $set: updates });
        user = await User.findById(user._id);
      } else {
        user.lastLogin = new Date();
        await user.save();
      }
    }

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role)
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
      role: req.user.role,
      createdAt: req.user.createdAt
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Forgot Password - Send OTP
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.authProvider === "google") {
      return res.status(400).json({ message: "This account uses Google sign-in. Please use Google to login." });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpires = otpExpires;
    await user.save();

    await sendOTPEmail(email, otp);

    res.json({ message: "OTP sent to your email" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const user = await User.findOne({ 
      email, 
      resetPasswordOTP: otp,
      resetPasswordOTPExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    res.json({ message: "OTP verified. You can now reset your password." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    if (!email || !otp || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ 
      email, 
      resetPasswordOTP: otp,
      resetPasswordOTPExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    
    // Clear OTP fields
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successful. Please login with your new password." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};