const mongoose = require("mongoose");

/**
 * Indian Market — Options only (NSE/BSE F&O).
 * CE/PE, underlying, strike, expiry, premium, lots. Fully separate from Forex.
 */
const indianTradeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // Display symbol e.g. "NIFTY 26000 CE" or "BANKNIFTY 47000 PE"
    pair: {
      type: String,
      required: true
    },

    // Underlying: NIFTY, BANKNIFTY, FINNIFTY, MIDCPNIFTY, or stock symbol
    underlying: {
      type: String,
      default: ""
    },

    type: {
      type: String,
      enum: ["BUY", "SELL"],
      required: true
    },

    // Option type: Call or Put
    optionType: {
      type: String,
      enum: ["CE", "PE"],
      default: "CE"
    },

    // Premium (entry/exit in ₹ per share or per unit)
    entryPrice: Number,
    exitPrice: Number,
    stopLoss: Number,
    takeProfit: Number,
    profit: Number,

    strategy: String,
    session: String,
    tradeDate: {
      type: Date,
      default: null
    },
    notes: String,

    riskRewardRatio: { type: String, enum: ["1:1", "1:2", "1:3", "1:4", "1:5", "custom", ""], default: "" },
    riskRewardCustom: { type: String, default: "" },
    screenshot: { type: String, default: "" },

    // Options: F&O / OPTION (allow "" for legacy docs)
    segment: { type: String, enum: ["F&O", ""], default: "F&O" },
    instrumentType: { type: String, enum: ["OPTION", ""], default: "OPTION" },

    strikePrice: Number,
    expiryDate: Date,
    quantity: Number, // number of lots
    lotSize: Number,  // e.g. 25 for NIFTY, 15 for BANKNIFTY

    tradeType: {
      type: String,
      enum: ["INTRADAY", "DELIVERY", "SWING", ""],
      default: "INTRADAY"
    },

    brokerage: Number,
    sttTaxes: Number,

    entryBasis: {
      type: String,
      enum: ["Plan", "Emotion", "Impulsive", "Custom", ""],
      default: "Plan"
    },
    entryBasisCustom: { type: String, default: "" },

    // Journal: setup/pattern, mistake tag, one-line lesson
    setup: { type: String, default: "" },
    mistakeTag: { type: String, default: "" },
    lesson: { type: String, default: "" },

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
    },

    // ── Psychology / Emotional Tracking ──
    mood: {
      // 1–5 scale (1 = stressed, 5 = peak focus)
      type: Number,
      min: 1,
      max: 5,
      default: null
    },

    confidence: {
      type: String,
      enum: ["Low", "Medium", "High", "Overconfident", ""],
      default: ""
    },

    emotionalTags: {
      type: [String],
      default: []
    },

    wouldRetake: {
      type: String,
      enum: ["Yes", "No", ""],
      default: ""
    }
  },
  { timestamps: true }
);

indianTradeSchema.index({ user: 1, createdAt: -1 });
indianTradeSchema.index({ user: 1, tradeDate: -1 });
indianTradeSchema.index({ user: 1, strategy: 1, createdAt: -1 });

module.exports = mongoose.model("IndianTrade", indianTradeSchema);
