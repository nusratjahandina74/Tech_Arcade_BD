"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import api from "../../../../lib/api.js";
import { useUser } from "../../../../context/UserContext.jsx";
import { Button } from "../../../../components/ui/button.jsx";
import { Input } from "../../../../components/ui/input.jsx";

function PasswordLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useUser();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/login", { email, password });
      await refresh();
      router.push(searchParams.get("next") || "/account");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <Input type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" disabled={loading}>{loading ? "Logging in…" : "Log in"}</Button>
      <Link href="/account/forgot-password" className="text-xs text-muted-foreground hover:text-primary text-center">
        Forgot your password?
      </Link>
    </form>
  );
}

function OtpLoginForm() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("phone"); // "phone" | "code"
  const [devCode, setDevCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useUser();

  async function requestCode(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/otp/request", { phone });
      setDevCode(res.data.devCode || "");
      setStep("code");
    } catch (err) {
      setError(err.response?.data?.message || "Could not send code.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/otp/verify", { phone, code });
      await refresh();
      router.push(searchParams.get("next") || "/account");
    } catch (err) {
      setError(err.response?.data?.message || "Incorrect code.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "phone") {
    return (
      <form onSubmit={requestCode} className="grid gap-3">
        <Input
          placeholder="01XXXXXXXXX"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button type="submit" disabled={loading}>{loading ? "Sending…" : "Send code"}</Button>
      </form>
    );
  }

  return (
    <form onSubmit={verifyCode} className="grid gap-3">
      <p className="text-xs text-muted-foreground">
        4-digit code sent to {phone}.{" "}
        <button type="button" onClick={() => setStep("phone")} className="text-primary hover:underline">
          Change number
        </button>
      </p>
      {devCode && (
        <p className="text-xs text-primary bg-primary/10 rounded px-2 py-1">
          Dev mode — no SMS gateway configured yet, your code is: <strong>{devCode}</strong>
        </p>
      )}
      <Input
        placeholder="4-digit code"
        required
        maxLength={4}
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" disabled={loading}>{loading ? "Verifying…" : "Verify & log in"}</Button>
    </form>
  );
}

function LoginForm() {
  const [method, setMethod] = useState("password"); // "password" | "otp"

  return (
    <div className="max-w-sm mx-auto px-5 py-20">
      <h1 className="text-xl font-700 mb-6 text-center">Log in</h1>

      <div className="flex border border-border rounded-md p-1 mb-5 text-sm">
        <button
          type="button"
          onClick={() => setMethod("password")}
          className={`flex-1 py-1.5 rounded ${method === "password" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          Email
        </button>
        <button
          type="button"
          onClick={() => setMethod("otp")}
          className={`flex-1 py-1.5 rounded ${method === "otp" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          Phone (OTP)
        </button>
      </div>

      {method === "password" ? <PasswordLoginForm /> : <OtpLoginForm />}

      {method === "password" && (
        <p className="text-sm text-muted-foreground text-center mt-4">
          New here?{" "}
          <Link href="/account/register" className="text-primary hover:underline">Create an account</Link>
        </p>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="max-w-sm mx-auto px-5 py-20 text-center text-muted-foreground text-sm">Loading…</div>}>
      <LoginForm />
    </React.Suspense>
  );
}
