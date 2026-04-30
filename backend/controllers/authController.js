const crypto = require("crypto");
const User = require("../models/Users");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendOTPEmail } = require("../services/mailService");
const { appConfig } = require("../config");
const { getFirebaseAdmin } = require("../config/firebaseAdmin");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

// Bump this string whenever the Terms or Privacy Policy are updated.
// Any user whose stored termsVersion doesn't match will be forced to re-accept.
const CURRENT_TERMS_VERSION = "v1.0";

const generateToken = (id, role, tokenVersion = 0) =>
  jwt.sign({ id, role, tokenVersion }, appConfig.jwt.secret, {
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

async function verifyGoogleIdToken(googleIdToken) {
  let response;

  try {
    response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(googleIdToken)}`
    );
  } catch (error) {
    throw new ApiError(502, "Unable to reach Google token verification service", "GOOGLE_AUTH_UNAVAILABLE");
  }

  if (!response.ok) {
    throw new ApiError(401, "Google authentication failed", "AUTH_FAILED");
  }

  const payload = await response.json();
  const issuer = payload.iss;
  const emailVerified =
    payload.email_verified === true ||
    payload.email_verified === "true";

  if (!["accounts.google.com", "https://accounts.google.com"].includes(issuer)) {
    throw new ApiError(401, "Invalid Google token issuer", "AUTH_FAILED");
  }

  if (!payload.email || !emailVerified) {
    throw new ApiError(401, "Google email not verified", "AUTH_FAILED");
  }

  return {
    email: payload.email,
    email_verified: true,
    name: payload.name,
    given_name: payload.given_name,
    family_name: payload.family_name,
    picture: payload.picture,
    sub: payload.sub,
    provider: "google.com",
  };
}

exports.registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, acceptedTerms, acceptedPrivacy } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, "All fields are required (name, email, password)", "VALIDATION_ERROR");
  }

  if (!acceptedTerms || !acceptedPrivacy) {
    throw new ApiError(400, "You must accept the Terms & Privacy Policy to continue", "TERMS_NOT_ACCEPTED");
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
    termsAcceptance: {
      acceptedTerms: true,
      acceptedPrivacy: true,
      acceptedAt: new Date(),
      termsVersion: CURRENT_TERMS_VERSION,
    },
  });

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    token: generateToken(user._id, user.role, user.tokenVersion),
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

  const needsTerms = user.termsAcceptance?.termsVersion !== CURRENT_TERMS_VERSION;

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    token: generateToken(user._id, user.role, user.tokenVersion),
    requiresTermsAcceptance: needsTerms || undefined,
  });
});

exports.googleLogin = asyncHandler(async (req, res) => {
  const { idToken, credential } = req.body || {};
  const authToken = idToken || credential;

  if (!authToken) {
    throw new ApiError(400, "Missing Google or Firebase ID token", "VALIDATION_ERROR");
  }

  let decodedToken;
  let identities = {};
  let signInProvider;
  let email;
  let emailVerified;
  let googleId;

  try {
    decodedToken = await verifyFirebaseToken(authToken);
    identities = decodedToken.firebase?.identities || {};
    signInProvider = decodedToken.firebase?.sign_in_provider;
    email = decodedToken.email;
    emailVerified = decodedToken.email_verified;
    googleId = identities["google.com"]?.[0] || decodedToken.uid;
  } catch (firebaseError) {
    decodedToken = await verifyGoogleIdToken(authToken);
    signInProvider = decodedToken.provider;
    email = decodedToken.email;
    emailVerified = decodedToken.email_verified;
    googleId = decodedToken.sub;
  }

  if (!email || !emailVerified) {
    throw new ApiError(401, "Google email not verified", "AUTH_FAILED");
  }

  if (signInProvider !== "google.com") {
    throw new ApiError(401, "Unsupported Firebase sign-in provider", "AUTH_FAILED");
  }

  const name =
    decodedToken.name ||
    (decodedToken.given_name ? `${decodedToken.given_name} ${decodedToken.family_name || ""}`.trim() : "Trader");
  const avatar = decodedToken.picture || null;

  const now = new Date();
  const setPayload = {
    name,
    authProvider: "google",
    lastLogin: now,
    ...(googleId ? { googleId } : {}),
    ...(avatar ? { avatar } : {}),
  };

  let user;
  try {
    user = await User.findOneAndUpdate(
      { email },
      {
        $set: setPayload,
        $setOnInsert: {
          email,
          termsAcceptance: {
            acceptedTerms: false,
            acceptedPrivacy: false,
            acceptedAt: null,
            termsVersion: null,
          },
        },
      },
      { upsert: true, new: true, runValidators: true }
    );
  } catch (error) {
    if (error?.code !== 11000) {
      throw error;
    }
    user = await User.findOneAndUpdate(
      { email },
      { $set: setPayload },
      { new: true, runValidators: true }
    );
  }

  const needsTerms = user.termsAcceptance?.termsVersion !== CURRENT_TERMS_VERSION;

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    token: generateToken(user._id, user.role, user.tokenVersion),
    requiresTermsAcceptance: needsTerms || undefined,
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

exports.getMyPreferences = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Not authorized", "AUTH_FAILED");
  }

  res.json({
    hasSeenWelcomeGuide: Boolean(req.user.hasSeenWelcomeGuide),
  });
});

exports.updateMyPreferences = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Not authorized", "AUTH_FAILED");
  }

  const updates = {};

  if (Object.prototype.hasOwnProperty.call(req.body || {}, "hasSeenWelcomeGuide")) {
    updates.hasSeenWelcomeGuide = Boolean(req.body.hasSeenWelcomeGuide);
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "No valid preferences provided", "VALIDATION_ERROR");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  res.json({
    hasSeenWelcomeGuide: Boolean(user?.hasSeenWelcomeGuide),
  });
});

exports.acceptTerms = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Not authorized", "AUTH_FAILED");
  }

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        "termsAcceptance.acceptedTerms": true,
        "termsAcceptance.acceptedPrivacy": true,
        "termsAcceptance.acceptedAt": new Date(),
        "termsAcceptance.termsVersion": CURRENT_TERMS_VERSION,
      },
    },
    { runValidators: false }
  );

  res.json({ success: true, message: "Terms and Privacy Policy accepted." });
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new ApiError(400, "Email is required", "VALIDATION_ERROR");
  }

  const user = await User.findOne({ email });

  // Always return the same response regardless of whether the email exists
  // to prevent user enumeration attacks
  if (!user || user.authProvider === "google") {
    return res.json({ message: "If that email is registered, an OTP has been sent." });
  }

  const otp = String(crypto.randomInt(100000, 1000000));
  const otpExpires = Date.now() + 10 * 60 * 1000;

  user.resetPasswordOTP = otp;
  user.resetPasswordOTPExpires = otpExpires;
  user.otpAttempts = 0;
  user.otpLockUntil = undefined;
  await user.save();

  await sendOTPEmail(email, otp);
  res.json({ message: "If that email is registered, an OTP has been sent." });
});

const OTP_MAX_ATTEMPTS = 5;
const OTP_LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const OTP_DIGITS = 6;

function timingSafeOtpEquals(expectedOtp, providedOtp) {
  const expected = String(expectedOtp || "");
  const provided = String(providedOtp || "");
  if (expected.length !== OTP_DIGITS || provided.length !== OTP_DIGITS) {
    return false;
  }
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
}

exports.verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    throw new ApiError(400, "Email and OTP are required", "VALIDATION_ERROR");
  }

  const user = await User.findOne({ email });

  if (!user || user.authProvider === "google") {
    throw new ApiError(400, "Invalid or expired OTP", "VALIDATION_ERROR");
  }

  if (user.otpLockUntil && user.otpLockUntil > new Date()) {
    const retryAfterMin = Math.ceil((user.otpLockUntil - Date.now()) / 60000);
    throw new ApiError(429, `Too many failed attempts. Try again in ${retryAfterMin} minute(s).`, "OTP_LOCKED");
  }

  const isValid =
    timingSafeOtpEquals(user.resetPasswordOTP, otp) &&
    user.resetPasswordOTPExpires &&
    user.resetPasswordOTPExpires > new Date();

  if (!isValid) {
    user.otpAttempts = (user.otpAttempts || 0) + 1;
    if (user.otpAttempts >= OTP_MAX_ATTEMPTS) {
      user.otpLockUntil = new Date(Date.now() + OTP_LOCK_DURATION_MS);
      user.otpAttempts = 0;
    }
    await user.save();
    throw new ApiError(400, "Invalid or expired OTP", "VALIDATION_ERROR");
  }

  user.otpAttempts = 0;
  user.otpLockUntil = undefined;
  await user.save();

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
  user.otpAttempts = 0;
  user.otpLockUntil = undefined;
  user.tokenVersion = (user.tokenVersion || 0) + 1; // invalidates all existing sessions
  await user.save();

  res.json({ message: "Password reset successful. Please login with your new password." });
});
