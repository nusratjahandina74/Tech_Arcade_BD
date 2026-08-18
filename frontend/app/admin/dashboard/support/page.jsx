"use client";

import React, { useEffect, useState } from "react";
import api from "../../../../lib/api.js";
import { Card, CardContent } from "../../../../components/ui/card.jsx";
import { Badge } from "../../../../components/ui/badge.jsx";
import { Button } from "../../../../components/ui/button.jsx";

function TicketCard({ ticket, onChanged }) {
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function sendReply(e) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/support/${ticket._id}/reply`, { message: reply });
      setReply("");
      onChanged();
    } finally {
      setSubmitting(false);
    }
  }

  async function setStatus(status) {
    await api.put(`/support/${ticket._id}/status`, { status });
    onChanged();
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{ticket.subject}</p>
          <Badge variant={ticket.status === "resolved" ? "success" : ticket.status === "in_progress" ? "outline" : "secondary"} className="capitalize">
            {ticket.status.replace("_", " ")}
          </Badge>
        </div>
        <div className="grid gap-2 mt-3 max-h-56 overflow-y-auto">
          {ticket.messages.map((m, i) => (
            <div key={i} className={`text-sm p-2 rounded-md max-w-[85%] ${m.sender === "staff" ? "bg-primary/10 self-end ml-auto" : "bg-muted"}`}>
              <p className="text-xs text-muted-foreground mb-0.5">{m.senderName}</p>
              <p>{m.message}</p>
            </div>
          ))}
        </div>
        <form onSubmit={sendReply} className="flex gap-2 mt-3">
          <input
            placeholder="Reply to customer…"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            className="flex-1 bg-background border border-border rounded-md px-3 py-1.5 text-sm"
          />
          <Button type="submit" size="sm" disabled={submitting}>Send</Button>
        </form>
        {ticket.status !== "resolved" && (
          <button onClick={() => setStatus("resolved")} className="text-success text-xs hover:underline mt-2">
            Mark resolved
          </button>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.get("/support", { params: { status: filter || undefined } }).then((res) => setTickets(res.data.tickets)).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <div>
      <h1 className="text-xl font-700 mb-6">Support tickets</h1>
      <div className="flex gap-2 mb-5">
        {["", "open", "in_progress", "resolved"].map((s) => (
          <button
            key={s || "all"}
            onClick={() => setFilter(s)}
            className={`text-xs border rounded-full px-3 py-1 capitalize ${
              filter === s ? "border-primary text-primary" : "border-border text-muted-foreground"
            }`}
          >
            {s ? s.replace("_", " ") : "All"}
          </button>
        ))}
      </div>
      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : tickets.length === 0 ? (
        <p className="text-muted-foreground text-sm">No tickets.</p>
      ) : (
        <div className="grid gap-3">
          {tickets.map((t) => (
            <TicketCard key={t._id} ticket={t} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}
