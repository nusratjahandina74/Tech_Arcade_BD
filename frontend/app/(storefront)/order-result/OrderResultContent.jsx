"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import api from "../../../lib/api.js";

export default function OrderResultContent() {
  const params = useSearchParams();
  const status = params.get("status");
  const order = params.get("order");
  const isCod = params.get("cod") === "true";
  const method = params.get("method");
  const [whatsapp, setWhatsapp] = useState("");

  useEffect(() => {
    if (status === "pending") {
      api.get("/settings").then((res) => setWhatsapp(res.data.whatsappNumber || "")).catch(() => {});
    }
  }, [status]);

  const config = {
    success: {
      title: isCod ? "Order placed!" : "Payment successful!",
      body: isCod
        ? "Your order has been placed. Our team will call to confirm before delivery."
        : "Your payment was received and your order is confirmed.",
      color: "text-success",
      icon: "✓",
    },
    pending: {
      title: "Order received — verifying payment",
      body: `We've received your order and your ${
        method === "bkash_manual" ? "bKash" : "Nagad"
      } Transaction ID. Our team will verify it shortly and confirm your order.`,
      color: "text-primary",
      icon: "⏳",
    },
    fail: {
      title: "Payment failed",
      body: "The payment didn't go through and your items have been released back to stock. You can try again.",
      color: "text-destructive",
      icon: "✕",
    },
    cancel: {
      title: "Payment cancelled",
      body: "You cancelled the payment. Your items have been released back to stock.",
      color: "text-destructive",
      icon: "✕",
    },
  }[status] || {
    title: "Order status unknown",
    body: "We couldn't determine the order status. Please contact support with your order number.",
    color: "text-muted-foreground",
    icon: "?",
  };

  const waLink = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(
        `Hi, I just placed order #${order}. Please verify my payment and confirm the order.`
      )}`
    : null;

  return (
    <div className="max-w-md mx-auto px-5 py-24 text-center">
      <div className={`text-5xl ${config.color} mb-4 font-mono`}>{config.icon}</div>
      <h1 className="text-xl font-700 mb-2">{config.title}</h1>
      <p className="text-muted-foreground text-sm">{config.body}</p>
      {order && <p className="text-muted-foreground/70 text-xs mt-4 font-mono">Order #{order}</p>}

      {status === "pending" && waLink && (
        <a
          href={waLink}
          target="_blank"
          rel="noreferrer"
          className="inline-block mt-6 bg-success text-primary-foreground font-semibold px-5 py-2.5 rounded text-sm hover:opacity-90"
        >
          Notify us on WhatsApp
        </a>
      )}

      <div>
        <Link href="/shop" className="inline-block mt-8 border border-border px-5 py-2 rounded text-sm hover:border-primary">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
