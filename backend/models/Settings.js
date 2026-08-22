const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "main", unique: true },
    bkashNumber: { type: String, default: "" },
    bkashType: { type: String, enum: ["Personal", "Merchant"], default: "Personal" },
    nagadNumber: { type: String, default: "" },
    nagadType: { type: String, enum: ["Personal", "Merchant"], default: "Personal" },
    whatsappNumber: { type: String, default: "" }, // include country code, no +, e.g. 8801XXXXXXXXX
    codEnabled: { type: Boolean, default: true },
    insideDhakaFee: { type: Number, default: 80 },
    outsideDhakaFee: { type: Number, default: 120 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Settings", settingsSchema);
