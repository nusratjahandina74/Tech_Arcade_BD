const AuditLog = require("../models/AuditLog");

// Records who did what. Never throws into the caller's request — a failed
// audit write shouldn't ever block or fail the actual operation.
async function logAction(req, action, { targetType, targetId, meta } = {}) {
  try {
    if (!req.user) return; // system/guest actions aren't attributed to anyone
    await AuditLog.create({
      actor: req.user.id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action,
      targetType,
      targetId: targetId ? String(targetId) : undefined,
      meta,
    });
  } catch (err) {
    console.error("Audit log write failed:", err.message);
  }
}

module.exports = { logAction };
