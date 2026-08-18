"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Package, Heart, Settings, LogOut, LifeBuoy } from "lucide-react";
import { useUser } from "../../../../context/UserContext.jsx";
import { cn } from "../../../../lib/utils.js";

const TABS = [
  { href: "/account", label: "Overview", icon: LayoutDashboard, match: "/account", exact: true },
  { href: "/account/orders", label: "Orders", icon: Package, match: "/account/orders" },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart, match: "/account/wishlist" },
  { href: "/account/support", label: "Support", icon: LifeBuoy, match: "/account/support" },
  { href: "/account/settings", label: "Settings", icon: Settings, match: "/account/settings" },
];

export default function AccountGuardedLayout({ children }) {
  const { user, loading, logout } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace(`/account/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, user, pathname, router]);

  if (loading || !user) {
    return (
      <div className="max-w-6xl mx-auto px-5 py-20 text-center text-muted-foreground text-sm">
        Loading your account…
      </div>
    );
  }

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <div className="max-w-6xl mx-auto px-5 py-10 grid md:grid-cols-[200px_1fr] gap-8">
      <aside className="grid gap-1 h-fit">
        <p className="text-sm font-medium mb-2 px-1">Hi, {user.name?.split(" ")[0]}</p>
        {TABS.map(({ href, label, icon: Icon, match, exact }) => {
          const active = exact ? pathname === match : pathname.startsWith(match);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" /> {label}
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10 text-left mt-2"
        >
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </aside>
      <div>{children}</div>
    </div>
  );
}
