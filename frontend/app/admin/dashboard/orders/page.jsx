"use client";

import React, { useEffect, useState } from "react";
import api from "../../../../lib/api.js";

const STATUSES = ["placed", "confirmed", "processing", "shipped", "delivered", "cancelled"];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("");

  async function loadOrders() {
    const res = await api.get("/orders", { params: { status: filter || undefined, limit: 50 } });
    setOrders(res.data.orders);
  }

  useEffect(() => {
    loadOrders();
  }, [filter]);

  async function updateStatus(id, orderStatus) {
    await api.put(`/orders/${id}/status`, { orderStatus });
    loadOrders();
  }

  async function updatePaymentStatus(id, paymentStatus) {
    await api.put(`/orders/${id}/payment-status`, { paymentStatus });
    loadOrders();
  }

  return (
    <div>
      <select
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="bg-card border border-border rounded px-3 py-2 text-sm mb-5"
      >
        <option value="">All statuses</option>
        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>

      <div className="grid gap-3">
        {orders.map((o) => (
          <div key={o._id} className="border border-border rounded-md p-4">
            <div className="flex flex-wrap justify-between gap-2 mb-2">
              <p className="font-mono text-sm text-primary">{o.orderNumber}</p>
              <p className="text-xs text-foreground/50">{new Date(o.createdAt).toLocaleString()}</p>
            </div>
            <p className="text-sm">{o.customer.name} · {o.customer.phone}</p>
            <p className="text-xs text-foreground/50">{o.customer.address}, {o.customer.city}</p>
            <ul className="text-xs text-foreground/60 mt-2">
              {o.items.map((it, i) => (
                <li key={i}>{it.quantity} × {it.name} — ৳{it.price * it.quantity}</li>
              ))}
            </ul>

            {(o.paymentMethod === "bkash_manual" || o.paymentMethod === "nagad_manual") && (
              <div className="mt-2 text-xs bg-background border border-border rounded px-3 py-2">
                <p>
                  {o.paymentMethod === "bkash_manual" ? "bKash" : "Nagad"} sent from{" "}
                  <span className="font-mono text-foreground">{o.manualPayment?.senderNumber}</span>
                </p>
                <p>
                  TrxID: <span className="font-mono text-primary">{o.manualPayment?.trxId}</span>
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-border">
              <div className="text-sm">
                <span className="text-foreground/50">Total: </span>
                <span className="font-mono text-primary">৳{o.grandTotal}</span>
                <span className="text-foreground/40 ml-2">
                  ({o.paymentMethod === "cod" ? "COD" : o.paymentMethod === "sslcommerz" ? "SSLCommerz" : o.paymentMethod === "bkash_manual" ? "bKash" : "Nagad"}
                  {" — "}
                  {o.paymentStatus})
                </span>
              </div>

              <div className="flex items-center gap-2">
                {(o.paymentMethod === "bkash_manual" || o.paymentMethod === "nagad_manual") &&
                  o.paymentStatus === "pending" && (
                    <>
                      <button
                        onClick={() => updatePaymentStatus(o._id, "paid")}
                        className="text-success text-xs border border-success/40 rounded px-2 py-1 hover:bg-success/10"
                      >
                        Verify payment
                      </button>
                      <button
                        onClick={() => updatePaymentStatus(o._id, "failed")}
                        className="text-destructive text-xs border border-destructive/40 rounded px-2 py-1 hover:bg-destructive/10"
                      >
                        Reject
                      </button>
                    </>
                  )}
                <select
                  value={o.orderStatus}
                  onChange={(e) => updateStatus(o._id, e.target.value)}
                  className="bg-card border border-border rounded px-2 py-1 text-xs"
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
        ))}
        {orders.length === 0 && <p className="text-foreground/50 text-sm">No orders yet.</p>}
      </div>
    </div>
  );
}
