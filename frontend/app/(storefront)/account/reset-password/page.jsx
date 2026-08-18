"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import api from "../../../../lib/api.js";
import { Button } from "../../../../components/ui/button.jsx";
import { Input } from "../../../../components/ui/input.jsx";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const router = useRouter();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, newPassword });
      setDone(true);
      setTimeout(() => router.push("/account/login"), 2500);
    } catch (err) {
      setError(err.response?.data?.message || "Could not reset password.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="max-w-sm mx-auto px-5 py-20 text-center">
        <p className="text-destructive text-sm">This reset link is missing its token.</p>
        <Link href="/account/forgot-password" className="text-primary text-sm mt-4 inline-block hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="max-w-sm mx-auto px-5 py-20 text-center">
        <h1 className="text-xl font-700 mb-2">Password updated ✓</h1>
        <p className="text-sm text-muted-foreground">Redirecting you to login…</p>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto px-5 py-20">
      <h1 className="text-xl font-700 mb-6 text-center">Choose a new password</h1>
      <form onSubmit={handleSubmit} className="grid gap-3">
        <Input
          type="password"
          placeholder="New password"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Confirm new password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button type="submit" disabled={loading}>{loading ? "Updating…" : "Update password"}</Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={<div className="max-w-sm mx-auto px-5 py-20 text-center text-muted-foreground text-sm">Loading…</div>}>
      <ResetPasswordForm />
    </React.Suspense>
  );
}
