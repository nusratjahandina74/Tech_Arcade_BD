const { z } = require("zod");

const createCouponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, "Code is too short")
      .max(30, "Code is too long")
      .regex(/^[A-Za-z0-9_-]+$/, "Use only letters, numbers, - and _"),
    type: z.enum(["percentage", "fixed"]),
    value: z.coerce.number().positive(),
    minOrderAmount: z.coerce.number().min(0).default(0),
    maxUsesTotal: z.coerce.number().int().positive().nullable().optional(),
    maxUsesPerCustomer: z.coerce.number().int().positive().default(1),
    expiresAt: z
      .string()
      .optional()
      .nullable()
      .transform((v) => (v ? new Date(v) : null)),
  })
  .refine((data) => data.type !== "percentage" || data.value <= 100, {
    message: "Percentage discount can't be more than 100",
    path: ["value"],
  });

const validateCouponSchema = z.object({
  code: z.string().trim().min(1),
  subtotal: z.coerce.number().min(0),
  phone: z.string().trim().optional(), // used as a guest identifier for per-customer limits
});

module.exports = { createCouponSchema, validateCouponSchema };
