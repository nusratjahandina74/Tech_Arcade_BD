const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    title: { type: String, default: "Home" }, // e.g. "Home", "Office"
    addressLine: { type: String, required: true },
    city: { type: String, required: true },
    zone: { type: String },
  },
  { timestamps: true }
);

// We never store raw refresh tokens — only a SHA-256 hash of each one, so a
// leaked database dump can't be used to forge sessions. Each row is one
// active session (one per device/browser), which lets a user (or an admin)
// revoke a single device without logging everyone else out.
const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: false, unique: true, sparse: true, lowercase: true, trim: true, default: null },
    phone: { type: String, unique: true, sparse: true, trim: true, default: null },
    passwordHash: { type: String, required: false, default: null }, // null for phone-OTP-only accounts
    role: { type: String, enum: ["client", "admin", "manager", "delivery"], default: "client" },
    addresses: [addressSchema],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    isVerified: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false }, // soft delete — never hard-delete user data
    refreshTokens: [refreshTokenSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
