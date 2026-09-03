import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import type { Booking } from "@/lib/database.types";

export type { Booking } from "@/lib/database.types";

export interface EnrichedBooking extends Booking {
  customer_avatar_url?: string | null;
  customer_phone_from_profile?: string | null;
}

const STATUS_MAP: Record<string, string> = {
  accepted:    "confirmed",
  rejected:    "cancelled",
  completed:   "completed",
  rescheduled: "rescheduled",
};

// Statuses that should never be overwritten by auto-completion.
const TERMINAL_STATUSES = new Set(["completed", "cancelled", "rejected", "no_show"]);

// Must match the public.notification_type Postgres enum exactly
const NOTIF_TYPE_MAP: Record<string, string> = {
  confirmed:   "booking_confirmed",
  cancelled:   "booking_cancelled",
  completed:   "booking_completed",
  rescheduled: "booking_rescheduled",
};

function parseBookingDateTime(dateStr?: string | null, timeStr?: string | null): number {
  if (!dateStr) return NaN;
  const cleanDate = dateStr.trim();
  if (!cleanDate) return NaN;

  let timePart = (timeStr || "00:00").trim();
  let hours = 0;
  let minutes = 0;

  // Check for AM/PM
  const ampmMatch = timePart.match(/^(.*?)\s*(AM|PM)$/i);
  if (ampmMatch) {
    const rawTime = ampmMatch[1].trim();
    const ampm = ampmMatch[2].toUpperCase();
    const parts = rawTime.split(":");
    let h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    hours = h;
    minutes = m;
  } else {
    // 24-hour format "HH:MM" or "HH:MM:SS"
    const parts = timePart.split(":");
    hours = parseInt(parts[0], 10) || 0;
    minutes = parseInt(parts[1], 10) || 0;
  }

  const hStr = String(hours).padStart(2, "0");
  const mStr = String(minutes).padStart(2, "0");
  const isoString = `${cleanDate}T${hStr}:${mStr}:00`;
  const dt = new Date(isoString).getTime();
  return dt;
}

export const useBookings = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [bookings, setBookings] = useState<EnrichedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const processedRef = useRef<Set<string>>(new Set());

  const fetchBookings = useCallback(async () => {
    if (!user || !profile) return;

    // Fetch bookings + join customer profile for avatar / phone
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        customer_profile:profiles!bookings_customer_id_fkey(
          avatar_url,
          phone
        )
      `)
      .eq("provider_id", profile.id)
      .order("booking_date", { ascending: false })
      .order("booking_time", { ascending: true });

    if (error) {
      console.error("[Bookings] fetch error:", error);
      // Fallback: plain select without join
      const { data: plain } = await supabase
        .from("bookings")
        .select("*")
        .eq("provider_id", profile.id)
        .order("booking_date", { ascending: false });
      setBookings((plain as EnrichedBooking[]) || []);
    } else {
      const enriched: EnrichedBooking[] = (data || []).map((b: any) => ({
        ...b,
        customer_avatar_url: b.customer_profile?.avatar_url ?? null,
        customer_phone_from_profile: b.customer_profile?.phone ?? null,
      }));
      setBookings(enriched);
    }
    setLoading(false);
  }, [user, profile]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // Realtime subscription — reflect changes without manual refresh
  useEffect(() => {
    if (!profile) return;
    const ch = supabase
      .channel(`bookings-rt:${profile.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `provider_id=eq.${profile.id}` },
        () => fetchBookings()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile, fetchBookings]);

  const updateBookingStatus = async (id: string, action: string, reason?: string) => {
    if (!user || !profile) return;

    const dbStatus = STATUS_MAP[action] ?? action;
    const updateData: any = { status: dbStatus, updated_at: new Date().toISOString() };
    
    if (dbStatus === "cancelled" || dbStatus === "rejected") {
      updateData.cancellation_reason = reason || null;
      updateData.cancelled_by_role = "business";
      updateData.cancelled_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", id)
      .eq("provider_id", profile.id)
      .in("status", ["pending", "confirmed", "accepted", "rescheduled"]);

    if (error) { console.error("[Booking] update:", error); return; }

    const booking = bookings.find(b => b.id === id);
    if (booking) {
      const notifType = NOTIF_TYPE_MAP[dbStatus] ?? "booking_update";
      const titles: Record<string, string> = {
        confirmed:   "Booking Confirmed! ✅",
        cancelled:   "Booking Cancelled ❌",
        completed:   "Service Completed ⭐",
        rescheduled: "Booking Rescheduled",
      };
      const bodies: Record<string, string> = {
        confirmed:   `Your booking for ${booking.service_name || "a service"} has been confirmed by ${profile.business_name || "the provider"}.`,
        cancelled:   `Your booking for ${booking.service_name || "a service"} has been cancelled. ${reason ? "Reason: "+reason : ""}`,
        completed:   `${booking.service_name || "Your service"} is complete. Please leave a review!`,
        rescheduled: `Your booking for ${booking.service_name || "a service"} has been rescheduled.`,
      };

      // Insert DB notification (drives realtime badge in customer app)
      const { error: notifError } = await supabase.from("notifications").insert({
        user_id: booking.customer_id,
        title: titles[dbStatus] ?? "Booking Updated",
        body: bodies[dbStatus] ?? `Your booking status is now: ${dbStatus}.`,
        type: notifType,
        related_booking_id: id,
        related_provider_id: profile.id,
        data: { booking_id: id, status: dbStatus, type: notifType },
        is_read: false,
      } as any);
      if (notifError) console.error("[Booking] notification insert:", notifError);

      // Fire FCM push (non-blocking)
      supabase.functions.invoke("send-notification", {
        body: {
          user_id: booking.customer_id,
          title: titles[dbStatus] ?? "Booking Updated",
          message: bodies[dbStatus] ?? `Status: ${dbStatus}`,
          type: notifType,
          related_booking_id: id,
          data: { click_action: dbStatus === "confirmed" ? `/calendar?booking=${booking.id}` : "/calendar" },
        },
      }).catch(() => {});
    }

    await fetchBookings();
  };

  const rescheduleBooking = async (id: string, date: string, time: string, note: string) => {
    if (!user || !profile || !date || !time || !note.trim()) return false;
    const booking = bookings.find(b => b.id === id);
    if (!booking) return false;
    const { data: conflict } = await supabase.from("bookings").select("id")
      .eq("provider_id", profile.id).eq("booking_date", date).eq("booking_time", time)
      .not("status", "in", "(cancelled,rejected)").neq("id", id).limit(1);
    if (conflict?.length) { console.error("[Booking] reschedule conflict"); return false; }
    const notes = [booking.notes, `Reschedule note: ${note.trim()}`].filter(Boolean).join("\n");
    const { data: updated, error } = await supabase.from("bookings").update({
      booking_date: date, booking_time: time, booking_time_text: time,
      notes, status: "rescheduled", updated_at: new Date().toISOString(),
    } as any).eq("id", id).eq("provider_id", profile.id)
      .in("status", ["pending", "confirmed", "accepted", "rescheduled"]).select("id");
    if (error || !updated?.length) { console.error("[Booking] reschedule:", error); return false; }
    const body = `${booking.service_name || "Your booking"} moved to ${date} at ${time}. Reason: ${note.trim()}.`;
    await supabase.from("notifications").insert({
      user_id: booking.customer_id, title: "Booking Rescheduled", body,
      type: "booking_rescheduled", related_booking_id: id,
      related_provider_id: profile.id, data: { booking_id: id, type: "booking_rescheduled" }, is_read: false,
    } as any);
    void supabase.functions.invoke("send-notification", { body: { user_id: booking.customer_id, title: "Booking Rescheduled", message: body, type: "booking_rescheduled", related_booking_id: id, data: { click_action: `/calendar?booking=${booking.id}` } } });
    await fetchBookings();
    return true;
  };

  // Client-side safety net: auto-complete past bookings safely with processedRef
  useEffect(() => {
    const now = Date.now();
    const overdue = bookings.filter((b) => {
      if (processedRef.current.has(b.id)) return false;
      if (TERMINAL_STATUSES.has(b.status)) return false;
      const dt = parseBookingDateTime(b.booking_date, b.booking_time);
      return !Number.isNaN(dt) && dt < now;
    });

    if (overdue.length === 0) return;

    overdue.forEach((b) => {
      processedRef.current.add(b.id);
      updateBookingStatus(b.id, "completed");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings]);

  const todayStr = new Date().toISOString().split("T")[0];
  const todayBookings   = bookings.filter(b => b.booking_date === todayStr);
  const pendingBookings = bookings.filter(b => b.status === "pending");
  const completedBookings = bookings.filter(b => b.status === "completed");
  const confirmedBookings = bookings.filter(b => b.status === "confirmed" || b.status === "accepted");
  const revenue = completedBookings.reduce((s, b) => s + (b.total_price || b.service_price || 0), 0);

  return {
    bookings, loading, fetchBookings, updateBookingStatus, rescheduleBooking,
    stats: {
      todayCount:     todayBookings.length,
      pendingCount:   pendingBookings.length,
      completedCount: completedBookings.length,
      confirmedCount: confirmedBookings.length,
      revenue,
    },
  };
};
