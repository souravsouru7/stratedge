const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["payment", "feedback", "system"],
    required: true,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
}, { timestamps: true });

module.exports = mongoose.model("Notification", NotificationSchema);
