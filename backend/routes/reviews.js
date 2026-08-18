const express = require("express");
const Review = require("../models/Review");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { requireAuth } = require("../middleware/auth");
const { validateBody } = require("../middleware/validate");
const { createReviewSchema } = require("../schemas/reviewSchemas");

const router = express.Router({ mergeParams: true }); // mounted at /api/products/:productId/reviews

async function recalculateRating(productId) {
  const stats = await Review.aggregate([
    { $match: { product: productId, isDeleted: false } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const { avg = 0, count = 0 } = stats[0] || {};
  await Product.findByIdAndUpdate(productId, { rating: Math.round(avg * 10) / 10, numReviews: count });
}

// GET /api/products/:productId/reviews — public, with optional rating/photo filters
router.get("/", async (req, res) => {
  const { rating, hasPhotos, sort = "recent" } = req.query;
  const filter = { product: req.params.productId, isDeleted: false };
  if (rating) filter.rating = Number(rating);
  if (hasPhotos === "true") filter.images = { $exists: true, $ne: [] };

  const sortMap = { recent: { createdAt: -1 }, highest: { rating: -1 }, lowest: { rating: 1 } };
  const reviews = await Review.find(filter).sort(sortMap[sort] || sortMap.recent).limit(100);
  res.json({ reviews });
});

// POST /api/products/:productId/reviews — logged-in customers only, one per product
router.post("/", requireAuth(), validateBody(createReviewSchema), async (req, res) => {
  const { productId } = req.params;
  const { rating, comment, images, video, orderId } = req.body;

  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ message: "Product not found." });

  const existing = await Review.findOne({ product: productId, user: req.user.id });
  if (existing) return res.status(400).json({ message: "You've already reviewed this product." });

  // A review only earns the "Verified Buyer" badge if it's tied to one of the
  // customer's own paid orders that actually contained this product.
  const orderQuery = { user: req.user.id, "items.product": productId, paymentStatus: "paid" };
  if (orderId) orderQuery._id = orderId;
  const linkedOrder = await Order.findOne(orderQuery);

  const review = await Review.create({
    product: productId,
    user: req.user.id,
    userName: req.user.name,
    order: linkedOrder?._id || null,
    rating,
    comment,
    images,
    video: video || null,
    isVerifiedPurchase: Boolean(linkedOrder),
  });

  await recalculateRating(productId);
  res.status(201).json(review);
});

module.exports = router;
