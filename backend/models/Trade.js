const mongoose = require("mongoose");

const tradeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    pair: {
      type: String,
      required: true
    },

    type: {
      type: String,
      enum: ["BUY", "SELL"],
      required: true
    },

    lotSize: Number,

    entryPrice: Number,

    exitPrice: Number,

    stopLoss: Number,

    takeProfit: Number,

    profit: Number,

    commission: Number,

    swap: Number,

    balance: Number,

    strategy: String,

    session: String,

    notes: String,

    riskRewardRatio: {
      type: String,
      enum: ["1:1", "1:2", "1:3", "1:4", "1:5", "custom", ""],
      default: ""
    },

    riskRewardCustom: {
      type: String,
      default: ""
    },

    screenshot: {
      type: String,
      default: ""
    },

    marketType: {
      type: String,
      enum: ["Forex", "Indian_Market"],
      default: "Forex"
    }

  },
  { timestamps: true }
);

module.exports = mongoose.model("Trade", tradeSchema);