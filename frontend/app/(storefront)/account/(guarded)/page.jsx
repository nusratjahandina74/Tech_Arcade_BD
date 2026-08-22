"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import api from "../../../../lib/api.js";
import { useUser } from "../../../../context/UserContext.jsx";
import { Card, CardContent } from "../../../../components/ui/card.jsx";

export default function AccountOverviewPage() {
  const { user } = useUser();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    api.get("/orders/mine").then((res) => setOrders(res.data.orders)).catch(() => {});
  }, []);

  const activeOrders = orders.filter((o) => !["delivered", "cancelled"].includes(o.orderStatus));

  return (
    <div className="grid gap-6">
      <h1 className="text-xl font-700">Account overview</h1>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total orders</p>
            <p className="text-2xl font-display font-700 mt-1">{orders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Active orders</p>
            <p className="text-2xl font-display font-700 mt-1">{activeOrders.length}</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-3">Account details</p>
        <Card>
          <CardContent className="p-5 text-sm grid gap-1">
            <p><span className="text-muted-foreground">Name:</span> {user.name}</p>
            <p><span className="text-muted-foreground">Email:</span> {user.email}</p>
            {user.phone && <p><span className="text-muted-foreground">Phone:</span> {user.phone}</p>}
          </CardContent>
        </Card>
      </div>

      <Link href="/account/orders" className="text-primary text-sm hover:underline">
        View order history →
      </Link>
    </div>
  );
}
