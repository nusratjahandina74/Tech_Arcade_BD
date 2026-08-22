"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Package, ClipboardList, Wallet, LogOut, Store, Users, History, Ticket, RotateCcw, LifeBuoy, Truck, Rocket } from "lucide-react";
import ThemeToggle from "../../../components/ThemeToggle.jsx";
import { cn } from "../../../lib/utils.js";
import api from "../../../lib/api.js";
import { AdminProvider } from "../../../context/AdminContext.jsx";

const NAV = [
  { href: "/admin/dashboard/overview", label: "Overview", icon: LayoutDashboard, match: "overview", roles: ["admin", "manager"] },
  { href: "/admin/dashboard/products", label: "Products", icon: Package, match: "products", roles: ["admin", "manager"] },
  { href: "/admin/dashboard/landing-pages", label: "Landing Pages", icon: Rocket, match: "landing-pages", roles: ["admin", "manager"] },
  { href: "/admin/dashboard/orders", label: "Orders", icon: ClipboardList, match: "orders", roles: ["admin", "manager"] },
  { href: "/admin/dashboard/delivery", label: "Delivery", icon: Truck, match: "delivery", roles: ["admin", "manager", "delivery"] },
  { href: "/admin/dashboard/coupons", label: "Coupons", icon: Ticket, match: "coupons", roles: ["admin", "manager"] },
  { href: "/admin/dashboard/returns", label: "Returns", icon: RotateCcw, match: "returns", roles: ["admin", "manager"] },
  { href: "/admin/dashboard/support", label: "Support", icon: LifeBuoy, match: "support", roles: ["admin", "manager"] },
  { href: "/admin/dashboard/settings", label: "Payment settings", icon: Wallet, match: "settings", roles: ["admin"] },
  { href: "/admin/dashboard/team", label: "Team", icon: Users, match: "team", roles: ["admin"] },
  { href: "/admin/dashboard/audit-log", label: "Audit log", icon: History, match: "audit-log", roles: ["admin"] },
];

export default function AdminDashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authState, setAuthState] = useState("checking"); // "checking" | "ok" | "denied"
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/auth/me")
      .then((res) => {
        if (cancelled) return;
        if (["admin", "manager", "delivery"].includes(res.data.user?.role)) {
          setAdmin(res.data.user);
          setAuthState("ok");
        } else {
          setAuthState("denied");
          router.replace("/admin/login");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setAuthState("denied");
        router.replace("/admin/login");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      router.push("/admin/login");
    }
  }

  if (authState !== "ok") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
        Checking session…
      </div>
    );
  }

  const visibleNav = NAV.filter((n) => n.roles.includes(admin?.role));

  return (
    <AdminProvider admin={admin}>
      <div className="min-h-screen flex bg-background text-foreground">
        <aside className="hidden md:flex md:w-64 flex-col border-r border-border p-4 sticky top-0 h-screen">
          <Link href="/" className="font-display font-800 text-lg flex items-center gap-2 px-2 py-2 mb-1">
            <span className="text-primary">▣</span> TechArcade
          </Link>
          <p className="text-xs text-muted-foreground px-2 mb-3 capitalize">{admin?.role} — {admin?.name}</p>
          <nav className="flex-1 grid gap-1">
            {visibleNav.map(({ href, label, icon: Icon, match }) => {
              const active = pathname.includes(match);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="grid gap-1 pt-4 border-t border-border">
            <Link href="/" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
              <Store className="h-4 w-4" /> View storefront
            </Link>
            <button
              onClick={logout}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10 text-left"
            >
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <header className="md:hidden border-b border-border h-14 flex items-center justify-between px-4 sticky top-0 bg-background z-30">
            <span className="font-display font-700">Admin panel</span>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button onClick={logout} className="text-destructive text-sm">Log out</button>
            </div>
          </header>

          <div className="hidden md:flex items-center justify-end px-6 pt-4">
            <ThemeToggle />
          </div>

          <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-background border-t border-border flex justify-around py-2 overflow-x-auto">
            {visibleNav.map(({ href, label, icon: Icon, match }) => {
              const active = pathname.includes(match);
              return (
                <Link key={href} href={href} className={cn("flex flex-col items-center gap-0.5 text-xs px-2 flex-shrink-0", active ? "text-primary" : "text-muted-foreground")}>
                  <Icon className="h-5 w-5" />
                  {label.split(" ")[0]}
                </Link>
              );
            })}
          </nav>

          <main className="p-4 md:p-6 pb-20 md:pb-6 max-w-6xl">{children}</main>
        </div>
      </div>
    </AdminProvider>
  );
}
