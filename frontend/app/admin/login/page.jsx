"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../../lib/api.js";
import { Button } from "../../../components/ui/button.jsx";
import { Input } from "../../../components/ui/input.jsx";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      if (!["admin", "manager", "delivery"].includes(res.data.user?.role)) {
        await api.post("/auth/logout");
        setError("This account doesn't have admin access.");
        return;
      }
      router.push(res.data.user.role === "delivery" ? "/admin/dashboard/delivery" : "/admin/dashboard/overview");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-5">
      <div className="max-w-sm w-full">
        <h1 className="text-xl font-700 mb-6 text-center font-display">Tech Arcade BD admin</h1>
        <form onSubmit={handleSubmit} className="grid gap-3">
          <Input type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" disabled={loading}>{loading ? "Logging in…" : "Log in"}</Button>
        </form>
      </div>
    </div>
  );
}
