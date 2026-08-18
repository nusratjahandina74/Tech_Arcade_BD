"use client";

import React, { useEffect, useState } from "react";
import api from "../../../../lib/api.js";
import ImageUploader from "../../../../components/ImageUploader.jsx";
import { Button } from "../../../../components/ui/button.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card.jsx";
import { Input } from "../../../../components/ui/input.jsx";
import { Badge } from "../../../../components/ui/badge.jsx";
import { useAdmin } from "../../../../context/AdminContext.jsx";

const CATEGORIES = ["Mobile", "Laptop", "Accessories", "Audio", "Wearable", "Gaming", "Smart Home", "Other"];
const EMPTY_FORM = {
  name: "",
  description: "",
  category: "Mobile",
  brand: "",
  price: "",
  discountPrice: "",
  stock: "",
  images: [],
  warranty: "",
  isFeatured: false,
  flashSaleActive: false,
  flashSaleEndsAt: "",
};

export default function AdminProducts() {
  const admin = useAdmin();
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");

  async function loadProducts() {
    const res = await api.get("/products", { params: { limit: 50 } });
    setProducts(res.data.products);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    const { flashSaleActive, flashSaleEndsAt, ...rest } = form;
    const payload = {
      ...rest,
      price: Number(form.price),
      discountPrice: form.discountPrice ? Number(form.discountPrice) : null,
      stock: Number(form.stock),
      flashSale: {
        active: flashSaleActive,
        endsAt: flashSaleActive && flashSaleEndsAt ? new Date(flashSaleEndsAt).toISOString() : null,
      },
    };
    try {
      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
        setMessage("Product updated.");
      } else {
        await api.post("/products", payload);
        setMessage("Product created.");
      }
      resetForm();
      loadProducts();
    } catch (err) {
      setMessage(err.response?.data?.message || "Something went wrong.");
    }
  }

  function startEdit(p) {
    setEditingId(p._id);
    setForm({
      name: p.name,
      description: p.description,
      category: p.category,
      brand: p.brand || "",
      price: p.price,
      discountPrice: p.discountPrice || "",
      stock: p.stock,
      images: p.images || [],
      warranty: p.warranty || "",
      isFeatured: p.isFeatured,
      flashSaleActive: p.flashSale?.active || false,
      flashSaleEndsAt: p.flashSale?.endsAt ? new Date(p.flashSale.endsAt).toISOString().slice(0, 16) : "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    if (!confirm("Remove this product from the shop?")) return;
    await api.delete(`/products/${id}`);
    loadProducts();
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-foreground text-base font-display font-600">
            {editingId ? "Edit product" : "Add new product"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <form onSubmit={handleSubmit} className="grid gap-3">
            <Field label="Name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Description">
              <textarea
                required
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full h-10 bg-background border border-input rounded-md px-3 text-sm"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Brand">
                <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Price (৳)">
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
              </Field>
              <Field label="Discount price">
                <Input type="number" value={form.discountPrice} onChange={(e) => setForm({ ...form, discountPrice: e.target.value })} />
              </Field>
              <Field label="Stock">
                <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required />
              </Field>
            </div>

            <ImageUploader images={form.images} onChange={(images) => setForm({ ...form, images })} />

            <Field label="Warranty">
              <Input
                value={form.warranty}
                onChange={(e) => setForm({ ...form, warranty: e.target.value })}
                placeholder="e.g. 1 year official"
              />
            </Field>
            <label className="text-sm flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
              />
              Show on homepage (featured)
            </label>
            <label className="text-sm flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.flashSaleActive}
                onChange={(e) => setForm({ ...form, flashSaleActive: e.target.checked })}
              />
              Flash sale (shows a countdown timer)
            </label>
            {form.flashSaleActive && (
              <Field label="Flash sale ends at">
                <Input
                  type="datetime-local"
                  value={form.flashSaleEndsAt}
                  onChange={(e) => setForm({ ...form, flashSaleEndsAt: e.target.value })}
                  required
                />
              </Field>
            )}
            {message && <p className="text-success text-sm">{message}</p>}
            <div className="flex gap-2">
              <Button type="submit">{editingId ? "Save changes" : "Add product"}</Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {products.map((p) => (
          <Card key={p._id}>
            <CardContent className="p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded bg-muted overflow-hidden flex-shrink-0">
                  {p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">৳{p.price} · stock {p.stock} · {p.category}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {p.stock <= 5 && <Badge variant="destructive" className="text-[10px]">low stock</Badge>}
                <button onClick={() => startEdit(p)} className="text-success text-xs hover:underline">Edit</button>
                {admin?.role === "admin" && (
                  <button onClick={() => handleDelete(p._id)} className="text-destructive text-xs hover:underline">Remove</button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="text-sm block">
      <span className="text-muted-foreground block mb-1">{label}</span>
      {children}
    </label>
  );
}
