const mongoose = require("mongoose");

const setupStrategySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    marketType: {
      type: String,
      enum: ["Forex", "Indian_Market"],
      default: "Forex",
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    rules: [
      {
        label: {
          type: String,
          trim: true,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("SetupStrategy", setupStrategySchema);

