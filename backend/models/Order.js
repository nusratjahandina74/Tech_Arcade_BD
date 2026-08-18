const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true }, // null = guest checkout
    customer: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String },
      address: { type: String, required: true },
      city: { type: String, required: true },
    },
    items: [orderItemSchema],
    itemsTotal: { type: Number, required: true },
    deliveryFee: { type: Number, required: true, default: 0 },
    couponCode: { type: String, default: null },
    discountAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ["sslcommerz", "bkash_manual", "nagad_manual", "cod"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "cancelled", "refunded"],
      default: "pending",
    },
    sslTransactionId: { type: String, default: null },
    sslValidationId: { type: String, default: null },
    // For bkash_manual / nagad_manual — filled in by the customer at checkout,
    // verified manually by the shop owner in the admin panel.
    manualPayment: {
      senderNumber: { type: String, default: null },
      trxId: { type: String, default: null },
      verifiedAt: { type: Date, default: null },
      rejectionReason: { type: String, default: null },
    },
    orderStatus: {
      type: String,
      enum: ["placed", "confirmed", "processing", "shipped", "delivered", "cancelled"],
      default: "placed",
    },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

orderSchema.index({ "manualPayment.trxId": 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Order", orderSchema);
