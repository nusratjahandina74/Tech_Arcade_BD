const express = require("express");
const AuditLog = require("../models/AuditLog");
const { requireOwner } = require("../middleware/auth");

const router = express.Router();

// GET /api/audit-logs — owner only, recent activity across the admin panel
router.get("/", requireOwner, async (req, res) => {
  const { page = 1, limit = 30 } = req.query;
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));

  const [logs, total] = await Promise.all([
    AuditLog.find()
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    AuditLog.countDocuments(),
  ]);

  res.json({ logs, total, page: pageNum, pages: Math.ceil(total / limitNum) });
});

module.exports = router;
