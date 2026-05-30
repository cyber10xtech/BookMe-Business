/**
 * useReviews
 * Provides the business app with:
 *  - All reviews for the signed-in provider
 *  - Realtime subscription: new reviews surface instantly
 *  - On new review: inserts a new_review notification AND
 *    recalculates average_rating / review_count on profiles
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface ReviewWithCustomer {
  id: string;
  booking_id: string;
  customer_id: string;
  provider_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  // joined
  customer_name: string | null;
  customer_avatar: string | null;
  service_name: string | null;
}

export const useReviews = (providerId: string | null | undefined) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ReviewWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  // Track IDs we've already notified for so realtime re-fires don't double-notify
  const notifiedIds = useRef<Set<string>>(new Set());

  // ── Recalculate and persist average_rating + review_count ────────────────
  const syncRatingStats = useCallback(
    async (updatedReviews: ReviewWithCustomer[]) => {
      if (!providerId) return;
      const count = updatedReviews.length;
      const avg =
        count > 0
          ? updatedReviews.reduce((sum, r) => sum + r.rating, 0) / count
          : 0;

      await supabase
        .from("profiles")
        .update({
          average_rating: parseFloat(avg.toFixed(2)),
          rating: parseFloat(avg.toFixed(2)),
          review_count: count,
        } as any)
        .eq("id", providerId);
    },
    [providerId]
  );

  // ── Send new_review notification to this business ─────────────────────────
  const sendReviewNotification = useCallback(
    async (review: ReviewWithCustomer) => {
      if (!providerId || notifiedIds.current.has(review.id)) return;
      notifiedIds.current.add(review.id);

      const stars = "⭐".repeat(review.rating);
      const customerName = review.customer_name || "A customer";
      const snippet = review.comment
        ? `"${review.comment.slice(0, 60)}${review.comment.length > 60 ? "…" : ""}"`
        : "No comment left.";

      await supabase.from("notifications").insert({
        user_id: providerId,
        type: "new_review" as any,
        title: `${stars} New ${review.rating}-star review`,
        body: `${customerName}: ${snippet}`,
        related_booking_id: review.booking_id,
        data: { review_id: review.id, rating: review.rating },
      } as any);
    },
    [providerId]
  );

  // ── Fetch all reviews with customer + service join ─────────────────────────
  const fetchReviews = useCallback(async () => {
    if (!providerId) { setLoading(false); return; }
    setLoading(true);

    const { data, error } = await supabase
      .from("reviews")
      .select(`
        id,
        booking_id,
        customer_id,
        provider_id,
        rating,
        comment,
        created_at,
        updated_at,
        customer:profiles!reviews_customer_id_fkey(full_name, avatar_url),
        booking:bookings!reviews_booking_id_fkey(service_name)
      `)
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[useReviews] fetch error:", error.message);
      setLoading(false);
      return;
    }

    const shaped: ReviewWithCustomer[] = (data || []).map((r: any) => ({
      id: r.id,
      booking_id: r.booking_id,
      customer_id: r.customer_id,
      provider_id: r.provider_id,
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
      updated_at: r.updated_at,
      customer_name: r.customer?.full_name ?? null,
      customer_avatar: r.customer?.avatar_url ?? null,
      service_name: r.booking?.service_name ?? null,
    }));

    setReviews(shaped);
    setLoading(false);

    // Sync rating stats whenever we fetch
    await syncRatingStats(shaped);
  }, [providerId, syncRatingStats]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!providerId) return;

    const channel = supabase
      .channel(`reviews-provider-${providerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "reviews",
          filter: `provider_id=eq.${providerId}`,
        },
        async (payload) => {
          const raw = payload.new as any;

          // Enrich the new review with customer name + service
          const [customerRes, bookingRes] = await Promise.all([
            supabase
              .from("profiles")
              .select("full_name, avatar_url")
              .eq("id", raw.customer_id)
              .single(),
            supabase
              .from("bookings")
              .select("service_name")
              .eq("id", raw.booking_id)
              .single(),
          ]);

          const enriched: ReviewWithCustomer = {
            ...raw,
            customer_name: customerRes.data?.full_name ?? null,
            customer_avatar: customerRes.data?.avatar_url ?? null,
            service_name: bookingRes.data?.service_name ?? null,
          };

          setReviews((prev) => {
            if (prev.find((r) => r.id === enriched.id)) return prev;
            const updated = [enriched, ...prev];
            // Sync stats in background
            syncRatingStats(updated);
            return updated;
          });

          // Fire notification
          await sendReviewNotification(enriched);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [providerId, syncRatingStats, sendReviewNotification]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;

  const ratingBreakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    pct:
      reviews.length > 0
        ? Math.round(
            (reviews.filter((r) => r.rating === star).length / reviews.length) * 100
          )
        : 0,
  }));

  return {
    reviews,
    loading,
    averageRating,
    ratingBreakdown,
    totalReviews: reviews.length,
    refetch: fetchReviews,
  };
};
