"use client";

import React, { useEffect, useState } from "react";
import api from "../../../../lib/api.js";
import { Card, CardContent } from "../../../../components/ui/card.jsx";
import { Button } from "../../../../components/ui/button.jsx";

export default function DeliveryPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.get("/orders/for-delivery").then((res) => setOrders(res.data.orders)).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function markDelivered(id) {
    await api.put(`/orders/${id}/mark-delivered`);
    load();
  }

  return (
    <div>
      <h1 className="text-xl font-700 mb-6">Out for delivery</h1>
      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="text-muted-foreground text-sm">No orders waiting for delivery right now.</p>
      ) : (
        <div className="grid gap-3">
          {orders.map((o) => (
            <Card key={o._id}>
              <CardContent className="p-4">
                <p className="font-mono text-sm text-primary">{o.orderNumber}</p>
                <p className="text-sm mt-1">{o.customer.name} · {o.customer.phone}</p>
                <p className="text-xs text-muted-foreground">{o.customer.address}, {o.customer.city}</p>
                <ul className="text-xs text-muted-foreground mt-2">
                  {o.items.map((it, i) => (
                    <li key={i}>{it.quantity} × {it.name}</li>
                  ))}
                </ul>
                <div className="flex items-center justify-between mt-3">
                  <span className="font-mono text-sm">
                    ৳{o.grandTotal} {o.paymentMethod === "cod" ? "(Collect on delivery)" : "(Prepaid)"}
                  </span>
                  <Button size="sm" onClick={() => markDelivered(o._id)}>Mark delivered</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
