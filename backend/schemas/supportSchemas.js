const { z } = require("zod");

const createTicketSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  message: z.string().trim().min(5).max(2000),
  relatedOrderId: z.string().trim().optional(),
});

const replySchema = z.object({
  message: z.string().trim().min(1).max(2000),
});

const updateStatusSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved"]),
});

module.exports = { createTicketSchema, replySchema, updateStatusSchema };
