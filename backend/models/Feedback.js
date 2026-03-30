const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    type: {
      type: String,
      enum: ["BUG", "FEATURE_REQUEST", "GENERAL_FEEDBACK"],
      required: true
    },
    subject: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "RESOLVED"],
      default: "PENDING"
    },
    adminNotes: {
      type: String,
      default: ""
    },
    screenshot: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Feedback", feedbackSchema);
