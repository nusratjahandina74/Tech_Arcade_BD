"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

const CartContext = createContext(null);

const STORAGE_KEY = "ta_cart";

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  // Load cart from localStorage after hydration
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (raw) {
        const savedItems = JSON.parse(raw);

        if (Array.isArray(savedItems)) {
          setItems(savedItems);
        }
      }
    } catch {
      setItems([]);
    } finally {
      setCartLoaded(true);
    }
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    if (!cartLoaded) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore localStorage errors
    }
  }, [items, cartLoaded]);

  function addToCart(product, quantity = 1) {
    if (!product?._id || !product.stock || product.stock <= 0) {
      return;
    }

    const requestedQuantity = Math.max(1, Number(quantity) || 1);

    setItems((prev) => {
      const existing = prev.find(
        (i) => i.productId === product._id
      );

      if (existing) {
        const newQuantity = Math.min(
          existing.quantity + requestedQuantity,
          product.stock
        );

        return prev.map((i) =>
          i.productId === product._id
            ? {
                ...i,
                quantity: newQuantity,
                stock: product.stock,
                price:
                  product.discountPrice ?? product.price,
                image: product.images?.[0] || i.image || "",
                name: product.name,
              }
            : i
        );
      }

      const safeQuantity = Math.min(
        requestedQuantity,
        product.stock
      );

      return [
        ...prev,
        {
          productId: product._id,
          name: product.name,
          price: product.discountPrice ?? product.price,
          image: product.images?.[0] || "",
          quantity: safeQuantity,
          stock: product.stock,
        },
      ];
    });

    setDrawerOpen(true);
  }

  function updateQuantity(productId, quantity) {
    setItems((prev) =>
      prev
        .map((i) => {
          if (i.productId !== productId) {
            return i;
          }

          const requestedQuantity = Number(quantity) || 0;

          const newQuantity = Math.min(
            Math.max(requestedQuantity, 0),
            i.stock
          );

          return {
            ...i,
            quantity: newQuantity,
          };
        })
        .filter((i) => i.quantity > 0)
    );
  }

  function removeFromCart(productId) {
    setItems((prev) =>
      prev.filter((i) => i.productId !== productId)
    );
  }

  function clearCart() {
    setItems([]);
  }

  const itemCount = items.reduce(
    (sum, i) => sum + i.quantity,
    0
  );

  const subtotal = items.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        itemCount,
        subtotal,
        isDrawerOpen,
        openCart: () => setDrawerOpen(true),
        closeCart: () => setDrawerOpen(false),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);

  if (!ctx) {
    throw new Error(
      "useCart must be used within CartProvider"
    );
  }

  return ctx;
}

