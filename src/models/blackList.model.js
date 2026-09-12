const mongoose = require("mongoose");

const tokenBlacklistModelSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: [true, "Token is required to blacklist"],
      unique: [true, "Token is already blacklisted"],
    },
    blacklistedAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  { timestamps: true },
);

tokenBlacklistModelSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 60 * 24 * 24 * 3, // 3 days
  },
);

const tokenBlackListModel = mongoose.model(
  "tokenBlacklist",
  tokenBlacklistModelSchema,
);

module.exports = tokenBlackListModel;
