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
    },

    type: {
      type: String,
      enum: ["BUY", "SELL"],
    },

    quantity: Number,

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

    tradeDate: {
      type: Date,
      default: null
    },

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

    imageUrl: {
      type: String,
      default: ""
    },

    marketType: {
      type: String,
      default: "Forex"
    },

    broker: {
      type: String,
      default: ""
    },

    segment: {
      type: String,
      default: ""
    },

    instrumentType: {
      type: String,
      default: ""
    },

    strikePrice: Number,

    expiryDate: {
      type: String,
      default: ""
    },

    extractedText: {
      type: String,
      default: ""
    },

    rawOCRText: {
      type: String,
      default: ""
    },

    aiRawResponse: {
      type: String,
      default: ""
    },

    parsedData: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },

    extractionConfidence: {
      type: Number,
      default: 0
    },

    isValid: {
      type: Boolean,
      default: true
    },

    needsReview: {
      type: Boolean,
      default: false
    },

    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending"
    },

    ocrJobId: {
      type: String,
      default: ""
    },

    ocrJobName: {
      type: String,
      default: "processTrade"
    },

    ocrAttempts: {
      type: Number,
      default: 0
    },

    queuedAt: {
      type: Date,
      default: null
    },

    processingStartedAt: {
      type: Date,
      default: null
    },

    error: {
      type: String,
      default: null
    },

    processedAt: {
      type: Date,
      default: null
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
    },

    // ── Psychology / Emotional Tracking ──
    entryBasis: {
      type: String,
      enum: ["Plan", "Emotion", "Impulsive", "Custom", ""],
      default: ""
    },

    entryBasisCustom: {
      type: String,
      default: ""
    },

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

    mistakeTag: {
      type: String,
      default: ""
    },

    lesson: {
      type: String,
      default: ""
    },

    wouldRetake: {
      type: String,
      enum: ["Yes", "No", ""],
      default: ""
    }

  },
  { timestamps: true }
);

tradeSchema.index({ user: 1 });
tradeSchema.index({ createdAt: -1 });
tradeSchema.index({ tradeDate: -1 });
tradeSchema.index({ strategy: 1 });
tradeSchema.index({ user: 1, createdAt: -1 });
tradeSchema.index({ user: 1, tradeDate: -1 });
tradeSchema.index({ user: 1, marketType: 1, createdAt: -1 });
tradeSchema.index({ user: 1, marketType: 1, tradeDate: -1 });
tradeSchema.index({ user: 1, status: 1, createdAt: -1 });
tradeSchema.index({ user: 1, marketType: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Trade", tradeSchema);
