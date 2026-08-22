"use client";

import React, { useState } from "react";
import Link from "next/link";
import api from "../../../../lib/api.js";
import { Button } from "../../../../components/ui/button.jsx";
import { Input } from "../../../../components/ui/input.jsx";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="max-w-sm mx-auto px-5 py-20 text-center">
        <h1 className="text-xl font-700 mb-3">Check your email</h1>
        <p className="text-sm text-muted-foreground">
          If an account exists for <strong>{email}</strong>, we've sent a password reset link. It expires in 30 minutes.
        </p>
        <Link href="/account/login" className="text-primary text-sm mt-6 inline-block hover:underline">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto px-5 py-20">
      <h1 className="text-xl font-700 mb-2 text-center">Forgot password</h1>
      <p className="text-sm text-muted-foreground text-center mb-6">
        Enter your account email and we'll send you a reset link.
      </p>
      <form onSubmit={handleSubmit} className="grid gap-3">
        <Input type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button type="submit" disabled={loading}>{loading ? "Sending…" : "Send reset link"}</Button>
      </form>
      <p className="text-sm text-muted-foreground text-center mt-4">
        <Link href="/account/login" className="text-primary hover:underline">Back to login</Link>
      </p>
    </div>
  );
}
