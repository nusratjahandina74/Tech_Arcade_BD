"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import api from "../lib/api.js";
import { useUser } from "../context/UserContext.jsx";
import { Button } from "./ui/button.jsx";

export default function WishlistButton({ productId }) {
  const { user, loading } = useUser();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    api
      .get("/users/me/wishlist")
      .then((res) => setSaved(res.data.products.some((p) => p._id === productId)))
      .catch(() => {});
  }, [user, productId]);

  async function toggle() {
    if (loading) return;
    if (!user) {
      router.push(`/account/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setBusy(true);
    try {
      if (saved) {
        await api.delete(`/users/me/wishlist/${productId}`);
        setSaved(false);
      } else {
        await api.post(`/users/me/wishlist/${productId}`);
        setSaved(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="icon" onClick={toggle} disabled={busy} aria-label="Toggle wishlist">
      <Heart className={`h-4 w-4 ${saved ? "fill-destructive text-destructive" : ""}`} />
    </Button>
  );
}
