const Feedback = require("../models/Feedback");
const Notification = require("../models/Notification");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

/**
 * @desc    Submit feedback/bug report
 * @route   POST /api/feedback
 * @access  Private
 */
exports.submitFeedback = asyncHandler(async (req, res) => {
  const { type, subject, message } = req.body;
  if (!type || !subject || !message) {
    throw new ApiError(400, "Please provide type, subject and message", "VALIDATION_ERROR");
  }

  const screenshotUrl = req.uploadedImage?.imageUrl || "";

    const feedback = await Feedback.create({
      user: req.user._id,
      type,
      subject,
      message,
      screenshot: screenshotUrl
    });

    // Create Admin Notification
    await Notification.create({
      title: `New ${type.toUpperCase()} Received`,
      message: `${req.user.name} submitted a ${type}: ${subject}`,
      type: "feedback",
      userId: req.user._id,
      metadata: { feedbackId: feedback._id, type, subject }
    });

  res.status(201).json({ message: "Feedback submitted successfully", feedback });
});

/**
 * @desc    Get all feedback (Admin)
 * @route   GET /api/admin/feedback
 * @access  Private/Admin
 */
exports.getAllFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.find()
    .populate("user", "name email")
    .sort({ createdAt: -1 });
  res.json(feedback);
});

/**
 * @desc    Update feedback status (Admin)
 * @route   PATCH /api/admin/feedback/:id
 * @access  Private/Admin
 */
exports.updateFeedbackStatus = asyncHandler(async (req, res) => {
  const { status, adminNotes } = req.body;
  const feedback = await Feedback.findById(req.params.id);

  if (!feedback) {
    throw new ApiError(404, "Feedback not found", "NOT_FOUND");
  }

    if (status) feedback.status = status;
    if (adminNotes !== undefined) feedback.adminNotes = adminNotes;

  await feedback.save();
  res.json({ message: "Feedback updated successfully", feedback });
});

/**
 * @desc    Delete feedback (Admin)
 * @route   DELETE /api/admin/feedback/:id
 * @access  Private/Admin
 */
exports.deleteFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findByIdAndDelete(req.params.id);
  if (!feedback) {
    throw new ApiError(404, "Feedback not found", "NOT_FOUND");
  }
  res.json({ message: "Feedback deleted successfully" });
});
