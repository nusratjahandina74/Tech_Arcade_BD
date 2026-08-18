import { Suspense } from "react";
import OrderResultContent from "./OrderResultContent.jsx";

export default function OrderResultPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto px-5 py-24 text-center text-muted-foreground text-sm">Loading…</div>}>
      <OrderResultContent />
    </Suspense>
  );
}
