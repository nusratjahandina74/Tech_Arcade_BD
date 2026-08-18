import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "./ui/badge.jsx";
import FlashSaleTimer from "./FlashSaleTimer.jsx";

export default function ProductCard({ product }) {
  const hasDiscount = product.discountPrice && product.discountPrice < product.price;
  const isFlashSale = product.flashSale?.active && product.flashSale?.endsAt && new Date(product.flashSale.endsAt) > new Date();
  const lowStock = product.stock > 0 && product.stock <= 5;

  return (
    <Link
      href={`/product/${product.slug}`}
      className="chip-card p-4 flex flex-col gap-3 hover:border-primary hover:shadow-md transition-all group"
    >
      <div className="aspect-square bg-muted rounded overflow-hidden relative">
        {product.images?.[0] ? (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 45vw, 220px"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
            No image
          </span>
        )}
      </div>
      <div>
        <p className="text-xs text-success font-mono uppercase tracking-wider">{product.category}</p>
        <h3 className="text-sm font-medium leading-snug mt-1 line-clamp-2">{product.name}</h3>
      </div>
      <div className="mt-auto flex items-baseline gap-2">
        {hasDiscount ? (
          <>
            <span className="text-primary font-mono font-semibold">৳{product.discountPrice}</span>
            <span className="text-muted-foreground text-xs line-through">৳{product.price}</span>
          </>
        ) : (
          <span className="text-primary font-mono font-semibold">৳{product.price}</span>
        )}
      </div>
      {product.stock <= 0 && <Badge variant="destructive" className="w-fit">Out of stock</Badge>}
      {lowStock && <Badge variant="destructive" className="w-fit">Only {product.stock} left!</Badge>}
      {isFlashSale && <FlashSaleTimer endsAt={product.flashSale.endsAt} compact />}
    </Link>
  );
}
