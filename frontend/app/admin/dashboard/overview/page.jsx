"use client";

import React, { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Wallet, ShoppingCart, Clock, PackageX } from "lucide-react";
import api from "../../../../lib/api.js";
import { Card, CardHeader, CardTitle, CardContent } from "../../../../components/ui/card.jsx";
import { Badge } from "../../../../components/ui/badge.jsx";

const STATUS_COLORS = {
  placed: "#94a3b8",
  confirmed: "#3E8989",
  processing: "#E0A458",
  shipped: "#6366f1",
  delivered: "#22c55e",
  cancelled: "#D96C5F",
};

export default function AdminOverview() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/orders/stats").then((res) => setStats(res.data));
  }, []);

  if (!stats) return <p className="text-muted-foreground text-sm">Loading dashboard…</p>;

  const cards = [
    { label: "Total revenue", value: `৳${stats.totalRevenue.toLocaleString()}`, icon: Wallet, sub: `${stats.paidOrders} paid orders` },
    { label: "Total orders", value: stats.totalOrders, icon: ShoppingCart, sub: "all time" },
    { label: "Awaiting payment verification", value: stats.pendingPayments, icon: Clock, sub: "bKash / Nagad" },
    { label: "Low stock items", value: stats.lowStock.length, icon: PackageX, sub: "5 or fewer left" },
  ];

  return (
    <div className="grid gap-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, sub }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>{label}</CardTitle>
              <Icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-2xl font-display font-700">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-foreground text-base font-display font-600">Revenue — last 14 days</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 h-72">
            {stats.revenueByDay.length === 0 ? (
              <p className="text-muted-foreground text-sm">No paid orders yet in this period.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.revenueByDay}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E0A458" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#E0A458" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} width={40} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v, name) => [name === "revenue" ? `৳${v}` : v, name === "revenue" ? "Revenue" : "Orders"]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#E0A458" fill="url(#revFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-foreground text-base font-display font-600">Orders by status</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 h-72 flex flex-col items-center justify-center">
            {stats.ordersByStatus.length === 0 ? (
              <p className="text-muted-foreground text-sm">No orders yet.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={stats.ordersByStatus}
                      dataKey="count"
                      nameKey="status"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                    >
                      {stats.ordersByStatus.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#999"} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {stats.ordersByStatus.map((s) => (
                    <span key={s.status} className="text-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[s.status] || "#999" }} />
                      {s.status} ({s.count})
                    </span>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground text-base font-display font-600">Recent orders</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 grid gap-3">
            {stats.recentOrders.length === 0 && <p className="text-muted-foreground text-sm">No orders yet.</p>}
            {stats.recentOrders.map((o) => (
              <div key={o._id} className="flex items-center justify-between text-sm border-b border-border last:border-0 pb-2 last:pb-0">
                <div>
                  <p className="font-mono text-xs text-primary">{o.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">{o.customer.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono">৳{o.grandTotal}</p>
                  <Badge variant="outline" className="text-[10px]">{o.orderStatus}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-foreground text-base font-display font-600">Low stock</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 grid gap-3">
            {stats.lowStock.length === 0 && <p className="text-muted-foreground text-sm">Everything is well stocked.</p>}
            {stats.lowStock.map((p) => (
              <div key={p._id} className="flex items-center justify-between text-sm border-b border-border last:border-0 pb-2 last:pb-0">
                <span>{p.name}</span>
                <Badge variant={p.stock === 0 ? "destructive" : "outline"}>{p.stock} left</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
