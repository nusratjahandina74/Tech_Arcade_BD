"use client";

import React, { useEffect, useState } from "react";
import api from "../../../../lib/api.js";
import { useAdmin } from "../../../../context/AdminContext.jsx";
import { Card, CardContent } from "../../../../components/ui/card.jsx";
import { Badge } from "../../../../components/ui/badge.jsx";

const ACTION_LABELS = {
  "order.payment.approve": "Approved payment",
  "order.payment.reject": "Rejected payment",
  "order.payment.resubmit": "Customer resubmitted payment",
  "order.status.update": "Updated order status",
  "product.create": "Created product",
  "product.update": "Updated product",
  "product.delete": "Removed product",
  "settings.update": "Updated payment settings",
  "team.member.create": "Added team member",
  "team.member.remove": "Removed team member",
};

export default function AuditLogPage() {
  const admin = useAdmin();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/audit-logs", { params: { limit: 50 } }).then((res) => setLogs(res.data.logs)).finally(() => setLoading(false));
  }, []);

  if (admin && admin.role !== "admin") {
    return <p className="text-muted-foreground text-sm">Only the owner account can view the audit log.</p>;
  }

  return (
    <div>
      <h1 className="text-xl font-700 mb-6">Audit log</h1>
      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : logs.length === 0 ? (
        <p className="text-muted-foreground text-sm">No activity recorded yet.</p>
      ) : (
        <div className="grid gap-2">
          {logs.map((log) => (
            <Card key={log._id}>
              <CardContent className="p-3 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p>
                    <span className="font-medium">{log.actorName}</span>{" "}
                    <Badge variant="outline" className="text-[10px] capitalize mx-1">{log.actorRole}</Badge>
                    {ACTION_LABELS[log.action] || log.action}
                    {log.meta?.orderNumber && <span className="text-muted-foreground"> — {log.meta.orderNumber}</span>}
                    {log.meta?.name && <span className="text-muted-foreground"> — {log.meta.name}</span>}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
