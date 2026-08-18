"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, User } from "lucide-react";
import { useCart } from "../context/CartContext.jsx";
import { useUser } from "../context/UserContext.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import { cn } from "../lib/utils.js";

export default function Navbar() {
  const { itemCount, openCart } = useCart();
  const { user, loading } = useUser();
  const pathname = usePathname();

  const linkClass = (href, exact = false) =>
    cn(
      "text-sm font-medium tracking-wide transition-colors hover:text-primary",
      (exact ? pathname === href : pathname.startsWith(href)) ? "text-primary" : "text-foreground/70"
    );

  return (
    <header className="border-b border-border sticky top-0 z-40 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link href="/" className="font-display font-800 text-lg flex items-center gap-2">
          <span className="text-primary">▣</span>
          <span>TechArcade</span>
        </Link>
        <nav className="hidden sm:flex items-center gap-7">
          <Link href="/" className={linkClass("/", true)}>Home</Link>
          <Link href="/shop" className={linkClass("/shop")}>Shop</Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {!loading && (
            <Link
              href={user ? "/account" : "/account/login"}
              className="hidden sm:flex border border-border rounded-md h-10 px-3 items-center gap-1.5 text-sm hover:border-primary transition-colors"
            >
              <User className="h-4 w-4" />
              {user ? user.name?.split(" ")[0] : "Login"}
            </Link>
          )}
          <button
            onClick={openCart}
            className="relative border border-border rounded-md h-10 px-3 flex items-center gap-1.5 text-sm hover:border-primary transition-colors"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Cart</span>
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
