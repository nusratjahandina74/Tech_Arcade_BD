const { z } = require("zod");

const createTeamMemberSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6).max(72),
  role: z.enum(["admin", "manager", "delivery"]),
});

module.exports = { createTeamMemberSchema };
