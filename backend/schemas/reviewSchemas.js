const { z } = require("zod");

const createReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(5, "Please write a few words").max(2000),
  images: z.array(z.string().url()).max(6).optional().default([]),
  video: z.string().url().optional().or(z.literal("")).nullable(),
  orderId: z.string().trim().optional(),
});

const createRmaSchema = z.object({
  orderId: z.string().trim().min(1),
  productId: z.string().trim().min(1),
  type: z.enum(["return", "warranty"]),
  reason: z.string().trim().min(10, "Please describe the issue in a bit more detail").max(1000),
  images: z.array(z.string().url()).max(6).optional().default([]),
  video: z.string().url().optional().or(z.literal("")).nullable(),
});

const updateRmaSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  adminNote: z.string().trim().max(500).optional().default(""),
});

module.exports = { createReviewSchema, createRmaSchema, updateRmaSchema };
