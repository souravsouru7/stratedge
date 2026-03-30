const { uploadBufferToCloudinary } = require("../config/cloudinary");
const Trade = require("../models/Trade");
const User = require("../models/Users");
const { ocrQueue } = require("../queues/ocrQueue");

exports.uploadImage = async (req, res) => {
  console.time("uploadAPI");
  try {
    const user = req.user; // From authMiddleware
    if (!user) {
      return res.status(401).json({ message: "Not authorized, user missing" });
    }

    // 1. Subscription Check
    const now = new Date();
    const isSubscribed = user.subscriptionStatus === "active" && user.subscriptionExpiry && new Date(user.subscriptionExpiry) > now;
    
    if (!isSubscribed) {
      if (user.freeUploadUsed) {
        return res.status(403).json({ 
          message: "Subscription required", 
          code: "PAYMENT_REQUIRED",
          details: "You have used your free upload. Please subscribe for ₹150 for 3 months to continue."
        });
      }
      // If they haven't used their free upload, we allow this one and mark it as used later on success
      console.log(`[Upload] User ${user.email} using free upload trial.`);
    }

    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    if (!["image/jpeg", "image/png", "image/jpg"].includes(file.mimetype)) {
      return res.status(400).json({ message: "Only JPG and PNG images are allowed" });
    }

    if (file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ message: "File size must be 5MB or less" });
    }

    const marketType = String(req.body.marketType || req.query.marketType || "Forex").trim();
    const brokerOverrideRaw = String(req.body.broker || req.query.broker || "").trim();
    const brokerOverride =
      brokerOverrideRaw && brokerOverrideRaw.toUpperCase() !== "AUTO"
        ? brokerOverrideRaw
        : null;
    console.log("File received:", file.originalname, file.mimetype, file.size, "| market:", marketType);
    if (brokerOverride) console.log("[Upload] broker override:", brokerOverride);

    const result = await uploadBufferToCloudinary(file.buffer, {
      folder: "trades",
      resource_type: "image",
      secure: true,
    });

    const imageUrl = result.secure_url;

    const trade = await Trade.create({
      user: user._id,
      screenshot: imageUrl,
      imageUrl,
      marketType,
      broker: brokerOverride || "",
      status: "pending",
      error: null,
    });

    await ocrQueue.add(
      "processTrade",
      {
        tradeId: trade._id.toString(),
        imagePath: imageUrl,
      },
      {
        jobId: trade._id.toString(),
      }
    );

    // If this was a free upload, mark it as used
    if (!isSubscribed) {
      await User.findByIdAndUpdate(user._id, { freeUploadUsed: true });
    }

    res.status(202).json({
      success: true,
      jobId: trade._id,
      status: "pending",
    });

  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: error.message });
  } finally {
    console.timeEnd("uploadAPI");
  }
};
