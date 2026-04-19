const ApiError = require("../utils/ApiError");
const setupRepository = require("../repositories/setup.repository");
const cloudinary = require("../config/cloudinary");

async function getSetups(userId, marketType = "Forex") {
  return setupRepository.findSetupsByUserAndMarket(userId, marketType);
}

async function saveSetups(userId, marketType = "Forex", strategies) {
  if (!Array.isArray(strategies)) {
    throw new ApiError(400, "strategies must be an array", "VALIDATION_ERROR");
  }

  const existingStrategies = await setupRepository.findRawSetupsByUserAndMarket(userId, marketType);

  const docs = strategies
    .filter((strategy) => strategy && typeof strategy.name === "string" && strategy.name.trim().length > 0)
    .map((strategy) => ({
      user: userId,
      marketType,
      name: strategy.name.trim(),
      referenceImages: Array.isArray(strategy.referenceImages)
        ? strategy.referenceImages
            .filter((image) => image && (image.url || image.publicId))
            .map((image) => ({
              url: String(image.url || "").trim(),
              publicId: String(image.publicId || "").trim(),
            }))
            .filter((image) => image.url)
        : [],
      rules: Array.isArray(strategy.rules)
        ? strategy.rules
            .filter((rule) => rule && typeof rule.label === "string" && rule.label.trim().length > 0)
            .map((rule) => ({ label: rule.label.trim() }))
        : [],
    }));

  const nextPublicIds = new Set(
    docs.flatMap((doc) => doc.referenceImages.map((image) => image.publicId).filter(Boolean))
  );
  const stalePublicIds = existingStrategies
    .flatMap((strategy) => (Array.isArray(strategy.referenceImages) ? strategy.referenceImages : []))
    .map((image) => image.publicId)
    .filter((publicId) => publicId && !nextPublicIds.has(publicId));

  if (stalePublicIds.length > 0) {
    await Promise.allSettled(
      stalePublicIds.map((publicId) =>
        cloudinary.uploader.destroy(publicId, { resource_type: "image" })
      )
    );
  }

  return setupRepository.replaceSetupsByUserAndMarket(userId, marketType, docs);
}

module.exports = {
  getSetups,
  saveSetups,
};
