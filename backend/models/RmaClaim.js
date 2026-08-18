const mongoose = require("mongoose");

const rmaSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    orderNumber: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    type: { type: String, enum: ["return", "warranty"], required: true },
    reason: { type: String, required: true, trim: true, maxlength: 1000 },
    images: [{ type: String }], // Cloudinary URLs of the defect/issue
    video: { type: String, default: null }, // optional short Cloudinary video URL
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    adminNote: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RmaClaim", rmaSchema);
