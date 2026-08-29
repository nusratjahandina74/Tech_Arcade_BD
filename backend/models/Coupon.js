const mongoose = require("mongoose");

const redemptionSchema = new mongoose.Schema(
  {
    // Logged-in orders are keyed by user id; guest orders by phone number,
    // so per-customer usage limits still apply without requiring an account.
    identifier: { type: String, required: true, trim: true },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
  },
  { timestamps: true }
);

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },

    // percentage = 0-100
    // fixed = flat BDT amount
    value: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function (value) {
          if (this.type === "percentage") {
            return value <= 100;
          }
          return true;
        },
        message: "Percentage coupon value cannot exceed 100.",
      },
    },

    minOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    maxUsesTotal: {
      type: Number,
      default: null,
      min: 1,
      validate: {
        validator: (value) => value === null || Number.isInteger(value),
        message: "Maximum total uses must be a whole number or null.",
      },
    },

    maxUsesPerCustomer: {
      type: Number,
      default: 1,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Maximum uses per customer must be a whole number.",
      },
    },

    expiresAt: {
      type: Date,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    redemptions: [redemptionSchema],
  },
  { timestamps: true }
);

couponSchema.methods.usedCount = function () {
  return Array.isArray(this.redemptions)
    ? this.redemptions.length
    : 0;
};

couponSchema.methods.usedByCustomer = function (identifier) {
  if (!identifier) return 0;

  return this.redemptions.filter(
    (r) => String(r.identifier) === String(identifier)
  ).length;
};

// Computes the discount for a given subtotal, or throws a plain-English reason.
// Used by both coupon validation and order creation.
couponSchema.methods.computeDiscount = function (subtotal, identifier) {
  const cleanSubtotal = Number(subtotal);

  if (!Number.isFinite(cleanSubtotal) || cleanSubtotal < 0) {
    throw new Error("Invalid order amount.");
  }

  if (!this.isActive) {
    throw new Error("This coupon is no longer active.");
  }

  if (this.expiresAt && this.expiresAt <= new Date()) {
    throw new Error("This coupon has expired.");
  }

  if (cleanSubtotal < this.minOrderAmount) {
    throw new Error(
      `Minimum order amount for this coupon is ৳${this.minOrderAmount}.`
    );
  }

  if (
    this.maxUsesTotal !== null &&
    this.usedCount() >= this.maxUsesTotal
  ) {
    throw new Error("This coupon has reached its usage limit.");
  }

  if (
    identifier &&
    this.usedByCustomer(identifier) >= this.maxUsesPerCustomer
  ) {
    throw new Error(
      "You've already used this coupon the maximum number of times."
    );
  }

  let raw;

  if (this.type === "percentage") {
    raw = (cleanSubtotal * this.value) / 100;
  } else {
    raw = this.value;
  }

  // Never allow discount to exceed subtotal.
  return Math.min(Math.max(0, Math.round(raw)), cleanSubtotal);
};

module.exports = mongoose.model("Coupon", couponSchema);