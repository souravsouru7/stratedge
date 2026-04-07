const cloudinary = require("../config/cloudinary");
const ApiError = require("../utils/ApiError");
const { enqueueOcrJob, getOcrJobSnapshot } = require("../queues/ocrQueue");
const { clearUserCache } = require("../utils/cacheUtils");
const tradeRepository = require("../repositories/trade.repository");
const userRepository = require("../repositories/user.repository");
const { logger } = require("../utils/logger");

async function cleanupFailedUpload({ tradeId, uploadedImage, userId, error }) {
  if (!tradeId && uploadedImage?.publicId) {
    await cloudinary.uploader.destroy(uploadedImage.publicId, {
      resource_type: "image",
    }).catch((cleanupError) => {
      logger.warn("Failed to delete orphan Cloudinary upload", {
        publicId: uploadedImage.publicId,
        error: cleanupError.message,
      });
    });
  }

  if (tradeId) {
    await tradeRepository.updateTradeById(tradeId, {
      status: "failed",
      error: error.message,
      processedAt: new Date(),
    }).catch(() => {});
  }

  logger.error("Upload enqueue error", {
    userId,
    tradeId,
    error: error.message,
    stack: error.stack,
  });
}

async function submitTradeUpload({ user, body, query, uploadedImage, file }) {
  let tradeId = null;

  try {
    if (!user) {
      throw new ApiError(401, "Not authorized, user missing", "AUTH_FAILED");
    }

    const now = new Date();
    const isSubscribed =
      user.subscriptionStatus === "active" &&
      user.subscriptionExpiry &&
      new Date(user.subscriptionExpiry) > now;

    if (!isSubscribed && user.freeUploadUsed) {
      throw new ApiError(
        403,
        "Subscription required",
        "PAYMENT_REQUIRED",
        "You have used your free upload. Please subscribe for Rs 150 for 3 months to continue."
      );
    }

    if (!uploadedImage?.imageUrl) {
      throw new ApiError(400, "Image file is required.", "VALIDATION_ERROR");
    }

    const marketType = String(body.marketType || query.marketType || "Forex").trim();
    const brokerOverrideRaw = String(body.broker || query.broker || "").trim();
    const brokerOverride =
      brokerOverrideRaw && brokerOverrideRaw.toUpperCase() !== "AUTO"
        ? brokerOverrideRaw
        : null;

    console.log(
      "File received:",
      uploadedImage.originalName || file?.originalname,
      uploadedImage.mimeType || file?.mimetype,
      uploadedImage.bytes || file?.size,
      "| market:",
      marketType
    );

    const trade = await tradeRepository.createTrade({
      user: user._id,
      screenshot: uploadedImage.imageUrl,
      imageUrl: uploadedImage.imageUrl,
      marketType,
      broker: brokerOverride || "",
      status: "pending",
      queuedAt: new Date(),
      error: null,
    });

    tradeId = trade._id.toString();

    const job = await enqueueOcrJob({
      tradeId,
      imageUrl: uploadedImage.imageUrl,
      userId: user._id,
      marketType,
      broker: brokerOverride,
    });

    await tradeRepository.updateTradeById(tradeId, {
      ocrJobId: job.id,
      ocrJobName: job.name,
      status: "processing",
      processingStartedAt: new Date(),
      ocrAttempts: job.attemptsMade,
    });

    if (!isSubscribed) {
      await userRepository.markFreeUploadUsed(user._id);
    }

    await clearUserCache(user._id);

    return {
      success: true,
      jobId: tradeId,
      status: "processing",
    };
  } catch (error) {
    await cleanupFailedUpload({
      tradeId,
      uploadedImage,
      userId: user?._id?.toString(),
      error,
    });
    throw error;
  }
}

async function getUploadJobStatus(userId, tradeId) {
  const trade = await tradeRepository.findTradeByIdAndUser(tradeId, userId);
  if (!trade) {
    throw new ApiError(404, "Job not found or unauthorized", "NOT_FOUND");
  }

  const queueState = await getOcrJobSnapshot(trade.ocrJobId || trade._id.toString());

  return {
    jobId: trade.ocrJobId || trade._id.toString(),
    status: trade.status,
    queueState: queueState?.state || null,
    attemptsMade: queueState?.attemptsMade ?? trade.ocrAttempts ?? 0,
    error: trade.error || queueState?.failedReason || null,
    queuedAt: trade.queuedAt,
    processingStartedAt: trade.processingStartedAt,
    processedAt: trade.processedAt,
    data: trade.status === "completed" ? trade : null,
  };
}

module.exports = {
  getUploadJobStatus,
  submitTradeUpload,
};
