"use client";

import React, { useState } from "react";
import { useCart } from "../context/CartContext.jsx";
import { Button } from "./ui/button.jsx";
import WishlistButton from "./WishlistButton.jsx";

export default function AddToCartBar({ product }) {
  const { addToCart } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  return (
    <div className="flex items-center gap-3 mt-6">
      {product.stock > 0 ? (
        <>
          <input
            type="number"
            min={1}
            max={product.stock}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Math.min(product.stock, Number(e.target.value))))}
            className="bg-card border border-border rounded-md px-3 py-2 w-20 text-sm"
          />
          <Button
            onClick={() => {
              addToCart(product, qty);
              setAdded(true);
              setTimeout(() => setAdded(false), 1500);
            }}
          >
            {added ? "Added ✓" : "Add to cart"}
          </Button>
        </>
      ) : (
        <p className="text-destructive font-medium">Out of stock</p>
      )}
      <WishlistButton productId={product._id} />
    </div>
  );
}
