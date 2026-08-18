const express = require("express");
const Coupon = require("../models/Coupon");
const { requireAdmin, requireOwner, attachUserIfPresent } = require("../middleware/auth");
const { validateBody } = require("../middleware/validate");
const { createCouponSchema, validateCouponSchema } = require("../schemas/couponSchemas");
const { logAction } = require("../utils/audit");

const router = express.Router();

// GET /api/coupons — admin + manager can view the list
router.get("/", requireAdmin, async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.json({
    coupons: coupons.map((c) => ({
      _id: c._id,
      code: c.code,
      type: c.type,
      value: c.value,
      minOrderAmount: c.minOrderAmount,
      maxUsesTotal: c.maxUsesTotal,
      maxUsesPerCustomer: c.maxUsesPerCustomer,
      expiresAt: c.expiresAt,
      isActive: c.isActive,
      usedCount: c.usedCount(),
    })),
  });
});

// POST /api/coupons — owner only, create a new coupon
router.post("/", requireOwner, validateBody(createCouponSchema), async (req, res) => {
  const existing = await Coupon.findOne({ code: req.body.code.toUpperCase() });
  if (existing) return res.status(400).json({ message: "A coupon with this code already exists." });

  const coupon = await Coupon.create(req.body);
  await logAction(req, "coupon.create", { targetType: "Coupon", targetId: coupon._id, meta: { code: coupon.code } });
  res.status(201).json(coupon);
});

// PUT /api/coupons/:id — owner only, e.g. toggle active/inactive
router.put("/:id", requireOwner, async (req, res) => {
  const { isActive, expiresAt } = req.body;
  const update = {};
  if (isActive !== undefined) update.isActive = isActive;
  if (expiresAt !== undefined) update.expiresAt = expiresAt ? new Date(expiresAt) : null;

  const coupon = await Coupon.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!coupon) return res.status(404).json({ message: "Coupon not found." });

  await logAction(req, "coupon.update", { targetType: "Coupon", targetId: coupon._id, meta: update });
  res.json(coupon);
});

// DELETE /api/coupons/:id — owner only
router.delete("/:id", requireOwner, async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!coupon) return res.status(404).json({ message: "Coupon not found." });
  await logAction(req, "coupon.delete", { targetType: "Coupon", targetId: coupon._id, meta: { code: coupon.code } });
  res.json({ message: "Coupon deactivated." });
});

// POST /api/coupons/validate — public, lets the checkout page preview a discount
// before the order is actually placed. The real order-creation route re-validates
// this from scratch — this endpoint is a convenience, never a source of truth.
router.post("/validate", attachUserIfPresent, validateBody(validateCouponSchema), async (req, res) => {
  const { code, subtotal } = req.body;
  const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() });
  if (!coupon) return res.status(404).json({ message: "Invalid coupon code." });

  const identifier = req.user?.id || req.body.phone || null;
  try {
    const discountAmount = coupon.computeDiscount(subtotal, identifier);
    res.json({ valid: true, discountAmount, type: coupon.type, value: coupon.value });
  } catch (err) {
    res.status(400).json({ valid: false, message: err.message });
  }
});

module.exports = router;
