"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCart } from "../../../context/CartContext.jsx";
import { Button } from "../../../components/ui/button.jsx";

export default function CartPage() {
  const { items, updateQuantity, removeFromCart, subtotal } = useCart();
  const router = useRouter();

  if (items.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-5 py-20 text-center">
        <p className="text-muted-foreground">Your cart is empty.</p>
        <Link href="/shop" className="text-primary text-sm mt-3 inline-block">Browse products</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <h1 className="text-2xl font-700 mb-8">Your cart</h1>

      <div className="divide-y divide-border border border-border rounded-md">
        {items.map((item) => (
          <div key={item.productId} className="flex items-center gap-4 p-4">
            <div className="w-16 h-16 bg-muted rounded overflow-hidden flex-shrink-0 relative">
              {item.image && <Image src={item.image} alt={item.name} fill sizes="64px" className="object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.name}</p>
              <p className="text-primary font-mono text-sm">৳{item.price}</p>
            </div>
            <input
              type="number"
              min={1}
              max={item.stock}
              value={item.quantity}
              onChange={(e) => updateQuantity(item.productId, Math.max(1, Number(e.target.value)))}
              className="bg-card border border-border rounded px-2 py-1 w-16 text-sm text-center"
            />
            <button onClick={() => removeFromCart(item.productId)} className="text-destructive text-xs hover:underline">
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mt-6 text-lg">
        <span className="text-muted-foreground">Subtotal</span>
        <span className="font-mono font-bold text-primary">৳{subtotal}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">Delivery fee is calculated at checkout based on your city.</p>

      <Button onClick={() => router.push("/checkout")} className="w-full mt-6" size="lg">
        Proceed to checkout
      </Button>
    </div>
  );
}
