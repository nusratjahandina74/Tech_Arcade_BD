const express = require("express");
const Settings = require("../models/Settings");
const { requireOwner } = require("../middleware/auth");
const { validateBody } = require("../middleware/validate");
const { updateSettingsSchema } = require("../schemas/settingsSchemas");
const { logAction } = require("../utils/audit");

const router = express.Router();

async function getOrCreateSettings() {
  let settings = await Settings.findOne({ key: "main" });
  if (!settings) settings = await Settings.create({ key: "main" });
  return settings;
}

// GET /api/settings — public, checkout page needs these numbers
router.get("/", async (req, res) => {
  const settings = await getOrCreateSettings();
  res.json(settings);
});

// PUT /api/settings — owner (admin) only — managers can process orders but
// must never be able to redirect customer payments to a different number.
router.put("/", requireOwner, validateBody(updateSettingsSchema), async (req, res) => {
  const {
    bkashNumber,
    bkashType,
    nagadNumber,
    nagadType,
    whatsappNumber,
    codEnabled,
    insideDhakaFee,
    outsideDhakaFee,
  } = req.body;
  const settings = await getOrCreateSettings();

  if (bkashNumber !== undefined) settings.bkashNumber = bkashNumber;
  if (bkashType !== undefined) settings.bkashType = bkashType;
  if (nagadNumber !== undefined) settings.nagadNumber = nagadNumber;
  if (nagadType !== undefined) settings.nagadType = nagadType;
  if (whatsappNumber !== undefined) settings.whatsappNumber = whatsappNumber;
  if (codEnabled !== undefined) settings.codEnabled = codEnabled;
  if (insideDhakaFee !== undefined) settings.insideDhakaFee = Number(insideDhakaFee);
  if (outsideDhakaFee !== undefined) settings.outsideDhakaFee = Number(outsideDhakaFee);

  await settings.save();
  await logAction(req, "settings.update", { targetType: "Settings", targetId: settings._id, meta: req.body });
  res.json(settings);
});

module.exports = router;
