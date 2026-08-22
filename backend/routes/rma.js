const express = require("express");
const RmaClaim = require("../models/RmaClaim");
const Order = require("../models/Order");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { validateBody } = require("../middleware/validate");
const { createRmaSchema, updateRmaSchema } = require("../schemas/reviewSchemas");
const { logAction } = require("../utils/audit");

const router = express.Router();

// POST /api/rma — logged-in customer files a return/warranty claim on their own delivered order
router.post("/", requireAuth(), validateBody(createRmaSchema), async (req, res) => {
  const { orderId, productId, type, reason, images, video } = req.body;

  const order = await Order.findOne({ _id: orderId, user: req.user.id });
  if (!order) return res.status(404).json({ message: "Order not found." });
  if (order.orderStatus !== "delivered") {
    return res.status(400).json({ message: "Claims can only be filed for delivered orders." });
  }

  const orderItem = order.items.find((i) => String(i.product) === String(productId));
  if (!orderItem) return res.status(400).json({ message: "That product wasn't part of this order." });

  const claim = await RmaClaim.create({
    order: order._id,
    orderNumber: order.orderNumber,
    user: req.user.id,
    product: productId,
    productName: orderItem.name,
    type,
    reason,
    images,
    video: video || null,
  });

  res.status(201).json(claim);
});

// GET /api/rma/mine — the logged-in customer's own claims
router.get("/mine", requireAuth(), async (req, res) => {
  const claims = await RmaClaim.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json({ claims });
});

// GET /api/rma — admin/manager, all claims
router.get("/", requireAdmin, async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};
  const claims = await RmaClaim.find(filter).sort({ createdAt: -1 });
  res.json({ claims });
});

// PUT /api/rma/:id/status — admin/manager, approve or reject a claim
router.put("/:id/status", requireAdmin, validateBody(updateRmaSchema), async (req, res) => {
  const { status, adminNote } = req.body;
  const claim = await RmaClaim.findByIdAndUpdate(req.params.id, { status, adminNote }, { new: true });
  if (!claim) return res.status(404).json({ message: "Claim not found." });

  await logAction(req, `rma.${status}`, {
    targetType: "RmaClaim",
    targetId: claim._id,
    meta: { orderNumber: claim.orderNumber, productName: claim.productName },
  });

  res.json(claim);
});

module.exports = router;
