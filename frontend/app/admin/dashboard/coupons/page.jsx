"use client";

import React, { useEffect, useState } from "react";
import api from "../../../../lib/api.js";
import { useAdmin } from "../../../../context/AdminContext.jsx";
import { Card, CardContent } from "../../../../components/ui/card.jsx";
import { Button } from "../../../../components/ui/button.jsx";
import { Input } from "../../../../components/ui/input.jsx";
import { Badge } from "../../../../components/ui/badge.jsx";

const EMPTY = {
  code: "",
  type: "percentage",
  value: "",
  minOrderAmount: "0",
  maxUsesTotal: "",
  maxUsesPerCustomer: "1",
  expiresAt: "",
};

export default function CouponsPage() {
  const admin = useAdmin();
  const isOwner = admin?.role === "admin";
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    api.get("/coupons").then((res) => setCoupons(res.data.coupons)).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    try {
      await api.post("/coupons", {
        ...form,
        maxUsesTotal: form.maxUsesTotal || null,
        expiresAt: form.expiresAt || null,
      });
      setForm(EMPTY);
      setMessage("Coupon created.");
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not create coupon.");
    }
  }

  async function toggleActive(coupon) {
    await api.put(`/coupons/${coupon._id}`, { isActive: !coupon.isActive });
    load();
  }

  async function handleDelete(id) {
    if (!confirm("Deactivate this coupon?")) return;
    await api.delete(`/coupons/${id}`);
    load();
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {isOwner && (
        <Card className="h-fit">
          <CardContent className="p-5">
            <p className="text-sm font-medium mb-3">Create a coupon</p>
            <form onSubmit={handleSubmit} className="grid gap-3">
              <Input
                placeholder="CODE (e.g. ARCADE2026)"
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="h-10 bg-background border border-input rounded-md px-3 text-sm"
                >
                  <option value="percentage">Percentage off</option>
                  <option value="fixed">Fixed amount off (৳)</option>
                </select>
                <Input
                  type="number"
                  placeholder={form.type === "percentage" ? "e.g. 10" : "e.g. 200"}
                  required
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-muted-foreground grid gap-1">
                  Min order amount (৳)
                  <Input type="number" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} />
                </label>
                <label className="text-xs text-muted-foreground grid gap-1">
                  Max uses per customer
                  <Input type="number" value={form.maxUsesPerCustomer} onChange={(e) => setForm({ ...form, maxUsesPerCustomer: e.target.value })} />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-muted-foreground grid gap-1">
                  Max total uses (blank = unlimited)
                  <Input type="number" value={form.maxUsesTotal} onChange={(e) => setForm({ ...form, maxUsesTotal: e.target.value })} />
                </label>
                <label className="text-xs text-muted-foreground grid gap-1">
                  Expires on (optional)
                  <Input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
                </label>
              </div>
              {message && <p className="text-xs text-muted-foreground">{message}</p>}
              <Button type="submit" className="w-fit">Create coupon</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {loading && <p className="text-muted-foreground text-sm">Loading…</p>}
        {coupons.map((c) => (
          <Card key={c._id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="font-mono text-sm text-primary">{c.code}</p>
                <Badge variant={c.isActive ? "success" : "outline"}>{c.isActive ? "Active" : "Inactive"}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {c.type === "percentage" ? `${c.value}% off` : `৳${c.value} off`}
                {c.minOrderAmount > 0 && ` · min ৳${c.minOrderAmount}`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Used {c.usedCount}
                {c.maxUsesTotal ? ` / ${c.maxUsesTotal}` : ""} times · max {c.maxUsesPerCustomer}/customer
                {c.expiresAt && ` · expires ${new Date(c.expiresAt).toLocaleDateString()}`}
              </p>
              {isOwner && (
                <div className="flex gap-3 mt-2">
                  <button onClick={() => toggleActive(c)} className="text-success text-xs hover:underline">
                    {c.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button onClick={() => handleDelete(c._id)} className="text-destructive text-xs hover:underline">Remove</button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {!loading && coupons.length === 0 && <p className="text-muted-foreground text-sm">No coupons yet.</p>}
      </div>
    </div>
  );
}
