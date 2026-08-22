const { z } = require("zod");
const { bdPhone } = require("./authSchemas");

const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: bdPhone.optional(),
});

const addressSchema = z.object({
  title: z.string().trim().min(1).max(40).default("Home"),
  addressLine: z.string().trim().min(5).max(300),
  city: z.string().trim().min(2).max(100),
  zone: z.string().trim().max(100).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(72),
});

module.exports = { updateProfileSchema, addressSchema, changePasswordSchema };
