import React from "react";

export default function Footer() {
  return (
    <footer className="border-t border-border mt-20">
      <div className="max-w-6xl mx-auto px-5 py-10 grid gap-8 sm:grid-cols-3 text-sm text-muted-foreground">
        <div>
          <div className="font-display text-foreground mb-2">▣ TechArcade</div>
          <p>Genuine electronics and gadgets, delivered across Bangladesh.</p>
        </div>
        <div>
          <div className="text-foreground mb-2 font-medium">Support</div>
          <p>Phone / WhatsApp: 01354422949</p>
          <p>Email: techarcade47@gmail.com</p>
        </div>
        <div>
          <div className="text-foreground mb-2 font-medium">Payment</div>
          <p>bKash · Nagad · Cash on Delivery</p>
        </div>
      </div>
      <div className="trace-divider max-w-6xl mx-auto !my-0" />
      <p className="text-center text-xs text-muted-foreground/70 py-5">
        © {new Date().getFullYear()} TechArcade. All rights reserved.
      </p>
    </footer>
  );
}
