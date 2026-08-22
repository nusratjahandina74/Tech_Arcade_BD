const mongoose = require("mongoose");

const redemptionSchema = new mongoose.Schema(
  {
    // Logged-in orders are keyed by user id; guest orders by phone number,
    // so per-customer usage limits still apply without requiring an account.
    identifier: { type: String, required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
  },
  { timestamps: true }
);

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ["percentage", "fixed"], required: true },
    value: { type: Number, required: true, min: 0 }, // percent (0-100) or a flat BDT amount
    minOrderAmount: { type: Number, default: 0 },
    maxUsesTotal: { type: Number, default: null }, // null = unlimited
    maxUsesPerCustomer: { type: Number, default: 1 },
    expiresAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    redemptions: [redemptionSchema],
  },
  { timestamps: true }
);

couponSchema.methods.usedCount = function () {
  return this.redemptions.length;
};

couponSchema.methods.usedByCustomer = function (identifier) {
  return this.redemptions.filter((r) => r.identifier === identifier).length;
};

// Computes the discount for a given subtotal, or throws a plain-English reason
// why the coupon can't be applied. Kept as one shared function so the
// "preview" endpoint and the real order-creation endpoint can never disagree.
couponSchema.methods.computeDiscount = function (subtotal, identifier) {
  if (!this.isActive) throw new Error("This coupon is no longer active.");
  if (this.expiresAt && this.expiresAt < new Date()) throw new Error("This coupon has expired.");
  if (subtotal < this.minOrderAmount) {
    throw new Error(`Minimum order amount for this coupon is ৳${this.minOrderAmount}.`);
  }
  if (this.maxUsesTotal !== null && this.usedCount() >= this.maxUsesTotal) {
    throw new Error("This coupon has reached its usage limit.");
  }
  if (identifier && this.usedByCustomer(identifier) >= this.maxUsesPerCustomer) {
    throw new Error("You've already used this coupon the maximum number of times.");
  }

  const raw = this.type === "percentage" ? (subtotal * this.value) / 100 : this.value;
  return Math.min(Math.round(raw), subtotal); // never discount more than the subtotal itself
};

module.exports = mongoose.model("Coupon", couponSchema);
