"use client";

import React, { useEffect, useState } from "react";
import api from "../../../../../lib/api.js";
import ProductCard from "../../../../../components/ProductCard.jsx";

export default function WishlistPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/users/me/wishlist").then((res) => setProducts(res.data.products)).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-muted-foreground text-sm">Loading wishlist…</p>;

  return (
    <div>
      <h1 className="text-xl font-700 mb-6">Wishlist</h1>
      {products.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No items saved yet. Open a product and tap the heart icon to save it here.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
          {products.map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
