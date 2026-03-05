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
    },

    // Indian Market Specific Fields
    segment: {
      type: String,
      enum: ["Equity", "F&O", "Commodity", "Currency", ""],
      default: ""
    },

    instrumentType: {
      type: String,
      enum: ["EQUITY", "FUTURE", "OPTION", ""],
      default: ""
    },

    strikePrice: Number,

    expiryDate: Date,

    quantity: Number,

    tradeType: {
      type: String,
      enum: ["INTRADAY", "DELIVERY", "SWING", ""],
      default: ""
    },

    brokerage: Number,
    sttTaxes: Number,

    entryBasis: {
      type: String,
      enum: ["Plan", "Emotion", "Impulsive", "Custom", ""],
      default: "Plan"
    },

    entryBasisCustom: {
      type: String,
      default: ""
    }

  },
  { timestamps: true }
);

module.exports = mongoose.model("Trade", tradeSchema);