const express = require("express");
const { v4: uuidv4 } = require("uuid");

const Product = require("../models/Product");
const Order = require("../models/Order");
const Settings = require("../models/Settings");
const Coupon = require("../models/Coupon");
const LandingPage = require("../models/LandingPage");

const {
  requireAdmin,
  requireAuth,
  requireDelivery,
  attachUserIfPresent,
} = require("../middleware/auth");

const { validateBody } = require("../middleware/validate");
const { createOrderSchema } = require("../schemas/orderSchemas");
const { initPayment } = require("../utils/sslcommerz");
const { logAction } = require("../utils/audit");
const { releaseCouponRedemption } = require("../utils/coupon");

const router = express.Router();


// ============================================================
// POST /api/orders
// Public — place a new order
// ============================================================

router.post(
  "/",
  attachUserIfPresent,
  validateBody(createOrderSchema),
  async (req, res) => {
    const {
      items,
      customer,
      paymentMethod,
      manualPayment,
      couponCode,
      landingPageSlug,
    } = req.body;

    try {
      // --------------------------------------------------------
      // Validate manual payment
      // --------------------------------------------------------

      if (
        ["bkash_manual", "nagad_manual"].includes(paymentMethod)
      ) {
        const trxId = manualPayment?.trxId?.trim();
        const senderNumber = manualPayment?.senderNumber?.trim();

        if (!trxId || !senderNumber) {
          return res.status(400).json({
            message:
              "Transaction ID and sender number are required.",
          });
        }

        // Prevent Transaction ID reuse
        const duplicate = await Order.findOne({
          "manualPayment.trxId": trxId,
        });

        if (duplicate) {
          return res.status(400).json({
            message:
              "This Transaction ID has already been used on another order.",
          });
        }
      }

      // --------------------------------------------------------
      // Verify products and prices from DB
      // --------------------------------------------------------

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          message: "Your cart is empty.",
        });
      }

      let itemsTotal = 0;
      const verifiedItems = [];

      for (const line of items) {
        const product = await Product.findById(line.productId);

        if (!product || !product.isActive) {
          return res.status(400).json({
            message:
              "A product in your cart is no longer available.",
          });
        }

        const qty = Math.max(
          1,
          Number(line.quantity) || 1
        );

        if (product.stock < qty) {
          return res.status(400).json({
            message: `${product.name} only has ${product.stock} left in stock.`,
          });
        }

        const price =
          product.discountPrice ?? product.price;

        itemsTotal += price * qty;

        verifiedItems.push({
          product: product._id,
          name: product.name,
          price,
          quantity: qty,
        });
      }

      // --------------------------------------------------------
      // Settings
      // --------------------------------------------------------

      const settings =
        (await Settings.findOne({ key: "main" })) ||
        (await Settings.create({ key: "main" }));

      // --------------------------------------------------------
      // Validate payment method
      // --------------------------------------------------------

      if (
        paymentMethod === "cod" &&
        settings.codEnabled !== true
      ) {
        return res.status(400).json({
          message:
            "Cash on Delivery is currently unavailable.",
        });
      }

      if (
        paymentMethod === "bkash_manual" &&
        !settings.bkashNumber
      ) {
        return res.status(400).json({
          message:
            "bKash payment is currently unavailable.",
        });
      }

      if (
        paymentMethod === "nagad_manual" &&
        !settings.nagadNumber
      ) {
        return res.status(400).json({
          message:
            "Nagad payment is currently unavailable.",
        });
      }

      // --------------------------------------------------------
      // Delivery fee
      // --------------------------------------------------------

      const deliveryFee = /dhaka/i.test(customer.city)
        ? Number(settings.insideDhakaFee || 0)
        : Number(settings.outsideDhakaFee || 0);

      // --------------------------------------------------------
      // Coupon validation
      // --------------------------------------------------------

      let discountAmount = 0;
      let coupon = null;
      let couponIdentifier = null;

      if (couponCode?.trim()) {
        coupon = await Coupon.findOne({
          code: couponCode.trim().toUpperCase(),
        });

        if (!coupon) {
          return res.status(400).json({
            message: "Invalid coupon code.",
          });
        }

        couponIdentifier =
          req.user?.id || customer.phone?.trim();

        try {
          discountAmount = coupon.computeDiscount(
            itemsTotal,
            couponIdentifier
          );
        } catch (err) {
          return res.status(400).json({
            message: err.message,
          });
        }
      }

      // --------------------------------------------------------
      // Grand total
      // --------------------------------------------------------

      const grandTotal = Math.max(
        0,
        itemsTotal + deliveryFee - discountAmount
      );

      // --------------------------------------------------------
      // Create order
      // --------------------------------------------------------

      const orderNumber = `TA-${Date.now()}-${uuidv4()
        .slice(0, 6)
        .toUpperCase()}`;

      const order = await Order.create({
        orderNumber,
        user: req.user?.id || null,
        customer,
        items: verifiedItems,
        itemsTotal,
        deliveryFee,
        couponCode: coupon ? coupon.code : null,
        discountAmount,
        grandTotal,
        paymentMethod,
        paymentStatus: "pending",

        manualPayment:
          paymentMethod === "bkash_manual" ||
          paymentMethod === "nagad_manual"
            ? {
                senderNumber:
                  manualPayment.senderNumber.trim(),
                trxId: manualPayment.trxId.trim(),
              }
            : undefined,
      });

      // --------------------------------------------------------
      // Reserve stock atomically
      // --------------------------------------------------------

      const reservedItems = [];

      for (const item of verifiedItems) {
        const updatedProduct =
          await Product.findOneAndUpdate(
            {
              _id: item.product,
              isActive: true,
              stock: {
                $gte: item.quantity,
              },
            },
            {
              $inc: {
                stock: -item.quantity,
              },
            },
            {
              new: true,
            }
          );

        if (!updatedProduct) {
          // Roll back previously reserved stock
          for (const reservedItem of reservedItems) {
            await Product.findByIdAndUpdate(
              reservedItem.product,
              {
                $inc: {
                  stock: reservedItem.quantity,
                },
              }
            );
          }

          await Order.findByIdAndDelete(order._id);

          return res.status(400).json({
            message:
              `${item.name} is no longer available in the requested quantity.`,
          });
        }

        reservedItems.push(item);
      }

      // --------------------------------------------------------
      // Landing page attribution
      // --------------------------------------------------------

      if (landingPageSlug) {
        LandingPage.updateOne(
          { slug: landingPageSlug },
          {
            $inc: {
              orders: 1,
            },
          }
        ).catch(() => {});
      }

      // --------------------------------------------------------
      // Record coupon redemption
      // --------------------------------------------------------

      if (coupon) {
        try {
          coupon.redemptions.push({
            identifier: couponIdentifier,
            order: order._id,
          });

          await coupon.save();
        } catch (err) {
          // Roll back stock
          for (const item of reservedItems) {
            await Product.findByIdAndUpdate(
              item.product,
              {
                $inc: {
                  stock: item.quantity,
                },
              }
            );
          }

          await Order.findByIdAndDelete(order._id);

          return res.status(400).json({
            message:
              "Unable to apply coupon. Please try again.",
          });
        }
      }

      // --------------------------------------------------------
      // COD / Manual payment
      // --------------------------------------------------------

      if (
        paymentMethod === "cod" ||
        paymentMethod === "bkash_manual" ||
        paymentMethod === "nagad_manual"
      ) {
        return res.status(201).json({
          order,
          redirectUrl: null,
        });
      }

      // --------------------------------------------------------
      // SSLCommerz
      // --------------------------------------------------------

      try {
        const payment = await initPayment({
          order,
          customer,
        });

        if (payment?.GatewayPageURL) {
          return res.status(201).json({
            order,
            redirectUrl: payment.GatewayPageURL,
          });
        }

        // Payment initialization failed
        for (const item of reservedItems) {
          await Product.findByIdAndUpdate(
            item.product,
            {
              $inc: {
                stock: item.quantity,
              },
            }
          );
        }

        if (coupon) {
          await releaseCouponRedemption(order);
        }

        await Order.findByIdAndDelete(order._id);

        return res.status(502).json({
          message:
            "Could not start payment. Please try again.",
        });
      } catch (err) {
        console.error(
          "SSLCommerz init error:",
          err.message
        );

        // Release stock
        for (const item of reservedItems) {
          await Product.findByIdAndUpdate(
            item.product,
            {
              $inc: {
                stock: item.quantity,
              },
            }
          );
        }

        if (coupon) {
          await releaseCouponRedemption(order);
        }

        await Order.findByIdAndDelete(order._id);

        return res.status(502).json({
          message:
            "Payment gateway is unavailable right now.",
        });
      }
    } catch (err) {
      console.error("Create order error:", err);

      return res.status(500).json({
        message:
          "Could not create order. Please try again.",
      });
    }
  }
);


// ============================================================
// GET /api/orders/recent-public
// ============================================================

router.get("/recent-public", async (req, res) => {
  try {
    const orders = await Order.find({
      paymentStatus: "paid",
    })
      .sort({ createdAt: -1 })
      .limit(15)
      .select(
        "customer.name customer.city items createdAt"
      );

    const feed = orders
      .filter(
        (o) =>
          Array.isArray(o.items) &&
          o.items.length > 0
      )
      .map((o) => ({
        firstName:
          (o.customer?.name || "Someone")
            .trim()
            .split(" ")[0],

        city: o.customer?.city || "",

        productName: o.items[0].name,

        createdAt: o.createdAt,
      }));

    res.json({ feed });
  } catch (err) {
    console.error(
      "Recent public orders error:",
      err
    );

    res.status(500).json({
      message: "Could not load recent orders.",
    });
  }
});


// ============================================================
// GET /api/orders/for-delivery
// ============================================================

router.get(
  "/for-delivery",
  requireDelivery,
  async (req, res) => {
    try {
      const orders = await Order.find({
        orderStatus: "shipped",
      }).sort({ updatedAt: 1 });

      res.json({ orders });
    } catch (err) {
      console.error(
        "Delivery orders error:",
        err
      );

      res.status(500).json({
        message: "Could not load delivery orders.",
      });
    }
  }
);


// ============================================================
// PUT /api/orders/:id/mark-delivered
// ============================================================

router.put(
  "/:id/mark-delivered",
  requireDelivery,
  async (req, res) => {
    try {
      const order = await Order.findById(
        req.params.id
      );

      if (!order) {
        return res.status(404).json({
          message: "Order not found.",
        });
      }

      if (order.orderStatus !== "shipped") {
        return res.status(400).json({
          message:
            "Only shipped orders can be marked delivered.",
        });
      }

      order.orderStatus = "delivered";

      await order.save();

      await logAction(
        req,
        "order.status.update",
        {
          targetType: "Order",
          targetId: order._id,
          meta: {
            orderNumber: order.orderNumber,
            orderStatus: "delivered",
          },
        }
      );

      res.json(order);
    } catch (err) {
      console.error(
        "Mark delivered error:",
        err
      );

      res.status(500).json({
        message:
          "Could not mark order as delivered.",
      });
    }
  }
);


// ============================================================
// GET /api/orders/stats
// ============================================================

router.get(
  "/stats",
  requireAdmin,
  async (req, res) => {
    try {
      const fourteenDaysAgo = new Date();

      fourteenDaysAgo.setDate(
        fourteenDaysAgo.getDate() - 13
      );

      fourteenDaysAgo.setHours(0, 0, 0, 0);

      const [
        totals,
        byStatus,
        byDay,
        pendingPayments,
        recentOrders,
      ] = await Promise.all([
        Order.aggregate([
          {
            $match: {
              paymentStatus: "paid",
            },
          },
          {
            $group: {
              _id: null,
              revenue: {
                $sum: "$grandTotal",
              },
              count: {
                $sum: 1,
              },
            },
          },
        ]),

        Order.aggregate([
          {
            $group: {
              _id: "$orderStatus",
              count: {
                $sum: 1,
              },
            },
          },
        ]),

        Order.aggregate([
          {
            $match: {
              paymentStatus: "paid",
              createdAt: {
                $gte: fourteenDaysAgo,
              },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$createdAt",
                },
              },
              revenue: {
                $sum: "$grandTotal",
              },
              orders: {
                $sum: 1,
              },
            },
          },
          {
            $sort: {
              _id: 1,
            },
          },
        ]),

        Order.countDocuments({
          paymentStatus: "pending",
          paymentMethod: {
            $in: [
              "bkash_manual",
              "nagad_manual",
            ],
          },
        }),

        Order.find()
          .sort({
            createdAt: -1,
          })
          .limit(6),
      ]);

      const lowStock = await Product.find({
        isActive: true,
        stock: {
          $lte: 5,
        },
      })
        .sort({
          stock: 1,
        })
        .limit(6)
        .select("name stock");

      const totalOrders =
        await Order.countDocuments();

      res.json({
        totalRevenue:
          totals[0]?.revenue || 0,

        paidOrders:
          totals[0]?.count || 0,

        totalOrders,

        pendingPayments,

        ordersByStatus:
          byStatus.map((s) => ({
            status: s._id,
            count: s.count,
          })),

        revenueByDay:
          byDay.map((d) => ({
            date: d._id,
            revenue: d.revenue,
            orders: d.orders,
          })),

        lowStock,

        recentOrders,
      });
    } catch (err) {
      console.error(
        "Order stats error:",
        err
      );

      res.status(500).json({
        message:
          "Could not load order statistics.",
      });
    }
  }
);


// ============================================================
// GET /api/orders — admin
// ============================================================

router.get(
  "/",
  requireAdmin,
  async (req, res) => {
    try {
      const {
        status,
        page = 1,
        limit = 20,
      } = req.query;

      const filter = {};

      if (status) {
        filter.orderStatus = status;
      }

      const pageNum = Math.max(
        1,
        Number(page) || 1
      );

      const limitNum = Math.min(
        100,
        Math.max(
          1,
          Number(limit) || 20
        )
      );

      const [orders, total] =
        await Promise.all([
          Order.find(filter)
            .sort({
              createdAt: -1,
            })
            .skip(
              (pageNum - 1) *
                limitNum
            )
            .limit(limitNum),

          Order.countDocuments(filter),
        ]);

      res.json({
        orders,
        total,
        page: pageNum,
        pages: Math.ceil(
          total / limitNum
        ),
      });
    } catch (err) {
      console.error(
        "Admin orders error:",
        err
      );

      res.status(500).json({
        message:
          "Could not load orders.",
      });
    }
  }
);


// ============================================================
// PUT /api/orders/:id/payment-status
// ============================================================

router.put(
  "/:id/payment-status",
  requireAdmin,
  async (req, res) => {
    const {
      paymentStatus,
      rejectionReason,
    } = req.body;

    try {
      if (
        !["paid", "failed"].includes(
          paymentStatus
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid payment status.",
        });
      }

      const order =
        await Order.findById(
          req.params.id
        );

      if (!order) {
        return res.status(404).json({
          message:
            "Order not found.",
        });
      }

      // Already in requested state
      if (
        order.paymentStatus ===
        paymentStatus
      ) {
        return res.json(order);
      }

      // Only pending manual payments
      if (
        order.paymentStatus !==
        "pending"
      ) {
        return res.status(400).json({
          message:
            "Only pending payments can be updated.",
        });
      }

      if (
        ![
          "bkash_manual",
          "nagad_manual",
        ].includes(
          order.paymentMethod
        )
      ) {
        return res.status(400).json({
          message:
            "Only manual bKash/Nagad payments can be updated here.",
        });
      }

      // ------------------------------------------------------
      // Approve
      // ------------------------------------------------------

      if (
        paymentStatus === "paid"
      ) {
        order.paymentStatus = "paid";

        if (!order.manualPayment) {
          order.manualPayment = {};
        }

        order.manualPayment.verifiedAt =
          new Date();

        order.manualPayment.rejectionReason =
          null;

        if (
          order.orderStatus ===
          "placed"
        ) {
          order.orderStatus =
            "confirmed";
        }
      }

      // ------------------------------------------------------
      // Reject
      // ------------------------------------------------------

      if (
        paymentStatus === "failed"
      ) {
        order.paymentStatus =
          "failed";

        if (!order.manualPayment) {
          order.manualPayment = {};
        }

        order.manualPayment.rejectionReason =
          rejectionReason ||
          "TrxID could not be verified";

        // Release reserved stock
        for (const item of order.items) {
          await Product.findByIdAndUpdate(
            item.product,
            {
              $inc: {
                stock: item.quantity,
              },
            }
          );
        }

        // Release coupon redemption
        await releaseCouponRedemption(
          order
        );
      }

      await order.save();

      await logAction(
        req,
        paymentStatus === "paid"
          ? "order.payment.approve"
          : "order.payment.reject",
        {
          targetType: "Order",
          targetId: order._id,
          meta: {
            orderNumber:
              order.orderNumber,

            rejectionReason:
              order.manualPayment
                ?.rejectionReason,
          },
        }
      );

      res.json(order);
    } catch (err) {
      console.error(
        "Payment status update error:",
        err
      );

      res.status(500).json({
        message:
          "Could not update payment status.",
      });
    }
  }
);


// ============================================================
// PUT /api/orders/:id/resubmit-payment
// ============================================================

router.put(
  "/:id/resubmit-payment",
  requireAuth(),
  async (req, res) => {
    const {
      trxId,
      senderNumber,
    } = req.body;

    try {
      if (
        !trxId?.trim() ||
        !senderNumber?.trim()
      ) {
        return res.status(400).json({
          message:
            "Please enter the Transaction ID and sender number.",
        });
      }

      const cleanTrxId =
        trxId.trim();

      const cleanSenderNumber =
        senderNumber.trim();

      const order =
        await Order.findById(
          req.params.id
        );

      if (!order) {
        return res.status(404).json({
          message:
            "Order not found.",
        });
      }

      if (
        !order.user ||
        String(order.user) !==
          String(req.user.id)
      ) {
        return res.status(403).json({
          message:
            "This isn't your order.",
        });
      }

      if (
        order.paymentStatus !==
        "failed"
      ) {
        return res.status(400).json({
          message:
            "Only a rejected payment can be resubmitted.",
        });
      }

      if (
        ![
          "bkash_manual",
          "nagad_manual",
        ].includes(
          order.paymentMethod
        )
      ) {
        return res.status(400).json({
          message:
            "Only manual bKash/Nagad payments can be resubmitted.",
        });
      }

      // ------------------------------------------------------
      // Duplicate TrxID check
      // ------------------------------------------------------

      const duplicate =
        await Order.findOne({
          "manualPayment.trxId":
            cleanTrxId,

          _id: {
            $ne: order._id,
          },
        });

      if (duplicate) {
        return res.status(400).json({
          message:
            "This Transaction ID has already been used on another order.",
        });
      }

      // ------------------------------------------------------
      // Check stock first
      // ------------------------------------------------------

      for (const item of order.items) {
        const product =
          await Product.findOne({
            _id: item.product,
            isActive: true,
            stock: {
              $gte: item.quantity,
            },
          });

        if (!product) {
          return res.status(400).json({
            message:
              `${item.name} is no longer available in that quantity.`,
          });
        }
      }

      // ------------------------------------------------------
      // Reserve stock
      // ------------------------------------------------------

      const reservedItems = [];

      for (const item of order.items) {
        const updatedProduct =
          await Product.findOneAndUpdate(
            {
              _id: item.product,
              isActive: true,
              stock: {
                $gte: item.quantity,
              },
            },
            {
              $inc: {
                stock:
                  -item.quantity,
              },
            },
            {
              new: true,
            }
          );

        if (!updatedProduct) {
          // Roll back everything already reserved
          for (const reservedItem of reservedItems) {
            await Product.findByIdAndUpdate(
              reservedItem.product,
              {
                $inc: {
                  stock:
                    reservedItem.quantity,
                },
              }
            );
          }

          return res.status(400).json({
            message:
              `${item.name} is no longer available in that quantity.`,
          });
        }

        reservedItems.push(item);
      }

      // ------------------------------------------------------
      // Re-check coupon
      // ------------------------------------------------------

      let couponRedemptionAdded =
        false;

      if (order.couponCode) {
        const coupon =
          await Coupon.findOne({
            code: order.couponCode
              .trim()
              .toUpperCase(),
          });

        if (!coupon) {
          // IMPORTANT:
          // Coupon no longer exists, so release reserved stock.
          for (const item of reservedItems) {
            await Product.findByIdAndUpdate(
              item.product,
              {
                $inc: {
                  stock:
                    item.quantity,
                },
              }
            );
          }

          return res.status(400).json({
            message:
              "The coupon used on this order is no longer available. Please contact support.",
          });
        }

        try {
          const identifier =
            req.user.id;

          const newDiscount =
            coupon.computeDiscount(
              order.itemsTotal,
              identifier
            );

          // Keep coupon discount consistent
          order.discountAmount =
            newDiscount;

          order.grandTotal =
            Math.max(
              0,
              order.itemsTotal +
                order.deliveryFee -
                newDiscount
            );

          coupon.redemptions.push({
            identifier,
            order: order._id,
          });

          await coupon.save();

          couponRedemptionAdded =
            true;
        } catch (err) {
          // IMPORTANT:
          // Coupon validation failed after stock reservation.
          // Release the reserved stock.
          for (const item of reservedItems) {
            await Product.findByIdAndUpdate(
              item.product,
              {
                $inc: {
                  stock:
                    item.quantity,
                },
              }
            );
          }

          return res.status(400).json({
            message: err.message,
          });
        }
      }

      // ------------------------------------------------------
      // Update payment information
      // ------------------------------------------------------

      if (!order.manualPayment) {
        order.manualPayment = {};
      }

      order.manualPayment.trxId =
        cleanTrxId;

      order.manualPayment.senderNumber =
        cleanSenderNumber;

      order.manualPayment.rejectionReason =
        null;

      order.manualPayment.verifiedAt =
        null;

      order.paymentStatus =
        "pending";

      await order.save();

      await logAction(
        req,
        "order.payment.resubmit",
        {
          targetType: "Order",
          targetId: order._id,
          meta: {
            orderNumber:
              order.orderNumber,
          },
        }
      );

      res.json(order);
    } catch (err) {
      console.error(
        "Payment resubmit error:",
        err
      );

      res.status(500).json({
        message:
          "Could not resubmit payment. Please try again.",
      });
    }
  }
);


// ============================================================
// GET /api/orders/mine
// ============================================================

router.get(
  "/mine",
  requireAuth(),
  async (req, res) => {
    try {
      const orders =
        await Order.find({
          user: req.user.id,
        }).sort({
          createdAt: -1,
        });

      res.json({ orders });
    } catch (err) {
      console.error(
        "My orders error:",
        err
      );

      res.status(500).json({
        message:
          "Could not load your orders.",
      });
    }
  }
);


// ============================================================
// PUT /api/orders/:id/status
// Admin only
// ============================================================

router.put(
  "/:id/status",
  requireAdmin,
  async (req, res) => {
    const { orderStatus } =
      req.body;

    try {
      const allowed = [
        "placed",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ];

      if (
        !allowed.includes(
          orderStatus
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid status.",
        });
      }

      const order =
        await Order.findById(
          req.params.id
        );

      if (!order) {
        return res.status(404).json({
          message:
            "Order not found.",
        });
      }

      // Prevent invalid status jumps
      const validTransitions = {
        placed: [
          "confirmed",
          "cancelled",
        ],

        confirmed: [
          "processing",
          "cancelled",
        ],

        processing: [
          "shipped",
          "cancelled",
        ],

        shipped: [
          "delivered",
        ],

        delivered: [],

        cancelled: [],
      };

      if (
        !validTransitions[
          order.orderStatus
        ]?.includes(orderStatus)
      ) {
        return res.status(400).json({
          message:
            `Cannot change order status from ${order.orderStatus} to ${orderStatus}.`,
        });
      }

      order.orderStatus =
        orderStatus;

      await order.save();

      await logAction(
        req,
        "order.status.update",
        {
          targetType: "Order",
          targetId: order._id,
          meta: {
            orderNumber:
              order.orderNumber,

            orderStatus,
          },
        }
      );

      res.json(order);
    } catch (err) {
      console.error(
        "Order status update error:",
        err
      );

      res.status(500).json({
        message:
          "Could not update order status.",
      });
    }
  }
);


module.exports = router;