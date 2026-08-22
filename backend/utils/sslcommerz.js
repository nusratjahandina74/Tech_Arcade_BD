const SSLCommerzPayment = require("sslcommerz-lts");

const store_id = process.env.SSLCOMMERZ_STORE_ID;
const store_passwd = process.env.SSLCOMMERZ_STORE_PASSWORD;
const is_live = process.env.SSLCOMMERZ_IS_LIVE === "true";

async function initPayment({ order, customer }) {
  const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);

  const data = {
    total_amount: order.grandTotal,
    currency: "BDT",
    tran_id: order.orderNumber,
    success_url: `${process.env.BACKEND_URL}/api/payment/success`,
    fail_url: `${process.env.BACKEND_URL}/api/payment/fail`,
    cancel_url: `${process.env.BACKEND_URL}/api/payment/cancel`,
    ipn_url: `${process.env.BACKEND_URL}/api/payment/ipn`,
    shipping_method: "Courier",
    product_name: order.items.map((i) => i.name).join(", ").slice(0, 250),
    product_category: "Electronics",
    product_profile: "general",
    cus_name: customer.name,
    cus_email: customer.email || "no-email@example.com",
    cus_add1: customer.address,
    cus_city: customer.city,
    cus_country: "Bangladesh",
    cus_phone: customer.phone,
    ship_name: customer.name,
    ship_add1: customer.address,
    ship_city: customer.city,
    ship_country: "Bangladesh",
    ship_postcode: "1000",
  };

  const response = await sslcz.init(data);
  return response; // contains GatewayPageURL
}

async function validatePayment(val_id) {
  const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
  const result = await sslcz.validate({ val_id });
  return result;
}

module.exports = { initPayment, validatePayment };
