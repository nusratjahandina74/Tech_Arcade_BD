const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, maxlength: 2000 },
    images: [{ type: String }], // Cloudinary URLs — unboxing/defect photos
    video: { type: String, default: null }, // optional short Cloudinary video URL
    isVerifiedPurchase: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false }, // soft delete
  },
  { timestamps: true }
);

// One review per customer per product — stops review spam/duplicate submissions.
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("Review", reviewSchema);
