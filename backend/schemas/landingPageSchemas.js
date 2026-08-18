const { z } = require("zod");

const createLandingPageSchema = z.object({
  product: z.string().trim().min(1, "Select a product"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Slug is too short")
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Use only lowercase letters, numbers, and hyphens"),
  headline: z.string().trim().min(3).max(200),
  subheadline: z.string().trim().max(300).optional().default(""),
  heroImage: z.string().url().optional().or(z.literal("")).default(""),
  bullets: z.array(z.string().trim().max(200)).max(20).optional().default([]),
  price: z.coerce.number().min(0).nullable().optional(),
  originalPrice: z.coerce.number().min(0).nullable().optional(),
  testimonialName: z.string().trim().max(100).optional().default(""),
  testimonialText: z.string().trim().max(500).optional().default(""),
  ctaText: z.string().trim().max(50).optional().default("অর্ডার করুন"),
  isActive: z.boolean().optional().default(true),
});

// Separate (not `.partial()`) for the same reason as productSchemas.js —
// avoids `.default()` silently overwriting fields the admin didn't touch.
const updateLandingPageSchema = z.object({
  product: z.string().trim().min(1).optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  headline: z.string().trim().min(3).max(200).optional(),
  subheadline: z.string().trim().max(300).optional(),
  heroImage: z.string().url().optional().or(z.literal("")),
  bullets: z.array(z.string().trim().max(200)).max(20).optional(),
  price: z.coerce.number().min(0).nullable().optional(),
  originalPrice: z.coerce.number().min(0).nullable().optional(),
  testimonialName: z.string().trim().max(100).optional(),
  testimonialText: z.string().trim().max(500).optional(),
  ctaText: z.string().trim().max(50).optional(),
  isActive: z.boolean().optional(),
});

module.exports = { createLandingPageSchema, updateLandingPageSchema };
