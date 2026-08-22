const mongoose = require("mongoose");

const landingPageSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    headline: { type: String, required: true, trim: true, maxlength: 200 },
    subheadline: { type: String, trim: true, maxlength: 300, default: "" },
    heroImage: { type: String, default: "" },
    bullets: [{ type: String, trim: true, maxlength: 200 }], // key selling points
    // Campaign-specific pricing overrides the product's own price/discountPrice
    // when set — lets one product have several differently-priced funnels
    // (e.g. a bundle price for one Facebook ad, a solo price for another).
    price: { type: Number, default: null },
    originalPrice: { type: Number, default: null },
    testimonialName: { type: String, trim: true, default: "" },
    testimonialText: { type: String, trim: true, maxlength: 500, default: "" },
    ctaText: { type: String, trim: true, default: "অর্ডার করুন" },
    isActive: { type: Boolean, default: true },
    views: { type: Number, default: 0 },
    orders: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LandingPage", landingPageSchema);
