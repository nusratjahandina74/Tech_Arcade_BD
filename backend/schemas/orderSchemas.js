const { z } = require("zod");
const { bdPhone } = require("./authSchemas");

const orderItemSchema = z.object({
  productId: z.string().trim().min(1, "Product is required"),
  quantity: z.coerce.number().int().min(1).max(50),
});

const customerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: bdPhone,
  email: z.string().trim().toLowerCase().email().optional().or(z.literal("")),
  address: z.string().trim().min(5).max(300),
  city: z.string().trim().min(2).max(100),
});

const manualPaymentSchema = z.object({
  senderNumber: bdPhone,
  // bKash/Nagad TrxIDs are short alphanumeric codes — reject anything that looks
  // like an attempt to inject something else.
  trxId: z
    .string()
    .trim()
    .min(4, "Transaction ID looks too short")
    .max(30, "Transaction ID looks too long")
    .regex(/^[A-Za-z0-9]+$/, "Transaction ID should only contain letters and numbers"),
});

const createOrderSchema = z
  .object({
    items: z.array(orderItemSchema).min(1, "Your cart is empty"),
    customer: customerSchema,
    paymentMethod: z.enum(["sslcommerz", "bkash_manual", "nagad_manual", "cod"]),
    manualPayment: manualPaymentSchema.optional(),
    couponCode: z.string().trim().max(30).optional().or(z.literal("")),
    landingPageSlug: z.string().trim().max(80).optional(),
  })
  .refine(
    (data) => !["bkash_manual", "nagad_manual"].includes(data.paymentMethod) || data.manualPayment,
    { message: "Transaction ID and sender number are required for this payment method", path: ["manualPayment"] }
  );

module.exports = { createOrderSchema };
