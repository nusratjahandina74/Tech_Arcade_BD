const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, required: true, maxlength: 5000 },
    category: {
      type: String,
      required: true,
      enum: ["Mobile", "Laptop", "Accessories", "Audio", "Wearable", "Gaming", "Smart Home", "Other"],
    },
    brand: { type: String, trim: true, maxlength: 80 },
    price: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, min: 0, default: null },
    stock: { type: Number, required: true, min: 0, default: 0 },
    images: [{ type: String }], // image URLs
    specs: [{ key: String, value: String }], // e.g. { key: "RAM", value: "8GB" }
    warranty: { type: String, default: "No warranty" },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    // FOMO flash-sale countdown — dynamic, not hardcoded, so any product can
    // be put on a timed sale from the admin panel.
    flashSale: {
      active: { type: Boolean, default: false },
      endsAt: { type: Date, default: null },
    },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0 },
  },
  { timestamps: true }
);

productSchema.index({ name: "text", description: "text", brand: "text" });

module.exports = mongoose.model("Product", productSchema);
