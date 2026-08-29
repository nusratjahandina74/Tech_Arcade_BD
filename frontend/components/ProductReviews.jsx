"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Star, BadgeCheck } from "lucide-react";
import api from "../lib/api.js";
import { useUser } from "../context/UserContext.jsx";
import { Button } from "./ui/button.jsx";
import { Badge } from "./ui/badge.jsx";
import VideoUploader from "./VideoUploader.jsx";

function StarRow({ value, size = "h-4 w-4" }) {
  const rating = Math.max(0, Math.min(5, Number(value) || 0));

  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${size} ${
            i < rating
              ? "fill-primary text-primary"
              : "text-muted-foreground/30"
          }`}
        />
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

    const trimmedComment = comment.trim();

    if (!rating || rating < 1 || rating > 5) {
      setError("Please select a rating.");
      return;
    }

    if (!trimmedComment) {
      setError("Please write a review.");
      return;
    }

    if (submitting) return;

    setSubmitting(true);

    try {
      await api.post(`/products/${productId}/reviews`, {
        rating,
        comment: trimmedComment,
        video: video || null,
      });

      setComment("");
      setRating(5);
      setVideo(null);

      await onSubmitted();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Could not submit review."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-border rounded-md p-4 grid gap-3"
    >
      <p className="text-sm font-medium">Write a review</p>

      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`Rate ${n} out of 5`}
            aria-pressed={rating === n}
            disabled={submitting}
          >
            <Star
              className={`h-5 w-5 ${
                n <= rating
                  ? "fill-primary text-primary"
                  : "text-muted-foreground/30"
              }`}
            />
          </button>
        ))}
      </div>

      <textarea
        required
        minLength={1}
        maxLength={5000}
        rows={3}
        placeholder="What did you think of this product?"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        disabled={submitting}
        className="bg-background border border-border rounded-md px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      <VideoUploader
        video={video}
        onChange={setVideo}
      />

      {error && (
        <p className="text-destructive text-xs">
          {error}
        </p>
      )}

      <Button
        type="submit"
        size="sm"
        disabled={submitting}
        className="w-fit"
      >
        {submitting ? "Submitting…" : "Submit review"}
      </Button>
    </form>
  );
}

export default function ProductReviews({ productId }) {
  const { user } = useUser();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filterRating, setFilterRating] = useState("");
  const [hasPhotos, setHasPhotos] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    if (!productId) {
      setReviews([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError("");

    try {
      const res = await api.get(
        `/products/${productId}/reviews`,
        {
          params: {
            ...(filterRating
              ? { rating: filterRating }
              : {}),
            ...(hasPhotos
              ? { hasPhotos: true }
              : {}),
          },
        }
      );

      const nextReviews = Array.isArray(res.data?.reviews)
        ? res.data.reviews
        : [];

      setReviews(nextReviews);
    } catch (err) {
      setReviews([]);
      setLoadError(
        err.response?.data?.message ||
          "Could not load reviews."
      );
    } finally {
      setLoading(false);
    }
  }, [productId, filterRating, hasPhotos]);

  useEffect(() => {
    load();
  }, [load]);

  const currentUserId =
    user?._id || user?.id
      ? String(user._id || user.id)
      : null;

  const alreadyReviewed =
    Boolean(currentUserId) &&
    reviews.some((r) => {
      const reviewUserId =
        typeof r.user === "object"
          ? r.user?._id || r.user?.id
          : r.user;

      return (
        reviewUserId &&
        String(reviewUserId) === currentUserId
      );
    });

  async function handleReviewSubmitted() {
    setShowForm(false);
    await load();
  }

  return (
    <div className="mt-12">
      <h2 className="text-lg font-700 mb-4">
        Reviews
      </h2>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {["", "5", "4", "3", "2", "1"].map((r) => (
          <button
            key={r || "all"}
            type="button"
            onClick={() => setFilterRating(r)}
            aria-pressed={filterRating === r}
            className={`text-xs border rounded-full px-3 py-1 ${
              filterRating === r
                ? "border-primary text-primary"
                : "border-border text-muted-foreground"
            }`}
          >
            {r ? `${r} ★` : "All"}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setHasPhotos((v) => !v)}
          aria-pressed={hasPhotos}
          className={`text-xs border rounded-full px-3 py-1 ${
            hasPhotos
              ? "border-primary text-primary"
              : "border-border text-muted-foreground"
          }`}
        >
          With photos
        </button>
      </div>

      {user && !alreadyReviewed && !showForm && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(true)}
          className="mb-4"
        >
          Write a review
        </Button>
      )}

      {user && !alreadyReviewed && showForm && (
        <div className="mb-6">
          <WriteReviewForm
            productId={productId}
            onSubmitted={handleReviewSubmitted}
          />
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground text-sm">
          Loading reviews…
        </p>
      ) : loadError ? (
        <div className="text-sm">
          <p className="text-destructive">
            {loadError}
          </p>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={load}
          >
            Try again
          </Button>
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No reviews yet — be the first to write one.
        </p>
      ) : (
        <div className="grid gap-4">
          {reviews.map((r) => (
            <div
              key={r._id}
              className="border-b border-border pb-4"
            >
              <div className="flex items-center gap-2">
                <StarRow value={r.rating} />

                {r.isVerifiedPurchase && (
                  <Badge
                    variant="success"
                    className="text-[10px] flex items-center gap-1"
                  >
                    <BadgeCheck className="h-3 w-3" />
                    Verified Buyer
                  </Badge>
                )}
              </div>

              <p className="text-sm mt-2 whitespace-pre-wrap break-words">
                {r.comment}
              </p>

              {Array.isArray(r.images) &&
                r.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {r.images.map((img, i) => (
                      <img
                        key={`${r._id}-image-${i}`}
                        src={img}
                        alt={`${r.userName || "Customer"} review image ${i + 1}`}
                        loading="lazy"
                        className="w-16 h-16 object-cover rounded border border-border"
                      />
                    ))}
                  </div>
                )}

              {r.video && (
                <video
                  src={r.video}
                  controls
                  preload="metadata"
                  className="w-40 h-28 rounded border border-border mt-2 object-cover"
                />
              )}

              <p className="text-xs text-muted-foreground mt-2">
                {r.userName || "Customer"} ·{" "}
                {r.createdAt
                  ? new Date(
                      r.createdAt
                    ).toLocaleDateString()
                  : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}