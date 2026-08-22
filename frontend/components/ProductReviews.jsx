"use client";

import React, { useEffect, useState } from "react";
import { Star, BadgeCheck } from "lucide-react";
import api from "../lib/api.js";
import { useUser } from "../context/UserContext.jsx";
import { Button } from "./ui/button.jsx";
import { Badge } from "./ui/badge.jsx";
import VideoUploader from "./VideoUploader.jsx";

function StarRow({ value, size = "h-4 w-4" }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`${size} ${i < value ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

function WriteReviewForm({ productId, onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [video, setVideo] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post(`/products/${productId}/reviews`, { rating, comment, video });
      setComment("");
      setVideo(null);
      onSubmitted();
    } catch (err) {
      setError(err.response?.data?.message || "Could not submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-border rounded-md p-4 grid gap-3">
      <p className="text-sm font-medium">Write a review</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)}>
            <Star className={`h-5 w-5 ${n <= rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
          </button>
        ))}
      </div>
      <textarea
        required
        rows={3}
        placeholder="What did you think of this product?"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="bg-background border border-border rounded-md px-3 py-2 text-sm"
      />
      <VideoUploader video={video} onChange={setVideo} />
      {error && <p className="text-destructive text-xs">{error}</p>}
      <Button type="submit" size="sm" disabled={submitting} className="w-fit">
        {submitting ? "Submitting…" : "Submit review"}
      </Button>
    </form>
  );
}

export default function ProductReviews({ productId }) {
  const { user } = useUser();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState("");
  const [hasPhotos, setHasPhotos] = useState(false);
  const [showForm, setShowForm] = useState(false);

  function load() {
    setLoading(true);
    api
      .get(`/products/${productId}/reviews`, { params: { rating: filterRating, hasPhotos: hasPhotos || undefined } })
      .then((res) => setReviews(res.data.reviews))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterRating, hasPhotos]);

  const alreadyReviewed = user && reviews.some((r) => r.user === user.id);

  return (
    <div className="mt-12">
      <h2 className="text-lg font-700 mb-4">Reviews</h2>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {["", "5", "4", "3", "2", "1"].map((r) => (
          <button
            key={r || "all"}
            onClick={() => setFilterRating(r)}
            className={`text-xs border rounded-full px-3 py-1 ${
              filterRating === r ? "border-primary text-primary" : "border-border text-muted-foreground"
            }`}
          >
            {r ? `${r} ★` : "All"}
          </button>
        ))}
        <button
          onClick={() => setHasPhotos((v) => !v)}
          className={`text-xs border rounded-full px-3 py-1 ${
            hasPhotos ? "border-primary text-primary" : "border-border text-muted-foreground"
          }`}
        >
          With photos
        </button>
      </div>

      {user && !alreadyReviewed && !showForm && (
        <Button variant="outline" size="sm" onClick={() => setShowForm(true)} className="mb-4">
          Write a review
        </Button>
      )}
      {user && !alreadyReviewed && showForm && (
        <div className="mb-6">
          <WriteReviewForm
            productId={productId}
            onSubmitted={() => {
              setShowForm(false);
              load();
            }}
          />
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p className="text-muted-foreground text-sm">No reviews yet — be the first to write one.</p>
      ) : (
        <div className="grid gap-4">
          {reviews.map((r) => (
            <div key={r._id} className="border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <StarRow value={r.rating} />
                {r.isVerifiedPurchase && (
                  <Badge variant="success" className="text-[10px] flex items-center gap-1">
                    <BadgeCheck className="h-3 w-3" /> Verified Buyer
                  </Badge>
                )}
              </div>
              <p className="text-sm mt-2">{r.comment}</p>
              {r.images?.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {r.images.map((img, i) => (
                    <img key={i} src={img} alt="" className="w-16 h-16 object-cover rounded border border-border" />
                  ))}
                </div>
              )}
              {r.video && (
                <video src={r.video} controls className="w-40 h-28 rounded border border-border mt-2 object-cover" />
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {r.userName} · {new Date(r.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
