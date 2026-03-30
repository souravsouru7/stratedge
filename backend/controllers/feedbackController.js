const Feedback = require("../models/Feedback");
const Notification = require("../models/Notification");
const cloudinary = require("../config/cloudinary");

/**
 * @desc    Submit feedback/bug report
 * @route   POST /api/feedback
 * @access  Private
 */
exports.submitFeedback = async (req, res) => {
  try {
    const { type, subject, message } = req.body;
    if (!type || !subject || !message) {
      return res.status(400).json({ message: "Please provide type, subject and message" });
    }

    let screenshotUrl = "";
    if (req.file) {
      const b64 = Buffer.from(req.file.buffer).toString("base64");
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: "feedback"
      });
      screenshotUrl = result.secure_url;
    }

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
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get all feedback (Admin)
 * @route   GET /api/admin/feedback
 * @access  Private/Admin
 */
exports.getAllFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });
    res.json(feedback);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Update feedback status (Admin)
 * @route   PATCH /api/admin/feedback/:id
 * @access  Private/Admin
 */
exports.updateFeedbackStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }

    if (status) feedback.status = status;
    if (adminNotes !== undefined) feedback.adminNotes = adminNotes;

    await feedback.save();
    res.json({ message: "Feedback updated successfully", feedback });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Delete feedback (Admin)
 * @route   DELETE /api/admin/feedback/:id
 * @access  Private/Admin
 */
exports.deleteFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);
    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }
    res.json({ message: "Feedback deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
