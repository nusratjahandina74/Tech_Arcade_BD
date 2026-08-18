"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api.js";
import { Button } from "../../components/ui/button.jsx";

export default function QuickOrderForm({ product, price, slug, ctaText }) {
  const [form, setForm] = useState({ name: "", phone: "", address: "", city: "" });
  const [qty, setQty] = useState(1);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await api.post("/orders", {
        items: [{ productId: product._id, quantity: qty }],
        customer: form,
        paymentMethod: "cod",
        landingPageSlug: slug,
      });
      router.push(`/order-result?status=success&order=${res.data.order.orderNumber}&cod=true`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not place the order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} id="order-form" className="grid gap-3 bg-card border border-border rounded-lg p-5">
      <p className="font-display font-700 text-lg">এখনই অর্ডার করুন</p>
      <div className="flex items-baseline gap-2">
        <span className="text-primary font-mono text-xl font-bold">৳{price}</span>
      </div>
      <input
        placeholder="আপনার নাম"
        required
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        className="bg-background border border-border rounded-md px-3 py-2.5 text-sm"
      />
      <input
        placeholder="মোবাইল নম্বর (01XXXXXXXXX)"
        required
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
        className="bg-background border border-border rounded-md px-3 py-2.5 text-sm"
      />
      <input
        placeholder="সম্পূর্ণ ঠিকানা"
        required
        value={form.address}
        onChange={(e) => setForm({ ...form, address: e.target.value })}
        className="bg-background border border-border rounded-md px-3 py-2.5 text-sm"
      />
      <input
        placeholder="শহর (যেমন: Dhaka)"
        required
        value={form.city}
        onChange={(e) => setForm({ ...form, city: e.target.value })}
        className="bg-background border border-border rounded-md px-3 py-2.5 text-sm"
      />
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">পরিমাণ</span>
        <input
          type="number"
          min={1}
          max={product.stock}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Math.min(product.stock, Number(e.target.value))))}
          className="bg-background border border-border rounded-md px-3 py-1.5 w-20 text-sm"
        />
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" size="lg" disabled={submitting || product.stock <= 0}>
        {submitting ? "অর্ডার হচ্ছে…" : product.stock <= 0 ? "স্টক নেই" : ctaText || "অর্ডার করুন"}
      </Button>
      <p className="text-xs text-muted-foreground text-center">ক্যাশ অন ডেলিভারি — পণ্য হাতে পেয়ে টাকা দিন</p>
    </form>
  );
}
