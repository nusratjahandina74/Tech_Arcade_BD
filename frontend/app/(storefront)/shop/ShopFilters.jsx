"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import api from "../../../lib/api.js";

const CATEGORIES = ["Mobile", "Laptop", "Accessories", "Audio", "Wearable", "Gaming", "Smart Home", "Other"];

export default function ShopFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const brand = searchParams.get("brand") || "";
  const warranty = searchParams.get("warranty") || "";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";

  const [options, setOptions] = useState({ brands: [], warranties: [], priceRange: { min: 0, max: 0 } });
  const [priceDraft, setPriceDraft] = useState({ min: minPrice, max: maxPrice });
  const [showMore, setShowMore] = useState(Boolean(brand || warranty || minPrice || maxPrice));

  useEffect(() => {
    api.get("/products/filters").then((res) => setOptions(res.data)).catch(() => {});
  }, []);

  function updateParam(updates) {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    next.set("page", "1");
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search products…"
          defaultValue={search}
          onKeyDown={(e) => e.key === "Enter" && updateParam({ search: e.currentTarget.value })}
          className="bg-card border border-border rounded-md px-3 py-2 text-sm flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <select
          value={category}
          onChange={(e) => updateParam({ category: e.target.value })}
          className="bg-card border border-border rounded-md px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="text-sm border border-border rounded-md px-3 py-2 text-muted-foreground hover:text-foreground"
        >
          {showMore ? "Fewer filters" : "More filters"}
        </button>
      </div>

      {showMore && (
        <div className="flex flex-wrap gap-3 mt-3 items-end">
          <select
            value={brand}
            onChange={(e) => updateParam({ brand: e.target.value })}
            className="bg-card border border-border rounded-md px-3 py-2 text-sm"
          >
            <option value="">All brands</option>
            {options.brands.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <select
            value={warranty}
            onChange={(e) => updateParam({ warranty: e.target.value })}
            className="bg-card border border-border rounded-md px-3 py-2 text-sm"
          >
            <option value="">Any warranty</option>
            {options.warranties.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>

          <div className="flex items-end gap-2">
            <label className="text-xs text-muted-foreground grid gap-1">
              Min ৳
              <input
                type="number"
                placeholder={String(options.priceRange.min ?? 0)}
                value={priceDraft.min}
                onChange={(e) => setPriceDraft({ ...priceDraft, min: e.target.value })}
                className="bg-card border border-border rounded-md px-2 py-1.5 text-sm w-24"
              />
            </label>
            <label className="text-xs text-muted-foreground grid gap-1">
              Max ৳
              <input
                type="number"
                placeholder={String(options.priceRange.max ?? 0)}
                value={priceDraft.max}
                onChange={(e) => setPriceDraft({ ...priceDraft, max: e.target.value })}
                className="bg-card border border-border rounded-md px-2 py-1.5 text-sm w-24"
              />
            </label>
            <button
              type="button"
              onClick={() => updateParam({ minPrice: priceDraft.min, maxPrice: priceDraft.max })}
              className="text-sm border border-border rounded-md px-3 py-2 hover:border-primary"
            >
              Go
            </button>
          </div>

          {(brand || warranty || minPrice || maxPrice) && (
            <button
              type="button"
              onClick={() => {
                setPriceDraft({ min: "", max: "" });
                updateParam({ brand: "", warranty: "", minPrice: "", maxPrice: "" });
              }}
              className="text-xs text-destructive hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
