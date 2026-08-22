const express = require("express");
const { v4: uuidv4 } = require("uuid");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Settings = require("../models/Settings");
const Coupon = require("../models/Coupon");
const LandingPage = require("../models/LandingPage");
const { requireAdmin, requireAuth, requireOwner, requireDelivery, attachUserIfPresent } = require("../middleware/auth");
const { validateBody } = require("../middleware/validate");
const { createOrderSchema } = require("../schemas/orderSchemas");
const { initPayment } = require("../utils/sslcommerz");
const { logAction } = require("../utils/audit");
const { releaseCouponRedemption } = require("../utils/coupon");

const router = express.Router();

// POST /api/orders — public, place a new order
router.post("/", attachUserIfPresent, validateBody(createOrderSchema), async (req, res) => {
    const { items, customer, paymentMethod, manualPayment, couponCode, landingPageSlug } = req.body;

    if (["bkash_manual", "nagad_manual"].includes(paymentMethod)) {
      // Prevent the same Transaction ID being reused across multiple orders
      const duplicate = await Order.findOne({ "manualPayment.trxId": manualPayment.trxId.trim() });
      if (duplicate) {
        return res.status(400).json({
          message: "This Transaction ID has already been used on another order.",
        });
      }
    }

    // Never trust client-sent prices — recompute from DB
    let itemsTotal = 0;
    const verifiedItems = [];

    for (const line of items) {
      const product = await Product.findById(line.productId);
      if (!product || !product.isActive) {
        return res.status(400).json({ message: `A product in your cart is no longer available.` });
      }
      const qty = Math.max(1, Number(line.quantity) || 1);
      if (product.stock < qty) {
        return res.status(400).json({ message: `${product.name} only has ${product.stock} left in stock.` });
      }
      const price = product.discountPrice ?? product.price;
      itemsTotal += price * qty;
      verifiedItems.push({ product: product._id, name: product.name, price, quantity: qty });
    }

    const settings = (await Settings.findOne({ key: "main" })) || (await Settings.create({ key: "main" }));
    const deliveryFee = /dhaka/i.test(customer.city) ? settings.insideDhakaFee : settings.outsideDhakaFee;

    // Re-validate the coupon from scratch server-side — never trust a discount
    // amount computed by the client.
    let discountAmount = 0;
    let coupon = null;
    if (couponCode) {
      coupon = await Coupon.findOne({ code: couponCode.trim().toUpperCase() });
      if (!coupon) {
        return res.status(400).json({ message: "Invalid coupon code." });
      }
      const identifier = req.user?.id || customer.phone;
      try {
        discountAmount = coupon.computeDiscount(itemsTotal, identifier);
      } catch (err) {
        return res.status(400).json({ message: err.message });
      }
    }

    const grandTotal = itemsTotal + deliveryFee - discountAmount;
    const orderNumber = `TA-${Date.now()}-${uuidv4().slice(0, 6).toUpperCase()}`;

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
        paymentMethod === "bkash_manual" || paymentMethod === "nagad_manual"
          ? { senderNumber: manualPayment.senderNumber, trxId: manualPayment.trxId }
          : undefined,
    });

    // Reserve stock
    for (const item of verifiedItems) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
    }

    // Attribute the order to a landing page campaign, if it came from one
    if (landingPageSlug) {
      LandingPage.updateOne({ slug: landingPageSlug }, { $inc: { orders: 1 } }).catch(() => {});
    }

    // Record the coupon redemption now that the order genuinely exists —
    // this is what maxUsesTotal / maxUsesPerCustomer count against.
    if (coupon) {
      coupon.redemptions.push({ identifier: req.user?.id || customer.phone, order: order._id });
      await coupon.save();
    }

    if (paymentMethod === "cod" || paymentMethod === "bkash_manual" || paymentMethod === "nagad_manual") {
      return res.status(201).json({ order, redirectUrl: null });
    }

    // SSLCommerz flow — get a hosted payment page URL
    try {
      const payment = await initPayment({ order, customer });
      if (payment && payment.GatewayPageURL) {
        return res.status(201).json({ order, redirectUrl: payment.GatewayPageURL });
      }
      return res.status(502).json({ message: "Could not start payment. Please try again." });
    } catch (err) {
      console.error("SSLCommerz init error:", err.message);
      return res.status(502).json({ message: "Payment gateway is unavailable right now." });
    }
  }
);

// GET /api/orders/recent-public — public, powers the "someone just bought this" social-proof
// popup. Deliberately minimal fields — first name + city + product only, never phone/address/total.
router.get("/recent-public", async (req, res) => {
  const orders = await Order.find({ paymentStatus: "paid" })
    .sort({ createdAt: -1 })
    .limit(15)
    .select("customer.name customer.city items createdAt");

  const feed = orders
    .filter((o) => o.items.length > 0)
    .map((o) => ({
      firstName: (o.customer.name || "Someone").trim().split(" ")[0],
      city: o.customer.city,
      productName: o.items[0].name,
      createdAt: o.createdAt,
    }));

  res.json({ feed });
});

// GET /api/orders/for-delivery — delivery staff (and admin/manager), orders ready to ship out
router.get("/for-delivery", requireDelivery, async (req, res) => {
  const orders = await Order.find({ orderStatus: "shipped" }).sort({ updatedAt: 1 });
  res.json({ orders });
});

// PUT /api/orders/:id/mark-delivered — delivery staff can only ever move an order to "delivered"
router.put("/:id/mark-delivered", requireDelivery, async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found." });
  if (order.orderStatus !== "shipped") {
    return res.status(400).json({ message: "Only shipped orders can be marked delivered." });
  }

  order.orderStatus = "delivered";
  await order.save();
  await logAction(req, "order.status.update", {
    targetType: "Order",
    targetId: order._id,
    meta: { orderNumber: order.orderNumber, orderStatus: "delivered" },
  });
  res.json(order);
});

// GET /api/orders/stats — admin only, dashboard summary
router.get("/stats", requireAdmin, async (req, res) => {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
  fourteenDaysAgo.setHours(0, 0, 0, 0);

  const [totals, byStatus, byDay, pendingPayments, recentOrders] = await Promise.all([
    Order.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: null, revenue: { $sum: "$grandTotal" }, count: { $sum: 1 } } },
    ]),
    Order.aggregate([{ $group: { _id: "$orderStatus", count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { paymentStatus: "paid", createdAt: { $gte: fourteenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$grandTotal" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Order.countDocuments({
      paymentStatus: "pending",
      paymentMethod: { $in: ["bkash_manual", "nagad_manual"] },
    }),
    Order.find().sort({ createdAt: -1 }).limit(6),
  ]);

  const lowStock = await Product.find({ isActive: true, stock: { $lte: 5 } })
    .sort({ stock: 1 })
    .limit(6)
    .select("name stock");

  res.json({
    totalRevenue: totals[0]?.revenue || 0,
    paidOrders: totals[0]?.count || 0,
    totalOrders: await Order.countDocuments(),
    pendingPayments,
    ordersByStatus: byStatus.map((s) => ({ status: s._id, count: s.count })),
    revenueByDay: byDay.map((d) => ({ date: d._id, revenue: d.revenue, orders: d.orders })),
    lowStock,
    recentOrders,
  });
});

// GET /api/orders — admin only, list orders
router.get("/", requireAdmin, async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.orderStatus = status;

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
    Order.countDocuments(filter),
  ]);

  res.json({ orders, total, page: pageNum, pages: Math.ceil(total / limitNum) });
});

// PUT /api/orders/:id/payment-status — admin only, verify or reject a manual bKash/Nagad payment
router.put("/:id/payment-status", requireAdmin, async (req, res) => {
  const { paymentStatus, rejectionReason } = req.body;
  if (!["paid", "failed"].includes(paymentStatus)) {
    return res.status(400).json({ message: "Invalid payment status." });
  }

  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found." });

  if (order.paymentStatus === paymentStatus) {
    return res.json(order); // no-op, already in this state
  }

  order.paymentStatus = paymentStatus;

  if (paymentStatus === "paid") {
    order.manualPayment.verifiedAt = new Date();
    order.manualPayment.rejectionReason = null;
    if (order.orderStatus === "placed") order.orderStatus = "confirmed";
  }

  if (paymentStatus === "failed") {
    order.manualPayment.rejectionReason = rejectionReason || "TrxID could not be verified";
    // Release reserved stock back since the payment didn't check out
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
    }
    await releaseCouponRedemption(order);
  }

  await order.save();
  await logAction(req, paymentStatus === "paid" ? "order.payment.approve" : "order.payment.reject", {
    targetType: "Order",
    targetId: order._id,
    meta: { orderNumber: order.orderNumber, rejectionReason: order.manualPayment?.rejectionReason },
  });
  res.json(order);
});

// PUT /api/orders/:id/resubmit-payment — logged-in customer only, fix a rejected TxID
// without having to place a brand new order.
router.put("/:id/resubmit-payment", requireAuth(), async (req, res) => {
  const { trxId, senderNumber } = req.body;
  if (!trxId || !senderNumber) {
    return res.status(400).json({ message: "Please enter the Transaction ID and sender number." });
  }

  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found." });

  if (!order.user || String(order.user) !== String(req.user.id)) {
    return res.status(403).json({ message: "This isn't your order." });
  }
  if (order.paymentStatus !== "failed") {
    return res.status(400).json({ message: "Only a rejected payment can be resubmitted." });
  }

  const duplicate = await Order.findOne({ "manualPayment.trxId": trxId.trim(), _id: { $ne: order._id } });
  if (duplicate) {
    return res.status(400).json({ message: "This Transaction ID has already been used on another order." });
  }

  // Stock was released when the payment was rejected — make sure it's still available
  // before putting the order back into the verification queue.
  for (const item of order.items) {
    const product = await Product.findById(item.product);
    if (!product || !product.isActive || product.stock < item.quantity) {
      return res.status(400).json({ message: `${item.name} is no longer available in that quantity.` });
    }
  }
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
  }

  // Re-check the coupon is still usable (limits may have changed or been hit
  // by other orders in the meantime) and re-record the redemption.
  if (order.couponCode) {
    const coupon = await Coupon.findOne({ code: order.couponCode });
    if (coupon) {
      try {
        coupon.computeDiscount(order.itemsTotal, req.user.id);
        coupon.redemptions.push({ identifier: req.user.id, order: order._id });
        await coupon.save();
      } catch (err) {
        // Coupon can no longer be honored — proceed without it rather than
        // blocking the customer's retry entirely.
        order.discountAmount = 0;
        order.couponCode = null;
        order.grandTotal = order.itemsTotal + order.deliveryFee;
      }
    }
  }

  order.manualPayment.trxId = trxId.trim();
  order.manualPayment.senderNumber = senderNumber.trim();
  order.manualPayment.rejectionReason = null;
  order.paymentStatus = "pending";
  await order.save();

  await logAction(req, "order.payment.resubmit", {
    targetType: "Order",
    targetId: order._id,
    meta: { orderNumber: order.orderNumber },
  });

  res.json(order);
});

// GET /api/orders/mine — logged-in customer's own order history
router.get("/mine", requireAuth(), async (req, res) => {
  const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json({ orders });
});

// PUT /api/orders/:id/status — admin only
router.put("/:id/status", requireAdmin, async (req, res) => {
  const { orderStatus } = req.body;
  const allowed = ["placed", "confirmed", "processing", "shipped", "delivered", "cancelled"];
  if (!allowed.includes(orderStatus)) {
    return res.status(400).json({ message: "Invalid status." });
  }
  const order = await Order.findByIdAndUpdate(req.params.id, { orderStatus }, { new: true });
  if (!order) return res.status(404).json({ message: "Order not found." });
  await logAction(req, "order.status.update", {
    targetType: "Order",
    targetId: order._id,
    meta: { orderNumber: order.orderNumber, orderStatus },
  });
  res.json(order);
});

module.exports = router;
