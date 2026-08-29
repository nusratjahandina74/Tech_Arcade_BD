"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "../../../lib/api.js";
import { useCart } from "../../../context/CartContext.jsx";
import { Button } from "../../../components/ui/button.jsx";

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
  });

  const [paymentMethod, setPaymentMethod] = useState("");
  const [manualPayment, setManualPayment] = useState({
    senderNumber: "",
    trxId: "",
  });

  const [settings, setSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  useEffect(() => {
    let mounted = true;

    api
      .get("/settings")
      .then((res) => {
        if (!mounted) return;

        const data = res.data;
        setSettings(data);

        // Select the first available payment method
        if (data?.bkashNumber) {
          setPaymentMethod("bkash_manual");
        } else if (data?.nagadNumber) {
          setPaymentMethod("nagad_manual");
        } else if (data?.codEnabled !== false) {
          setPaymentMethod("cod");
        } else {
          setPaymentMethod("");
        }
      })
      .catch(() => {
        if (mounted) {
          setSettings(null);
          setPaymentMethod("");
        }
      })
      .finally(() => {
        if (mounted) {
          setSettingsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const isManual =
    paymentMethod === "bkash_manual" ||
    paymentMethod === "nagad_manual";

  if (items.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-5 py-20 text-center">
        <p className="text-muted-foreground">Your cart is empty.</p>

        <Link
          href="/shop"
          className="text-primary text-sm mt-3 inline-block"
        >
          Browse products
        </Link>
      </div>
    );
  }

  const deliveryFee = settings
    ? /dhaka/i.test(form.city)
      ? Number(settings.insideDhakaFee) || 0
      : form.city
        ? Number(settings.outsideDhakaFee) || 0
        : 0
    : 0;

  const discountAmount = Math.min(
    Math.max(0, Number(coupon?.discountAmount) || 0),
    Number(subtotal) || 0
  );

  const grandTotal = Math.max(
    0,
    (Number(subtotal) || 0) + deliveryFee - discountAmount
  );

  // Revalidate coupon whenever cart total or delivery location changes.
  useEffect(() => {
    setCoupon(null);
    setCouponError("");
  }, [subtotal, form.city]);

  async function applyCoupon() {
    setCouponError("");
    setCoupon(null);

    const code = couponInput.trim();

    if (!code) return;

    if (!subtotal || subtotal <= 0) {
      setCouponError("Your cart subtotal is not valid.");
      return;
    }

    setCheckingCoupon(true);

    try {
      const res = await api.post("/coupons/validate", {
        code,
        subtotal,
        phone: form.phone.trim() || undefined,
      });

      const discount = Math.min(
        Math.max(0, Number(res.data?.discountAmount) || 0),
        Number(subtotal) || 0
      );

      setCoupon({
        code: code.toUpperCase(),
        discountAmount: discount,
      });
    } catch (err) {
      setCouponError(
        err.response?.data?.message || "Invalid coupon."
      );
    } finally {
      setCheckingCoupon(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (submitting) return;

    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    if (!form.name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!form.phone.trim()) {
      setError("Please enter your phone number.");
      return;
    }

    if (!/^(?:\+?8801|01)\d{9}$/.test(form.phone.trim())) {
      setError("Please enter a valid Bangladesh phone number.");
      return;
    }

    if (!form.address.trim()) {
      setError("Please enter your delivery address.");
      return;
    }

    if (!form.city.trim()) {
      setError("Please enter your city.");
      return;
    }

    if (!paymentMethod) {
      setError("Please select a payment method.");
      return;
    }

    // Verify that the selected payment method is still available.
    if (
      paymentMethod === "bkash_manual" &&
      !settings?.bkashNumber
    ) {
      setError("bKash payment is currently unavailable.");
      return;
    }

    if (
      paymentMethod === "nagad_manual" &&
      !settings?.nagadNumber
    ) {
      setError("Nagad payment is currently unavailable.");
      return;
    }

    if (
      paymentMethod === "cod" &&
      settings?.codEnabled === false
    ) {
      setError("Cash on Delivery is currently unavailable.");
      return;
    }

    if (
      isManual &&
      (
        !manualPayment.senderNumber.trim() ||
        !manualPayment.trxId.trim()
      )
    ) {
      setError(
        "Please enter the sender number and Transaction ID."
      );
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        items: items.map((i) => ({
          productId: i.productId,
          quantity: Math.min(
            Math.max(1, Number(i.quantity) || 1),
            Number(i.stock) || 1
          ),
        })),

        customer: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
        },

        paymentMethod,

        ...(isManual
          ? {
              manualPayment: {
                senderNumber:
                  manualPayment.senderNumber.trim(),
                trxId: manualPayment.trxId.trim(),
              },
            }
          : {}),

        ...(coupon
          ? {
              couponCode: coupon.code,
            }
          : {}),
      };

      const res = await api.post("/orders", payload);

      if (
        paymentMethod === "sslcommerz" &&
        res.data?.redirectUrl
      ) {
        clearCart();
        window.location.href = res.data.redirectUrl;
      } else if (isManual) {
        clearCart();

        router.push(
          `/order-result?status=pending&order=${encodeURIComponent(
            res.data.order.orderNumber
          )}&method=${encodeURIComponent(paymentMethod)}`
        );
      } else {
        clearCart();

        router.push(
          `/order-result?status=success&order=${encodeURIComponent(
            res.data.order.orderNumber
          )}&cod=true`
        );
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Could not place the order. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <h1 className="text-2xl font-700 mb-8">
        Checkout
      </h1>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4"
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label="Full name"
            value={form.name}
            onChange={(v) =>
              setForm({ ...form, name: v })
            }
            required
          />

          <Field
            label="Phone number"
            value={form.phone}
            onChange={(v) =>
              setForm({ ...form, phone: v })
            }
            required
            placeholder="01XXXXXXXXX"
          />
        </div>

        <Field
          label="Email (optional)"
          value={form.email}
          onChange={(v) =>
            setForm({ ...form, email: v })
          }
          type="email"
        />

        <Field
          label="Delivery address"
          value={form.address}
          onChange={(v) =>
            setForm({ ...form, address: v })
          }
          required
        />

        <Field
          label="City"
          value={form.city}
          onChange={(v) =>
            setForm({ ...form, city: v })
          }
          required
          placeholder="e.g. Dhaka, Chattogram"
        />

        <div className="mt-2">
          <p className="text-sm text-muted-foreground mb-2">
            Payment method
          </p>

          {settingsLoading ? (
            <p className="text-sm text-muted-foreground">
              Loading payment methods…
            </p>
          ) : !settings ? (
            <p className="text-destructive text-sm">
              Payment methods could not be loaded. Please try again.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {settings?.bkashNumber && (
                <PaymentOption
                  active={
                    paymentMethod === "bkash_manual"
                  }
                  onClick={() =>
                    setPaymentMethod("bkash_manual")
                  }
                  label="bKash"
                  sub="Send Money, then confirm below"
                />
              )}

              {settings?.nagadNumber && (
                <PaymentOption
                  active={
                    paymentMethod === "nagad_manual"
                  }
                  onClick={() =>
                    setPaymentMethod("nagad_manual")
                  }
                  label="Nagad"
                  sub="Send Money, then confirm below"
                />
              )}

              {settings?.codEnabled !== false && (
                <PaymentOption
                  active={paymentMethod === "cod"}
                  onClick={() =>
                    setPaymentMethod("cod")
                  }
                  label="Cash on Delivery"
                  sub="Pay when it arrives"
                />
              )}
            </div>
          )}
        </div>

        {isManual && settings && (
          <div className="border border-primary/40 bg-card rounded-md p-4 text-sm grid gap-3">
            <p className="text-foreground/80">
              <strong className="text-primary">
                {paymentMethod === "bkash_manual"
                  ? settings.bkashType
                  : settings.nagadType}{" "}
                number:
              </strong>{" "}
              <span className="font-mono">
                {paymentMethod === "bkash_manual"
                  ? settings.bkashNumber
                  : settings.nagadNumber}
              </span>
            </p>

            <p className="text-muted-foreground text-xs leading-relaxed">
              এই number-এ{" "}
              {paymentMethod === "bkash_manual"
                ? "bKash"
                : "Nagad"}{" "}
              app থেকে <strong>Send Money</strong> করুন মোট
              টাকার পরিমাণ (নিচে দেখুন)। Payment করার পর যে
              Transaction ID (TrxID) পাবেন সেটা এবং যে number
              থেকে পাঠিয়েছেন তা নিচে দিন — আমরা verify করে
              অর্ডার confirm করব।
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              <Field
                label="Sent from this number"
                value={manualPayment.senderNumber}
                onChange={(v) =>
                  setManualPayment({
                    ...manualPayment,
                    senderNumber: v,
                  })
                }
                required
                placeholder="01XXXXXXXXX"
              />

              <Field
                label="Transaction ID (TrxID)"
                value={manualPayment.trxId}
                onChange={(v) =>
                  setManualPayment({
                    ...manualPayment,
                    trxId: v,
                  })
                }
                required
                placeholder="e.g. 9G7H3K2L1M"
              />
            </div>
          </div>
        )}

        <div className="mt-2">
          <p className="text-sm text-muted-foreground mb-2">
            Coupon code
          </p>

          <div className="flex gap-2">
            <input
              placeholder="e.g. ARCADE2026"
              value={couponInput}
              onChange={(e) => {
                setCouponInput(
                  e.target.value.toUpperCase()
                );
                setCoupon(null);
                setCouponError("");
              }}
              className="flex-1 bg-card border border-border rounded-md px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />

            <Button
              type="button"
              variant="outline"
              onClick={applyCoupon}
              disabled={
                checkingCoupon ||
                !couponInput.trim()
              }
            >
              {checkingCoupon
                ? "Checking…"
                : "Apply"}
            </Button>
          </div>

          {couponError && (
            <p className="text-destructive text-xs mt-1">
              {couponError}
            </p>
          )}

          {coupon && (
            <p className="text-success text-xs mt-1">
              "{coupon.code}" applied — ৳
              {coupon.discountAmount} off
            </p>
          )}
        </div>

        <div className="border border-border rounded-md p-4 mt-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>৳{subtotal}</span>
          </div>

          <div className="flex justify-between text-muted-foreground mt-1">
            <span>Delivery</span>
            <span>
              {form.city
                ? `৳${deliveryFee}`
                : "Enter city"}
            </span>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between text-success mt-1">
              <span>Coupon discount</span>
              <span>-৳{discountAmount}</span>
            </div>
          )}

          <div className="flex justify-between font-mono font-bold text-primary text-base mt-3 pt-3 border-t border-border">
            <span>Total</span>
            <span>৳{grandTotal}</span>
          </div>
        </div>

        {error && (
          <p className="text-destructive text-sm">
            {error}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          disabled={
            submitting ||
            settingsLoading ||
            !paymentMethod ||
            items.length === 0
          }
        >
          {submitting
            ? "Placing order…"
            : isManual
              ? "Confirm order"
              : "Place order"}
        </Button>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}) {
  return (
    <label className="text-sm">
      <span className="text-muted-foreground block mb-1">
        {label}
      </span>

      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="w-full bg-card border border-border rounded-md px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </label>
  );
}

function PaymentOption({
  active,
  onClick,
  label,
  sub,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex-1 text-left border rounded-md p-3 transition-colors ${
        active
          ? "border-primary bg-card"
          : "border-border"
      }`}
    >
      <p className="text-sm font-medium">
        {label}
      </p>

      <p className="text-xs text-muted-foreground mt-0.5">
        {sub}
      </p>
    </button>
  );
}