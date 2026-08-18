"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "../../../lib/api.js";

export default function AdminDashboardIndex() {
  const router = useRouter();

  useEffect(() => {
    api
      .get("/auth/me")
      .then((res) => {
        router.replace(res.data.user?.role === "delivery" ? "/admin/dashboard/delivery" : "/admin/dashboard/overview");
      })
      .catch(() => router.replace("/admin/login"));
  }, [router]);

  return null;
}
