"use client";

import React, { useEffect, useState } from "react";
import api from "../../../../lib/api.js";
import { useAdmin } from "../../../../context/AdminContext.jsx";
import { Card, CardContent } from "../../../../components/ui/card.jsx";
import { Button } from "../../../../components/ui/button.jsx";
import { Input } from "../../../../components/ui/input.jsx";
import { Badge } from "../../../../components/ui/badge.jsx";

const EMPTY = { name: "", email: "", password: "", role: "manager" };

export default function TeamPage() {
  const admin = useAdmin();
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    api.get("/team").then((res) => setMembers(res.data.members)).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  if (admin && admin.role !== "admin") {
    return <p className="text-muted-foreground text-sm">Only the owner account can manage the team.</p>;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    try {
      await api.post("/team", form);
      setForm(EMPTY);
      setMessage("Account created.");
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not create account.");
    }
  }

  async function handleRemove(id) {
    if (!confirm("Remove this team member's access?")) return;
    await api.delete(`/team/${id}`);
    load();
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="h-fit">
        <CardContent className="p-5">
          <p className="text-sm font-medium mb-3">Add a team member</p>
          <form onSubmit={handleSubmit} className="grid gap-3">
            <Input placeholder="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input type="email" placeholder="Email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input type="password" placeholder="Temporary password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="h-10 bg-background border border-input rounded-md px-3 text-sm"
            >
              <option value="manager">Manager — can process orders, verify payments</option>
              <option value="admin">Admin — full access including payment settings</option>
            </select>
            {message && <p className="text-xs text-muted-foreground">{message}</p>}
            <Button type="submit" className="w-fit">Create account</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {loading && <p className="text-muted-foreground text-sm">Loading…</p>}
        {members.map((m) => (
          <Card key={m._id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{m.name}</p>
                <p className="text-xs text-muted-foreground">{m.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={m.role === "admin" ? "default" : "secondary"} className="capitalize">{m.role}</Badge>
                <button onClick={() => handleRemove(m._id)} className="text-destructive text-xs hover:underline">Remove</button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
