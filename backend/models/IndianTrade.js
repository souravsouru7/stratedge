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
    entryBasisCustom: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("IndianTrade", indianTradeSchema);
