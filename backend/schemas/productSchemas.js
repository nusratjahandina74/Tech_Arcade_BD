const { z } = require("zod");

const CATEGORIES = ["Mobile", "Laptop", "Accessories", "Audio", "Wearable", "Gaming", "Smart Home", "Other"];

const specSchema = z.object({
  key: z.string().trim().min(1).max(60),
  value: z.string().trim().min(1).max(200),
});

const flashSaleSchema = z
  .object({
    active: z.boolean().default(false),
    endsAt: z
      .string()
      .optional()
      .nullable()
      .refine(
        (v) => !v || !Number.isNaN(new Date(v).getTime()),
        "Invalid flash sale end date"
      )
      .transform((v) => (v ? new Date(v) : null)),
  })
  .optional();

const createProductSchema = z
  .object({
    name: z.string().trim().min(2, "Name is too short").max(150),
    description: z.string().trim().min(10, "Description is too short").max(5000),
    category: z.enum(CATEGORIES),
    brand: z.string().trim().max(80).optional().or(z.literal("")),
    price: z.coerce.number().finite().min(0),
    discountPrice: z.coerce.number().finite().min(0).nullable().optional(),
    stock: z.coerce.number().int().min(0),
    images: z.array(z.string().url()).max(10).optional().default([]),
    specs: z.array(specSchema).max(30).optional().default([]),
    warranty: z.string().trim().max(100).optional().default("No warranty"),
    isFeatured: z.boolean().optional().default(false),
    flashSale: flashSaleSchema,
  })
  .superRefine((data, ctx) => {
    if (
      data.discountPrice !== null &&
      data.discountPrice !== undefined &&
      data.discountPrice >= data.price
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["discountPrice"],
        message: "Discount price must be lower than the regular price",
      });
    }

    if (
      data.flashSale?.active &&
      (!data.flashSale.endsAt ||
        data.flashSale.endsAt <= new Date())
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["flashSale", "endsAt"],
        message: "Flash sale end date must be in the future",
      });
    }
  });

// A separate schema (not `.partial()` on createProductSchema) — Zod applies a
// field's `.default()` even when that key is simply absent from the input, so
// reusing createProductSchema here would silently overwrite untouched fields
// (e.g. wiping `isFeatured` back to false) on every partial edit.
const updateProductSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  description: z.string().trim().min(10).max(5000).optional(),
  category: z.enum(CATEGORIES).optional(),
  brand: z.string().trim().max(80).optional().or(z.literal("")),
  price: z.coerce.number().finite().min(0).optional(),
  discountPrice: z.coerce.number().finite().min(0).nullable().optional(),
  stock: z.coerce.number().int().min(0).optional(),
  images: z.array(z.string().url()).max(10).optional(),
  specs: z.array(specSchema).max(30).optional(),
  warranty: z.string().trim().max(100).optional(),
  isFeatured: z.boolean().optional(),
  flashSale: flashSaleSchema,
});

module.exports = { createProductSchema, updateProductSchema };
