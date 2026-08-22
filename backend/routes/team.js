const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { requireOwner } = require("../middleware/auth");
const { validateBody } = require("../middleware/validate");
const { createTeamMemberSchema } = require("../schemas/teamSchemas");
const { logAction } = require("../utils/audit");

const router = express.Router();

// GET /api/team — list admin/manager accounts (owner only)
router.get("/", requireOwner, async (req, res) => {
  const members = await User.find({ role: { $in: ["admin", "manager", "delivery"] }, isDeleted: false })
    .select("name email role createdAt")
    .sort({ createdAt: 1 });
  res.json({ members });
});

// POST /api/team — invite a new admin or manager account (owner only)
router.post("/", requireOwner, validateBody(createTeamMemberSchema), async (req, res) => {
  const { name, email, password, role } = req.body;

  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ message: "An account with this email already exists." });

  const passwordHash = await bcrypt.hash(password, 12);
  const member = await User.create({ name, email, passwordHash, role, isVerified: true });

  await logAction(req, "team.member.create", {
    targetType: "User",
    targetId: member._id,
    meta: { email: member.email, role: member.role },
  });

  res.status(201).json({ id: member._id, name: member.name, email: member.email, role: member.role });
});

// DELETE /api/team/:id — soft-delete/deactivate a team member (owner only, can't remove yourself)
router.delete("/:id", requireOwner, async (req, res) => {
  if (String(req.params.id) === String(req.user.id)) {
    return res.status(400).json({ message: "You can't remove your own account this way." });
  }

  const member = await User.findByIdAndUpdate(
    req.params.id,
    { isDeleted: true, refreshTokens: [] }, // also kills any active sessions
    { new: true }
  );
  if (!member) return res.status(404).json({ message: "Account not found." });

  await logAction(req, "team.member.remove", {
    targetType: "User",
    targetId: member._id,
    meta: { email: member.email },
  });

  res.json({ message: "Removed." });
});

module.exports = router;
