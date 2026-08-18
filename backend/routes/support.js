const express = require("express");
const SupportTicket = require("../models/SupportTicket");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { validateBody } = require("../middleware/validate");
const { createTicketSchema, replySchema, updateStatusSchema } = require("../schemas/supportSchemas");

const router = express.Router();

// POST /api/support — customer opens a new ticket
router.post("/", requireAuth(), validateBody(createTicketSchema), async (req, res) => {
  const { subject, message, relatedOrderId } = req.body;

  const ticket = await SupportTicket.create({
    user: req.user.id,
    subject,
    relatedOrder: relatedOrderId || null,
    messages: [{ sender: "customer", senderName: req.user.name, message }],
  });

  res.status(201).json(ticket);
});

// GET /api/support/mine — customer's own tickets
router.get("/mine", requireAuth(), async (req, res) => {
  const tickets = await SupportTicket.find({ user: req.user.id }).sort({ updatedAt: -1 });
  res.json({ tickets });
});

// POST /api/support/:id/reply — either the ticket owner or staff can reply
router.post("/:id/reply", requireAuth(), validateBody(replySchema), async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ message: "Ticket not found." });

  const isOwner = String(ticket.user) === String(req.user.id);
  const isStaff = ["admin", "manager"].includes(req.user.role);
  if (!isOwner && !isStaff) return res.status(403).json({ message: "Not your ticket." });

  ticket.messages.push({
    sender: isStaff ? "staff" : "customer",
    senderName: req.user.name,
    message: req.body.message,
  });
  // A staff reply moves an open ticket into progress automatically
  if (isStaff && ticket.status === "open") ticket.status = "in_progress";

  await ticket.save();
  res.json(ticket);
});

// GET /api/support — admin/manager, all tickets
router.get("/", requireAdmin, async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};
  const tickets = await SupportTicket.find(filter).sort({ updatedAt: -1 });
  res.json({ tickets });
});

// PUT /api/support/:id/status — admin/manager
router.put("/:id/status", requireAdmin, validateBody(updateStatusSchema), async (req, res) => {
  const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  if (!ticket) return res.status(404).json({ message: "Ticket not found." });
  res.json(ticket);
});

module.exports = router;
