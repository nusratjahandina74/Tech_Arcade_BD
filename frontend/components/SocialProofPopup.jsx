"use client";

import React, { useEffect, useRef, useState } from "react";
import { ShoppingBag, X } from "lucide-react";
import api from "../lib/api.js";

export default function SocialProofPopup() {
  const [feed, setFeed] = useState([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    api
      .get("/orders/recent-public")
      .then((res) => setFeed(res.data.feed))
      .catch(() => setFeed([]));
  }, []);

  useEffect(() => {
    if (feed.length === 0 || dismissed) return;

    function cycle() {
      setVisible(true);
      timeoutRef.current = setTimeout(() => {
        setVisible(false);
        timeoutRef.current = setTimeout(() => {
          setIndex((i) => (i + 1) % feed.length);
        }, 500);
      }, 5000);
    }

    const startDelay = setTimeout(cycle, 3000);
    return () => {
      clearTimeout(startDelay);
      clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed, index, dismissed]);

  if (feed.length === 0 || dismissed) return null;
  const item = feed[index];

  return (
    <div
      className={`fixed bottom-5 left-5 z-50 max-w-xs transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"
      }`}
    >
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <ShoppingBag className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm">
            <span className="font-medium">{item.firstName}</span> from{" "}
            <span className="font-medium">{item.city}</span> just ordered
          </p>
          <p className="text-xs text-muted-foreground truncate">{item.productName}</p>
        </div>
        <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
