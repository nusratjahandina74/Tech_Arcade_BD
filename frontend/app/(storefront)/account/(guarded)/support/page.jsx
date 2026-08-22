"use client";

import React, { useEffect, useState } from "react";
import api from "../../../../../lib/api.js";
import { Card, CardContent } from "../../../../../components/ui/card.jsx";
import { Button } from "../../../../../components/ui/button.jsx";
import { Input } from "../../../../../components/ui/input.jsx";
import { Badge } from "../../../../../components/ui/badge.jsx";

function NewTicketForm({ onCreated }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post("/support", { subject, message });
      setSubject("");
      setMessage("");
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || "Could not open ticket.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm font-medium mb-3">Open a new ticket</p>
        <form onSubmit={handleSubmit} className="grid gap-3">
          <Input placeholder="Subject" required value={subject} onChange={(e) => setSubject(e.target.value)} />
          <textarea
            required
            rows={3}
            placeholder="Describe your issue…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="bg-background border border-border rounded-md px-3 py-2 text-sm"
          />
          {error && <p className="text-destructive text-xs">{error}</p>}
          <Button type="submit" size="sm" disabled={submitting} className="w-fit">
            {submitting ? "Sending…" : "Open ticket"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function TicketThread({ ticket, onReplied }) {
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function sendReply(e) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/support/${ticket._id}/reply`, { message: reply });
      setReply("");
      onReplied();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{ticket.subject}</p>
          <Badge variant={ticket.status === "resolved" ? "success" : ticket.status === "in_progress" ? "outline" : "secondary"} className="capitalize">
            {ticket.status.replace("_", " ")}
          </Badge>
        </div>
        <div className="grid gap-2 mt-3 max-h-64 overflow-y-auto">
          {ticket.messages.map((m, i) => (
            <div key={i} className={`text-sm p-2 rounded-md max-w-[85%] ${m.sender === "customer" ? "bg-primary/10 self-end ml-auto" : "bg-muted"}`}>
              <p className="text-xs text-muted-foreground mb-0.5">{m.senderName}</p>
              <p>{m.message}</p>
            </div>
          ))}
        </div>
        {ticket.status !== "resolved" && (
          <form onSubmit={sendReply} className="flex gap-2 mt-3">
            <input
              placeholder="Type a reply…"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              className="flex-1 bg-background border border-border rounded-md px-3 py-1.5 text-sm"
            />
            <Button type="submit" size="sm" disabled={submitting}>Send</Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function SupportPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  function load() {
    api.get("/support/mine").then((res) => setTickets(res.data.tickets)).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-700">Support</h1>
        <Button variant="outline" size="sm" onClick={() => setShowNew((v) => !v)}>
          {showNew ? "Cancel" : "New ticket"}
        </Button>
      </div>

      {showNew && (
        <NewTicketForm
          onCreated={() => {
            setShowNew(false);
            load();
          }}
        />
      )}

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : tickets.length === 0 ? (
        <p className="text-muted-foreground text-sm">No support tickets yet.</p>
      ) : (
        tickets.map((t) => <TicketThread key={t._id} ticket={t} onReplied={load} />)
      )}
    </div>
  );
}
