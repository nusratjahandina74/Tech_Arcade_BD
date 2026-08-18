"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "../../../../lib/api.js";
import { useUser } from "../../../../context/UserContext.jsx";
import { Button } from "../../../../components/ui/button.jsx";
import { Input } from "../../../../components/ui/input.jsx";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { refresh } = useUser();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/register", form);
      await refresh();
      router.push("/account");
    } catch (err) {
      setError(err.response?.data?.message || "Could not create your account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto px-5 py-20">
      <h1 className="text-xl font-700 mb-6 text-center">Create an account</h1>
      <form onSubmit={handleSubmit} className="grid gap-3">
        <Input placeholder="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input type="email" placeholder="Email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input placeholder="Phone (01XXXXXXXXX)" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input type="password" placeholder="Password (min 6 characters)" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button type="submit" disabled={loading}>{loading ? "Creating account…" : "Create account"}</Button>
      </form>
      <p className="text-sm text-muted-foreground text-center mt-4">
        Already have an account?{" "}
        <Link href="/account/login" className="text-primary hover:underline">Log in</Link>
      </p>
    </div>
  );
}
