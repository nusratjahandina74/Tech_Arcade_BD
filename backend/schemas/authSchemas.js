const { z } = require("zod");

// Bangladeshi mobile numbers: 01[3-9]XXXXXXXX (11 digits), optionally with +880/880 prefix.
const bdPhone = z
  .string()
  .trim()
  .regex(/^(?:\+?880|0)1[3-9]\d{8}$/, "Enter a valid Bangladeshi phone number");

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: bdPhone,
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const requestOtpSchema = z.object({
  phone: bdPhone,
});

const verifyOtpSchema = z.object({
  phone: bdPhone,
  code: z.string().trim().length(4, "Enter the 4-digit code"),
  name: z.string().trim().min(2).max(100).optional(), // used the first time a new phone signs up
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});

const resetPasswordSchema = z.object({
  token: z.string().trim().min(10),
  newPassword: z.string().min(6, "Password must be at least 6 characters").max(72),
});

module.exports = {
  registerSchema,
  loginSchema,
  requestOtpSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  bdPhone,
};
