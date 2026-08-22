const { z } = require("zod");

const updateSettingsSchema = z.object({
  bkashNumber: z.string().trim().max(20).optional(),
  bkashType: z.enum(["Personal", "Merchant"]).optional(),
  nagadNumber: z.string().trim().max(20).optional(),
  nagadType: z.enum(["Personal", "Merchant"]).optional(),
  whatsappNumber: z.string().trim().max(20).optional(),
  codEnabled: z.boolean().optional(),
  insideDhakaFee: z.coerce.number().min(0).optional(),
  outsideDhakaFee: z.coerce.number().min(0).optional(),
});

module.exports = { updateSettingsSchema };
