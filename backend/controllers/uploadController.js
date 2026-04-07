const asyncHandler = require("../utils/asyncHandler");
const uploadService = require("../services/upload.service");

exports.uploadImage = asyncHandler(async (req, res) => {
  console.time("uploadAPI");
  try {
    const result = await uploadService.submitTradeUpload({
      user: req.user,
      body: req.body,
      query: req.query,
      uploadedImage: req.uploadedImage,
      file: req.file,
    });

    res.status(202).json(result);
  } finally {
    console.timeEnd("uploadAPI");
  }
});

exports.getUploadJobStatus = asyncHandler(async (req, res) => {
  const jobStatus = await uploadService.getUploadJobStatus(req.user._id, req.params.id);
  res.json(jobStatus);
});
