import { Suspense } from "react";
import Link from "next/link";
import api from "../../../lib/api.js";
import ProductCard from "../../../components/ProductCard.jsx";
import ShopFilters from "./ShopFilters.jsx";

export const metadata = {
  title: "Shop all products — TechArcade",
  description: "Browse genuine electronics and gadgets — mobiles, laptops, audio, wearables, and more.",
};

async function getProducts(params) {
  const res = await api.get("/products", { params: { ...params, page: params.page || "1", limit: 12 } });
  return res.data;
}

export default async function ShopPage({ searchParams }) {
  const params = await searchParams;
  const {
    search = "",
    category = "",
    brand = "",
    warranty = "",
    minPrice = "",
    maxPrice = "",
    page = "1",
    featured = "",
  } = params || {};

  const { products, pages } = await getProducts({ search, category, brand, warranty, minPrice, maxPrice, page, featured });
  const currentPage = Number(page) || 1;

  function pageHref(p) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (brand) params.set("brand", brand);
    if (warranty) params.set("warranty", warranty);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    params.set("page", String(p));
    return `/shop?${params.toString()}`;
  }

  return (
    <div className="max-w-6xl mx-auto px-5 py-10">
      <h1 className="text-2xl font-700 mb-6">Shop all products</h1>

      <Suspense fallback={<div className="h-[42px] mb-8" />}>
        <ShopFilters />
      </Suspense>

      {products.length === 0 ? (
        <p className="text-muted-foreground text-sm">No products match your search.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {products.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
          {pages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={pageHref(p)}
                  className={`w-8 h-8 rounded text-sm border flex items-center justify-center ${
                    p === currentPage ? "border-primary text-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  {p}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
