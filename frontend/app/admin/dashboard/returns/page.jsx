"use client";

import React, { useEffect, useState } from "react";
import api from "../../../../lib/api.js";
import { Card, CardContent } from "../../../../components/ui/card.jsx";
import { Badge } from "../../../../components/ui/badge.jsx";
import { Button } from "../../../../components/ui/button.jsx";

export default function ReturnsPage() {
  const [claims, setClaims] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [noteDraft, setNoteDraft] = useState({});

  function load() {
    setLoading(true);
    api.get("/rma", { params: { status: filter || undefined } }).then((res) => setClaims(res.data.claims)).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function decide(id, status) {
    await api.put(`/rma/${id}/status`, { status, adminNote: noteDraft[id] || "" });
    load();
  }

  return (
    <div>
      <h1 className="text-xl font-700 mb-6">Returns & warranty claims</h1>

      <div className="flex gap-2 mb-5">
        {["pending", "approved", "rejected", ""].map((s) => (
          <button
            key={s || "all"}
            onClick={() => setFilter(s)}
            className={`text-xs border rounded-full px-3 py-1 capitalize ${
              filter === s ? "border-primary text-primary" : "border-border text-muted-foreground"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : claims.length === 0 ? (
        <p className="text-muted-foreground text-sm">No claims here.</p>
      ) : (
        <div className="grid gap-3">
          {claims.map((c) => (
            <Card key={c._id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="text-sm font-medium">
                    {c.productName} <Badge variant="outline" className="text-[10px] capitalize ml-1">{c.type}</Badge>
                  </p>
                  <Badge variant={c.status === "approved" ? "success" : c.status === "rejected" ? "destructive" : "outline"}>
                    {c.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Order {c.orderNumber} · {new Date(c.createdAt).toLocaleDateString()}</p>
                <p className="text-sm mt-2">{c.reason}</p>
                {c.images?.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {c.images.map((img, i) => (
                      <img key={i} src={img} alt="" className="w-16 h-16 object-cover rounded border border-border" />
                    ))}
                  </div>
                )}
                {c.video && (
                  <video src={c.video} controls className="w-40 h-28 rounded border border-border mt-2 object-cover" />
                )}

                {c.status === "pending" ? (
                  <div className="grid gap-2 mt-3">
                    <input
                      placeholder="Note (optional)"
                      value={noteDraft[c._id] || ""}
                      onChange={(e) => setNoteDraft({ ...noteDraft, [c._id]: e.target.value })}
                      className="bg-background border border-border rounded px-2 py-1.5 text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => decide(c._id, "approved")}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => decide(c._id, "rejected")}>Reject</Button>
                    </div>
                  </div>
                ) : (
                  c.adminNote && <p className="text-xs text-muted-foreground mt-2">Note: {c.adminNote}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
