"use client";

import React, { useEffect, useState } from "react";
import api from "../../../../lib/api.js";
import { useAdmin } from "../../../../context/AdminContext.jsx";

export default function AdminSettings() {
  const admin = useAdmin();
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/settings").then((res) => setForm(res.data));
  }, []);

  if (admin && admin.role !== "admin") {
    return <p className="text-muted-foreground text-sm">Only the owner account can change payment settings.</p>;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const res = await api.put("/settings", form);
      setForm(res.data);
      setMessage("Saved.");
    } catch {
      setMessage("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!form) return <p className="text-foreground/50 text-sm">Loading…</p>;

  return (
    <form onSubmit={handleSubmit} className="max-w-md grid gap-4">
      <p className="text-foreground/60 text-sm">
        এই number গুলো checkout page-এ customer দের দেখানো হবে bKash/Nagad Send Money করার জন্য।
        যেকোনো সময় বদলাতে পারবেন, redeploy লাগবে না।
      </p>

      <fieldset className="border border-border rounded-md p-4 grid gap-3">
        <legend className="text-sm px-1 text-primary">bKash</legend>
        <Field label="bKash number" value={form.bkashNumber} onChange={(v) => setForm({ ...form, bkashNumber: v })} placeholder="01XXXXXXXXX" />
        <label className="text-sm">
          <span className="text-foreground/70 block mb-1">Account type</span>
          <select
            value={form.bkashType}
            onChange={(e) => setForm({ ...form, bkashType: e.target.value })}
            className="w-full bg-card border border-border rounded px-3 py-2"
          >
            <option value="Personal">Personal</option>
            <option value="Merchant">Merchant</option>
          </select>
        </label>
      </fieldset>

      <fieldset className="border border-border rounded-md p-4 grid gap-3">
        <legend className="text-sm px-1 text-primary">Nagad</legend>
        <Field label="Nagad number" value={form.nagadNumber} onChange={(v) => setForm({ ...form, nagadNumber: v })} placeholder="01XXXXXXXXX" />
        <label className="text-sm">
          <span className="text-foreground/70 block mb-1">Account type</span>
          <select
            value={form.nagadType}
            onChange={(e) => setForm({ ...form, nagadType: e.target.value })}
            className="w-full bg-card border border-border rounded px-3 py-2"
          >
            <option value="Personal">Personal</option>
            <option value="Merchant">Merchant</option>
          </select>
        </label>
      </fieldset>

      <fieldset className="border border-border rounded-md p-4 grid gap-3">
        <legend className="text-sm px-1 text-primary">Delivery charge (৳)</legend>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Inside Dhaka"
            value={form.insideDhakaFee}
            onChange={(v) => setForm({ ...form, insideDhakaFee: v })}
            type="number"
          />
          <Field
            label="Outside Dhaka"
            value={form.outsideDhakaFee}
            onChange={(v) => setForm({ ...form, outsideDhakaFee: v })}
            type="number"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          এখান থেকে বদলালে সাথে সাথে checkout page ও order calculation দুটোতেই নতুন charge apply হবে।
        </p>
      </fieldset>

      <Field
        label="WhatsApp number (for order notifications, with country code, no + or spaces)"
        value={form.whatsappNumber}
        onChange={(v) => setForm({ ...form, whatsappNumber: v })}
        placeholder="8801XXXXXXXXX"
      />

      <label className="text-sm flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.codEnabled}
          onChange={(e) => setForm({ ...form, codEnabled: e.target.checked })}
        />
        Allow Cash on Delivery
      </label>

      {message && <p className="text-success text-sm">{message}</p>}

      <button
        type="submit"
        disabled={saving}
        className="bg-primary text-primary-foreground font-semibold px-5 py-2 rounded hover:opacity-90 disabled:opacity-50 w-fit"
      >
        {saving ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <label className="text-sm">
      <span className="text-foreground/70 block mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-card border border-border rounded px-3 py-2 focus:border-primary outline-none"
      />
    </label>
  );
}
