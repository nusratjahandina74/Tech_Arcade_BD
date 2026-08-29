const express = require("express");
const mongoose = require("mongoose");
const RmaClaim = require("../models/RmaClaim");
const Order = require("../models/Order");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { validateBody } = require("../middleware/validate");
const {
  createRmaSchema,
  updateRmaSchema,
} = require("../schemas/reviewSchemas");
const { logAction } = require("../utils/audit");

const router = express.Router();

// POST /api/rma — logged-in customer files a return/warranty claim
// on their own delivered order.
router.post(
  "/",
  requireAuth(),
  validateBody(createRmaSchema),
  async (req, res, next) => {
    try {
      const {
        orderId,
        productId,
        type,
        reason,
        images,
        video,
      } = req.body;

      if (
        !mongoose.Types.ObjectId.isValid(orderId) ||
        !mongoose.Types.ObjectId.isValid(productId)
      ) {
        return res.status(400).json({
          message: "Invalid order or product ID.",
        });
      }

      const order = await Order.findOne({
        _id: orderId,
        user: req.user.id,
      });

      if (!order) {
        return res.status(404).json({
          message: "Order not found.",
        });
      }

      if (order.orderStatus !== "delivered") {
        return res.status(400).json({
          message:
            "Claims can only be filed for delivered orders.",
        });
      }

      const orderItem = order.items.find(
        (i) =>
          String(i.product) === String(productId)
      );

      if (!orderItem) {
        return res.status(400).json({
          message:
            "That product wasn't part of this order.",
        });
      }

      // Prevent the same customer from creating multiple
      // active claims for the same product/order.
      const existingClaim = await RmaClaim.findOne({
        order: order._id,
        user: req.user.id,
        product: productId,
        status: {
          $in: ["pending", "approved"],
        },
      });

      if (existingClaim) {
        return res.status(409).json({
          message:
            "A return or warranty claim already exists for this product in this order.",
        });
      }

      const claim = await RmaClaim.create({
        order: order._id,
        orderNumber: order.orderNumber,
        user: req.user.id,
        product: productId,
        productName: orderItem.name,
        type,
        reason,
        images: Array.isArray(images) ? images : [],
        video: video || null,
      });

      res.status(201).json(claim);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/rma/mine — logged-in customer's own claims.
router.get(
  "/mine",
  requireAuth(),
  async (req, res, next) => {
    try {
      const claims = await RmaClaim.find({
        user: req.user.id,
      }).sort({ createdAt: -1 });

      res.json({ claims });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/rma — admin/manager, all claims.
router.get(
  "/",
  requireAdmin,
  async (req, res, next) => {
    try {
      const { status } = req.query;

      const filter = status ? { status } : {};

      const claims = await RmaClaim.find(filter)
        .sort({ createdAt: -1 });

      res.json({ claims });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/rma/:id/status — admin/manager,
// approve or reject a claim.
router.put(
  "/:id/status",
  requireAdmin,
  validateBody(updateRmaSchema),
  async (req, res, next) => {
    try {
      const { status, adminNote } = req.body;

      if (
        !mongoose.Types.ObjectId.isValid(
          req.params.id
        )
      ) {
        return res.status(400).json({
          message: "Invalid claim ID.",
        });
      }

      const claim = await RmaClaim.findById(
        req.params.id
      );

      if (!claim) {
        return res.status(404).json({
          message: "Claim not found.",
        });
      }

      // Don't allow a claim to be changed after it has
      // already reached a final state.
      if (
        ["approved", "rejected"].includes(
          claim.status
        ) &&
        claim.status !== status
      ) {
        return res.status(400).json({
          message:
            "This claim has already been finalized and cannot be changed.",
        });
      }

      claim.status = status;

      if (typeof adminNote === "string") {
        claim.adminNote = adminNote.trim();
      }

      await claim.save();

      await logAction(
        req,
        `rma.${status}`,
        {
          targetType: "RmaClaim",
          targetId: claim._id,
          meta: {
            orderNumber: claim.orderNumber,
            productName: claim.productName,
          },
        }
      );

      res.json(claim);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;