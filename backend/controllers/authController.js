const User = require("../models/Users");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendOTPEmail } = require("../services/mailService");
const { appConfig } = require("../config");
const { getFirebaseAdmin } = require("../config/firebaseAdmin");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

const generateToken = (id, role) =>
  jwt.sign({ id, role }, appConfig.jwt.secret, {
    expiresIn: appConfig.jwt.expiresIn,
  });

async function verifyFirebaseToken(firebaseIdToken) {
  try {
    const admin = getFirebaseAdmin();
    return await admin.auth().verifyIdToken(firebaseIdToken);
  } catch (error) {
    if (error?.code === "FIREBASE_CONFIG_MISSING") {
      throw new ApiError(500, "Server misconfigured for Firebase login", "FIREBASE_CONFIG_MISSING");
    }
    throw new ApiError(401, "Firebase authentication failed", "AUTH_FAILED");
  }
}

exports.registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, "All fields are required (name, email, password)", "VALIDATION_ERROR");
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new ApiError(400, "User already exists", "VALIDATION_ERROR");
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    authProvider: "local",
  });

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    token: generateToken(user._id, user.role),
  });
});

exports.loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");

  if (user?.authProvider === "google") {
    throw new ApiError(401, "This account uses Google sign-in. Please continue with Google.", "AUTH_PROVIDER_MISMATCH");
  }

  if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
    throw new ApiError(401, "Invalid credentials", "INVALID_CREDENTIALS");
  }

  user.lastLogin = new Date();
  await user.save();

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    token: generateToken(user._id, user.role),
  });
});

exports.googleLogin = asyncHandler(async (req, res) => {
  const { idToken, credential } = req.body || {};
  const firebaseIdToken = idToken || credential;

  if (!firebaseIdToken) {
    throw new ApiError(400, "Missing Firebase ID token", "VALIDATION_ERROR");
  }

  const decodedToken = await verifyFirebaseToken(firebaseIdToken);

  const identities = decodedToken.firebase?.identities || {};
  const signInProvider = decodedToken.firebase?.sign_in_provider;
  const email = decodedToken.email;
  const emailVerified = decodedToken.email_verified;

  if (!email || !emailVerified) {
    throw new ApiError(401, "Google email not verified", "AUTH_FAILED");
  }

  if (signInProvider !== "google.com") {
    throw new ApiError(401, "Unsupported Firebase sign-in provider", "AUTH_FAILED");
  }

  const googleId = identities["google.com"]?.[0] || decodedToken.uid;
  const name =
    decodedToken.name ||
    (decodedToken.given_name ? `${decodedToken.given_name} ${decodedToken.family_name || ""}`.trim() : "Trader");
  const avatar = decodedToken.picture || null;

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      name,
      email,
      googleId,
      avatar,
      authProvider: "google",
      lastLogin: new Date(),
    });
  } else {
    const updates = {};
    if (!user.googleId) updates.googleId = googleId;
    if (!user.avatar && avatar) updates.avatar = avatar;
    if (user.authProvider !== "google" && user.authProvider !== "local") updates.authProvider = "local";

    if (Object.keys(updates).length > 0) {
      updates.lastLogin = new Date();
      await User.updateOne({ _id: user._id }, { $set: updates });
      user = await User.findById(user._id);
    } else {
      user.lastLogin = new Date();
      await user.save();
    }
  }

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    token: generateToken(user._id, user.role),
  });
});

exports.getMe = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Not authorized", "AUTH_FAILED");
  }

  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    createdAt: req.user.createdAt,
  });
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new ApiError(400, "Email is required", "VALIDATION_ERROR");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "User not found", "NOT_FOUND");
  }

  if (user.authProvider === "google") {
    throw new ApiError(400, "This account uses Google sign-in. Please use Google to login.", "AUTH_PROVIDER_MISMATCH");
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = Date.now() + 10 * 60 * 1000;

  user.resetPasswordOTP = otp;
  user.resetPasswordOTPExpires = otpExpires;
  await user.save();

  await sendOTPEmail(email, otp);
  res.json({ message: "OTP sent to your email" });
});

exports.verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    throw new ApiError(400, "Email and OTP are required", "VALIDATION_ERROR");
  }

  const user = await User.findOne({
    email,
    resetPasswordOTP: otp,
    resetPasswordOTPExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, "Invalid or expired OTP", "VALIDATION_ERROR");
  }

  res.json({ message: "OTP verified. You can now reset your password." });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, password } = req.body;
  if (!email || !otp || !password) {
    throw new ApiError(400, "All fields are required", "VALIDATION_ERROR");
  }

  const user = await User.findOne({
    email,
    resetPasswordOTP: otp,
    resetPasswordOTPExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, "Invalid or expired OTP", "VALIDATION_ERROR");
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(password, salt);
  user.resetPasswordOTP = undefined;
  user.resetPasswordOTPExpires = undefined;
  await user.save();

  res.json({ message: "Password reset successful. Please login with your new password." });
});
