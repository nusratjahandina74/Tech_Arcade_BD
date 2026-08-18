const express = require("express");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { validatePayment } = require("../utils/sslcommerz");
const { releaseCouponRedemption } = require("../utils/coupon");

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

async function restockOrder(order) {
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
  }
  await releaseCouponRedemption(order);
}

// SSLCommerz posts application/x-www-form-urlencoded to these routes
router.post("/success", async (req, res) => {
  const { tran_id, val_id } = req.body;
  const order = await Order.findOne({ orderNumber: tran_id });
  if (!order) return res.redirect(`${FRONTEND_URL}/order-result?status=fail`);

  try {
    const validation = await validatePayment(val_id);
    const isValid =
      validation.status === "VALID" || validation.status === "VALIDATED";

    if (isValid && Number(validation.amount) >= order.grandTotal - 1) {
      order.paymentStatus = "paid";
      order.orderStatus = "confirmed";
      order.sslTransactionId = tran_id;
      order.sslValidationId = val_id;
      await order.save();
      return res.redirect(`${FRONTEND_URL}/order-result?status=success&order=${order.orderNumber}`);
    }

    order.paymentStatus = "failed";
    await order.save();
    await restockOrder(order);
    return res.redirect(`${FRONTEND_URL}/order-result?status=fail&order=${order.orderNumber}`);
  } catch (err) {
    console.error("Payment validation error:", err.message);
    return res.redirect(`${FRONTEND_URL}/order-result?status=fail&order=${order.orderNumber}`);
  }
});

router.post("/fail", async (req, res) => {
  const { tran_id } = req.body;
  const order = await Order.findOne({ orderNumber: tran_id });
  if (order && order.paymentStatus === "pending") {
    order.paymentStatus = "failed";
    await order.save();
    await restockOrder(order);
  }
  res.redirect(`${FRONTEND_URL}/order-result?status=fail&order=${tran_id || ""}`);
});

router.post("/cancel", async (req, res) => {
  const { tran_id } = req.body;
  const order = await Order.findOne({ orderNumber: tran_id });
  if (order && order.paymentStatus === "pending") {
    order.paymentStatus = "cancelled";
    await order.save();
    await restockOrder(order);
  }
  res.redirect(`${FRONTEND_URL}/order-result?status=cancel&order=${tran_id || ""}`);
});

// IPN (server-to-server confirmation) — the reliable source of truth
router.post("/ipn", async (req, res) => {
  const { tran_id, val_id, status } = req.body;
  const order = await Order.findOne({ orderNumber: tran_id });
  if (!order) return res.sendStatus(200);

  if (status === "VALID" && order.paymentStatus !== "paid") {
    try {
      const validation = await validatePayment(val_id);
      if (validation.status === "VALID" || validation.status === "VALIDATED") {
        order.paymentStatus = "paid";
        order.orderStatus = "confirmed";
        order.sslTransactionId = tran_id;
        order.sslValidationId = val_id;
        await order.save();
      }
    } catch (err) {
      console.error("IPN validation error:", err.message);
    }
  }
  res.sendStatus(200);
});

module.exports = router;
