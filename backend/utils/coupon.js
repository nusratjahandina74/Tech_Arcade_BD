const Coupon = require("../models/Coupon");

// Mirrors the stock-release logic: if a manual payment is rejected or an
// SSLCommerz payment fails/is cancelled, the coupon usage shouldn't count
// against the customer either — they never actually completed the order.
async function releaseCouponRedemption(order) {
  if (!order.couponCode) return;
  await Coupon.updateOne({ code: order.couponCode }, { $pull: { redemptions: { order: order._id } } });
}

module.exports = { releaseCouponRedemption };
