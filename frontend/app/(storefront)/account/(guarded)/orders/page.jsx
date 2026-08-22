"use client";

import React, { useEffect, useState } from "react";
import api from "../../../../../lib/api.js";
import { Card, CardContent } from "../../../../../components/ui/card.jsx";
import { Badge } from "../../../../../components/ui/badge.jsx";
import { Button } from "../../../../../components/ui/button.jsx";
import ImageUploader from "../../../../../components/ImageUploader.jsx";
import VideoUploader from "../../../../../components/VideoUploader.jsx";

const TIMELINE_STEPS = ["placed", "confirmed", "processing", "shipped", "delivered"];

function OrderTimeline({ order }) {
  if (order.orderStatus === "cancelled") {
    return <Badge variant="destructive">Cancelled</Badge>;
  }
  const currentIndex = TIMELINE_STEPS.indexOf(order.orderStatus);
  return (
    <div className="flex items-center gap-1 mt-3">
      {TIMELINE_STEPS.map((step, i) => (
        <React.Fragment key={step}>
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                i <= currentIndex ? "bg-primary" : "bg-muted"
              }`}
            />
            <span className={`text-[10px] capitalize ${i <= currentIndex ? "text-foreground" : "text-muted-foreground"}`}>
              {step}
            </span>
          </div>
          {i < TIMELINE_STEPS.length - 1 && (
            <div className={`flex-1 h-[2px] mb-4 ${i < currentIndex ? "bg-primary" : "bg-muted"}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function ResubmitForm({ order, onDone }) {
  const [trxId, setTrxId] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.put(`/orders/${order._id}/resubmit-payment`, { trxId, senderNumber });
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || "Could not resubmit.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 border border-destructive/40 rounded-md p-3 grid gap-2 bg-destructive/5">
      <p className="text-xs text-destructive">
        Payment rejected{order.manualPayment?.rejectionReason ? `: ${order.manualPayment.rejectionReason}` : ""}. Enter the
        correct Transaction ID to try again.
      </p>
      <div className="grid sm:grid-cols-2 gap-2">
        <input
          placeholder="Sender number"
          required
          value={senderNumber}
          onChange={(e) => setSenderNumber(e.target.value)}
          className="bg-card border border-border rounded px-2 py-1.5 text-sm"
        />
        <input
          placeholder="Transaction ID"
          required
          value={trxId}
          onChange={(e) => setTrxId(e.target.value)}
          className="bg-card border border-border rounded px-2 py-1.5 text-sm"
        />
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
      <Button type="submit" size="sm" disabled={submitting} className="w-fit">
        {submitting ? "Submitting…" : "Resubmit payment"}
      </Button>
    </form>
  );
}

function RmaForm({ order, item, onDone, onCancel }) {
  const [type, setType] = useState("return");
  const [reason, setReason] = useState("");
  const [images, setImages] = useState([]);
  const [video, setVideo] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post("/rma", {
        orderId: order._id,
        productId: item.product,
        type,
        reason,
        images,
        video,
      });
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || "Could not submit claim.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 border border-border rounded-md p-3 grid gap-2 bg-muted/30">
      <p className="text-xs font-medium">Claim for: {item.name}</p>
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="bg-card border border-border rounded px-2 py-1.5 text-sm w-fit"
      >
        <option value="return">Return</option>
        <option value="warranty">Warranty claim</option>
      </select>
      <textarea
        required
        rows={2}
        placeholder="Describe the issue…"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="bg-card border border-border rounded px-2 py-1.5 text-sm"
      />
      <ImageUploader images={images} onChange={setImages} />
      <VideoUploader video={video} onChange={setVideo} />
      {error && <p className="text-destructive text-xs">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={submitting}>{submitting ? "Submitting…" : "Submit claim"}</Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

export default function AccountOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState([]);
  const [claimingItem, setClaimingItem] = useState(null); // { orderId, productId }

  function load() {
    Promise.all([api.get("/orders/mine"), api.get("/rma/mine")])
      .then(([ordersRes, claimsRes]) => {
        setOrders(ordersRes.data.orders);
        setClaims(claimsRes.data.claims);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <p className="text-muted-foreground text-sm">Loading orders…</p>;
  if (orders.length === 0) return <p className="text-muted-foreground text-sm">You haven't placed any orders yet.</p>;

  function claimFor(orderId, productId) {
    return claims.find((c) => String(c.order) === String(orderId) && String(c.product) === String(productId));
  }

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-700">Order history</h1>
      {orders.map((o) => (
        <Card key={o._id}>
          <CardContent className="p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <p className="font-mono text-sm text-primary">{o.orderNumber}</p>
              <p className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</p>
            </div>
            <ul className="text-xs text-muted-foreground mt-2 grid gap-1">
              {o.items.map((it, i) => {
                const claim = o.orderStatus === "delivered" ? claimFor(o._id, it.product) : null;
                const isClaiming = claimingItem?.orderId === o._id && claimingItem?.productId === it.product;
                return (
                  <li key={i} className="flex items-center justify-between gap-2">
                    <span>{it.quantity} × {it.name}</span>
                    {o.orderStatus === "delivered" && (
                      claim ? (
                        <Badge
                          variant={claim.status === "approved" ? "success" : claim.status === "rejected" ? "destructive" : "outline"}
                          className="text-[10px]"
                        >
                          {claim.type} {claim.status}
                        </Badge>
                      ) : (
                        !isClaiming && (
                          <button
                            onClick={() => setClaimingItem({ orderId: o._id, productId: it.product })}
                            className="text-primary text-[11px] hover:underline flex-shrink-0"
                          >
                            Claim return/warranty
                          </button>
                        )
                      )
                    )}
                  </li>
                );
              })}
            </ul>

            {claimingItem?.orderId === o._id && (
              <RmaForm
                order={o}
                item={o.items.find((it) => it.product === claimingItem.productId)}
                onDone={() => {
                  setClaimingItem(null);
                  load();
                }}
                onCancel={() => setClaimingItem(null)}
              />
            )}

            <div className="flex items-center justify-between mt-2">
              <span className="font-mono text-sm">৳{o.grandTotal}</span>
              <Badge variant={o.paymentStatus === "paid" ? "success" : o.paymentStatus === "failed" ? "destructive" : "outline"}>
                {o.paymentStatus}
              </Badge>
            </div>

            <OrderTimeline order={o} />

            {o.paymentStatus === "failed" && (o.paymentMethod === "bkash_manual" || o.paymentMethod === "nagad_manual") && (
              <ResubmitForm order={o} onDone={load} />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
