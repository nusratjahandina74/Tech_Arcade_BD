"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import api from "../../../../lib/api.js";
import ImageUploader from "../../../../components/ImageUploader.jsx";
import { Card, CardContent } from "../../../../components/ui/card.jsx";
import { Button } from "../../../../components/ui/button.jsx";
import { Input } from "../../../../components/ui/input.jsx";
import { Badge } from "../../../../components/ui/badge.jsx";

const EMPTY = {
  product: "",
  slug: "",
  headline: "",
  subheadline: "",
  heroImage: "",
  bullets: "",
  price: "",
  originalPrice: "",
  testimonialName: "",
  testimonialText: "",
  ctaText: "অর্ডার করুন",
};

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function LandingPagesAdmin() {
  const [pages, setPages] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    Promise.all([api.get("/landing-pages"), api.get("/products", { params: { limit: 100 } })])
      .then(([pagesRes, productsRes]) => {
        setPages(pagesRes.data.pages);
        setProducts(productsRes.data.products);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setForm(EMPTY);
    setEditingId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    const payload = {
      ...form,
      bullets: form.bullets.split("\n").map((b) => b.trim()).filter(Boolean),
      price: form.price ? Number(form.price) : null,
      originalPrice: form.originalPrice ? Number(form.originalPrice) : null,
    };
    try {
      if (editingId) {
        await api.put(`/landing-pages/${editingId}`, payload);
        setMessage("Landing page updated.");
      } else {
        await api.post("/landing-pages", payload);
        setMessage("Landing page created.");
      }
      resetForm();
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || "Something went wrong.");
    }
  }

  function startEdit(p) {
    setEditingId(p._id);
    setForm({
      product: p.product?._id || "",
      slug: p.slug,
      headline: p.headline,
      subheadline: p.subheadline || "",
      heroImage: p.heroImage || "",
      bullets: (p.bullets || []).join("\n"),
      price: p.price ?? "",
      originalPrice: p.originalPrice ?? "",
      testimonialName: p.testimonialName || "",
      testimonialText: p.testimonialText || "",
      ctaText: p.ctaText || "অর্ডার করুন",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    if (!confirm("Remove this landing page?")) return;
    await api.delete(`/landing-pages/${id}`);
    load();
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="h-fit">
        <CardContent className="p-5">
          <p className="text-sm font-medium mb-3">{editingId ? "Edit landing page" : "New landing page"}</p>
          <form onSubmit={handleSubmit} className="grid gap-3">
            <label className="text-sm">
              <span className="text-muted-foreground block mb-1">Product</span>
              <select
                required
                value={form.product}
                onChange={(e) => setForm({ ...form, product: e.target.value })}
                className="w-full h-10 bg-background border border-input rounded-md px-3 text-sm"
              >
                <option value="">Select a product</option>
                {products.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="text-muted-foreground block mb-1">URL slug (yoursite.com/lp/…)</span>
              <div className="flex gap-2">
                <Input
                  required
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="eid-offer-earbuds"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setForm({ ...form, slug: slugify(form.headline || form.slug) })}
                >
                  Auto
                </Button>
              </div>
            </label>

            <label className="text-sm">
              <span className="text-muted-foreground block mb-1">Headline</span>
              <Input required value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
            </label>

            <label className="text-sm">
              <span className="text-muted-foreground block mb-1">Subheadline</span>
              <Input value={form.subheadline} onChange={(e) => setForm({ ...form, subheadline: e.target.value })} />
            </label>

            <div>
              <span className="text-sm text-muted-foreground block mb-1">Hero image</span>
              <ImageUploader
                images={form.heroImage ? [form.heroImage] : []}
                onChange={(imgs) => setForm({ ...form, heroImage: imgs[imgs.length - 1] || "" })}
              />
            </div>

            <label className="text-sm">
              <span className="text-muted-foreground block mb-1">Bullet points (one per line)</span>
              <textarea
                rows={4}
                value={form.bullets}
                onChange={(e) => setForm({ ...form, bullets: e.target.value })}
                placeholder={"100% Genuine\n1 Year Warranty\nFree Delivery"}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="text-muted-foreground block mb-1">Campaign price (৳, optional)</span>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </label>
              <label className="text-sm">
                <span className="text-muted-foreground block mb-1">Strike-through price (৳)</span>
                <Input type="number" value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: e.target.value })} />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="text-muted-foreground block mb-1">Testimonial name</span>
                <Input value={form.testimonialName} onChange={(e) => setForm({ ...form, testimonialName: e.target.value })} />
              </label>
              <label className="text-sm">
                <span className="text-muted-foreground block mb-1">CTA button text</span>
                <Input value={form.ctaText} onChange={(e) => setForm({ ...form, ctaText: e.target.value })} />
              </label>
            </div>
            <label className="text-sm">
              <span className="text-muted-foreground block mb-1">Testimonial text</span>
              <textarea
                rows={2}
                value={form.testimonialText}
                onChange={(e) => setForm({ ...form, testimonialText: e.target.value })}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm"
              />
            </label>

            {message && <p className="text-xs text-muted-foreground">{message}</p>}
            <div className="flex gap-2">
              <Button type="submit">{editingId ? "Save changes" : "Create page"}</Button>
              {editingId && <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {loading && <p className="text-muted-foreground text-sm">Loading…</p>}
        {pages.map((p) => (
          <Card key={p._id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{p.headline}</p>
                <Badge variant={p.isActive ? "success" : "outline"}>{p.isActive ? "Live" : "Off"}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Product: {p.product?.name}</p>
              <p className="text-xs text-muted-foreground">{p.views} views · {p.orders} orders</p>
              <div className="flex gap-3 mt-2">
                <Link href={`/lp/${p.slug}`} target="_blank" className="text-primary text-xs hover:underline">
                  View live →
                </Link>
                <button onClick={() => startEdit(p)} className="text-success text-xs hover:underline">Edit</button>
                <button onClick={() => handleDelete(p._id)} className="text-destructive text-xs hover:underline">Remove</button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!loading && pages.length === 0 && <p className="text-muted-foreground text-sm">No landing pages yet.</p>}
      </div>
    </div>
  );
}
