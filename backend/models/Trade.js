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

    // Per-trade setup checklist: rules and how many were followed
    setupRules: [
      {
        label: { type: String, trim: true },
        followed: { type: Boolean, default: false }
      }
    ],

    setupScore: {
      // 0–100 percentage of rules followed for this trade
      type: Number,
      default: null
    }

  },
  { timestamps: true }
);

module.exports = mongoose.model("Trade", tradeSchema);