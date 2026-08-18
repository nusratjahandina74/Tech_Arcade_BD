"use client";

import React, { useEffect, useState } from "react";
import { Zap } from "lucide-react";

function getRemaining(endsAt) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return null;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { hours, minutes, seconds };
}

function pad(n) {
  return String(n).padStart(2, "0");
}

export default function FlashSaleTimer({ endsAt, compact = false }) {
  const [remaining, setRemaining] = useState(() => getRemaining(endsAt));

  useEffect(() => {
    const id = setInterval(() => setRemaining(getRemaining(endsAt)), 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!remaining) return null;

  return (
    <div className={`inline-flex items-center gap-1.5 text-destructive ${compact ? "text-xs" : "text-sm"} font-mono`}>
      <Zap className={compact ? "h-3 w-3 fill-destructive" : "h-4 w-4 fill-destructive"} />
      <span>
        {remaining.hours > 0 && `${pad(remaining.hours)}:`}
        {pad(remaining.minutes)}:{pad(remaining.seconds)}
      </span>
    </div>
  );
}
