const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 }, // guards against brute-forcing a 4-digit code
    consumed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Auto-clean expired OTPs after a day so this collection never grows forever
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

module.exports = mongoose.model("OtpCode", otpSchema);
