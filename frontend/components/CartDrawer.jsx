"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { X, ShoppingBag } from "lucide-react";
import { useCart } from "../context/CartContext.jsx";
import { Button } from "./ui/button.jsx";

export default function CartDrawer() {
  const { items, isDrawerOpen, closeCart, updateQuantity, removeFromCart, subtotal } = useCart();

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeCart}
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${
          isDrawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-card border-l border-border z-50 flex flex-col transition-transform duration-300 ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Shopping cart"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <p className="font-display font-700 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" /> Your cart
          </p>
          <button onClick={closeCart} aria-label="Close cart">
            <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-muted-foreground text-sm">Your cart is empty.</p>
            <Link href="/shop" onClick={closeCart} className="text-primary text-sm hover:underline">
              Browse products
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 grid gap-4">
              {items.map((item) => (
                <div key={item.productId} className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-muted rounded overflow-hidden flex-shrink-0 relative">
                    {item.image && <Image src={item.image} alt={item.name} fill sizes="56px" className="object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-primary font-mono text-xs">৳{item.price}</p>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={item.stock}
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.productId, Math.max(1, Number(e.target.value)))}
                    className="bg-background border border-border rounded px-1.5 py-1 w-14 text-xs text-center"
                  />
                  <button onClick={() => removeFromCart(item.productId)} aria-label="Remove item">
                    <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-border grid gap-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono font-bold text-primary">৳{subtotal}</span>
              </div>
              <Link href="/checkout" onClick={closeCart}>
                <Button className="w-full">Checkout</Button>
              </Link>
              <Link href="/cart" onClick={closeCart} className="text-xs text-muted-foreground hover:text-foreground text-center">
                View full cart
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}
