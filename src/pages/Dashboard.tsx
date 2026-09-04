import { useState, useEffect, useCallback, useRef } from "react";
import {
  CalendarCheck, Clock, CheckCircle2, DollarSign, Plus, Trash2,
  CheckCircle, XCircle, Phone, MapPin, ChevronRight, Star, X,
  Sparkles, TrendingUp, AlertCircle, Calendar, Lock, ArrowUpRight,
  ChevronUp, MessageSquare, Camera, Image as ImageIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import AppLayout from "@/components/layout/AppLayout";
import ProfileCompletionBar from "@/components/dashboard/ProfileCompletionBar";
import AddServiceSheet, { type AddServiceData } from "@/components/dashboard/AddServiceSheet";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useServices } from "@/hooks/useServices";
import { useBookings, type EnrichedBooking } from "@/hooks/useBookings";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { useReviews } from "@/hooks/useReviews";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { Promotion } from "@/lib/database.types";
import { useReadableLocation } from "@/lib/readableLocation";

const TABS = ["Bookings", "Services", "Reviews", "Promotions"] as const;
type FilterType = "all" | "today" | "pending" | "completed" | "confirmed";
type RevPeriod = "Day" | "Week" | "Month";

/* ── Shared helpers ─────────────────────────────────────────────────────────── */
const fmt = (n: number) => `₦${n.toLocaleString()}`;

const StatusBadge = ({ status }: { status: string }) => {
  const cfg: Record<string, { bg: string; text: string; label: string }> = {
    pending:   { bg: "hsl(38 100% 95%)",  text: "hsl(38 92% 35%)",  label: "Pending"   },
    confirmed: { bg: "hsl(142 60% 92%)",  text: "hsl(142 71% 28%)", label: "Confirmed" },
    accepted:  { bg: "hsl(142 60% 92%)",  text: "hsl(142 71% 28%)", label: "Confirmed" },
    completed: { bg: "hsl(220 80% 94%)",  text: "hsl(220 80% 35%)", label: "Completed" },
    cancelled: { bg: "hsl(0 60% 94%)",    text: "hsl(0 84% 45%)",   label: "Cancelled" },
    rejected:  { bg: "hsl(0 60% 94%)",    text: "hsl(0 84% 45%)",   label: "Rejected"  },
  };
  const c = cfg[status] ?? { bg: "hsl(var(--muted))", text: "hsl(var(--muted-foreground))", label: status };
  return (
    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
      style={{ background: c.bg, color: c.text }}>
      {c.label}
    </span>
  );
};

const Avatar = ({ url, name, size = "md" }: { url?: string|null; name?: string|null; size?: "sm"|"md"|"lg" }) => {
  const sz = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-14 h-14 text-xl" : "w-11 h-11 text-sm";
  const initials = (name || "?").split(" ").map(n => n[0] ?? "").filter(Boolean).join("").toUpperCase().slice(0, 2) || "?";
  return url
    ? <img src={url} alt={name||""} className={`${sz} rounded-full object-cover flex-shrink-0`}
        style={{ boxShadow: "var(--shadow-flat)" }} />
    : <div className={`${sz} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
        style={{ background: "linear-gradient(135deg, hsl(220 80% 40%), hsl(220 100% 20%))", boxShadow: "var(--shadow-flat)" }}>
        {initials}
      </div>;
};

const BookingLocation = ({ value }: { value?: string | null }) => {
  const location = useReadableLocation({ address: value });
  return <>{location}</>;
};

export const BookingSheet = ({ booking, onClose, onAccept, onReject, onComplete, onReschedule, accepting, rescheduling, navigate }: {
  booking: EnrichedBooking; onClose: () => void;
  onAccept: (id: string) => Promise<void>; onReject: (id: string, reason: string) => Promise<void>;
  onComplete: (id: string) => Promise<void>; accepting: string|null;
  onReschedule: (id: string, date: string, time: string, note: string) => Promise<void>; rescheduling: boolean;
  navigate: ReturnType<typeof useNavigate>;
}) => {
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState(booking.booking_date);
  const [newTime, setNewTime] = useState(String(booking.booking_time || "").slice(0, 5));
  const [rescheduleNote, setRescheduleNote] = useState("");

  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [editedPrice, setEditedPrice] = useState(String(booking.total_price || booking.service_price || 0));
  const [savingPrice, setSavingPrice] = useState(false);

  const handleSavePrice = async () => {
    const val = parseFloat(editedPrice);
    if (isNaN(val) || val <= 0) {
      toast.error("Please enter a valid positive amount.");
      return;
    }

    // Parse service range metadata if available
    const minPrice = booking.service_price || 0;
    let maxPrice = 0;
    if ((booking as any).service_description) {
      try {
        const parsed = JSON.parse((booking as any).service_description);
        if (parsed?.maxPrice) maxPrice = Number(parsed.maxPrice) || 0;
      } catch (_) {}
    }

    if (minPrice > 0 && val < minPrice) {
      toast.error(`Price cannot be less than service minimum (₦${minPrice.toLocaleString()}).`);
      return;
    }
    if (maxPrice > 0 && val > maxPrice) {
      toast.error(`Price cannot exceed service maximum (₦${maxPrice.toLocaleString()}).`);
      return;
    }

    setSavingPrice(true);
    const { error } = await supabase
      .from("bookings")
      .update({
        total_price: val,
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking.id);

    setSavingPrice(false);
    if (error) {
      toast.error("Failed to update price: " + error.message);
    } else {
      toast.success(`Booking price updated to ${fmt(val)}`);
      booking.total_price = val;
      setIsEditingPrice(false);
    }
  };

  const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-NG",
    { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const accentGrad: Record<string, string> = {
    pending:   "linear-gradient(135deg,#f59e0b,#d97706)",
    confirmed: "linear-gradient(135deg,#22c55e,#16a34a)",
    accepted:  "linear-gradient(135deg,#22c55e,#16a34a)",
    completed: "linear-gradient(135deg,#3b82f6,#2563eb)",
    cancelled: "linear-gradient(135deg,#ef4444,#dc2626)",
    rejected:  "linear-gradient(135deg,#ef4444,#dc2626)",
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end" style={{ background: "rgba(13,22,38,0.55)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="w-full rounded-t-[2rem] flex flex-col animate-slide-up"
        style={{ background: "hsl(var(--background))", maxHeight: "90vh", boxShadow: "0 -8px 40px rgba(0,0,0,0.2)" }}
        onClick={e => e.stopPropagation()}>

        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: "hsl(var(--muted-foreground)/0.3)" }} />
        </div>

        {/* Hero banner */}
        <div className="mx-4 rounded-3xl p-5 mb-2" style={{ background: accentGrad[booking.status] ?? accentGrad.confirmed }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar url={booking.customer_avatar_url} name={booking.customer_name} size="lg" />
              <div>
                <p className="text-white font-extrabold text-lg leading-tight">{booking.customer_name || "Customer"}</p>
                <p className="text-white/80 text-xs mt-0.5">{booking.service_name || "Service"}</p>
                <div className="mt-1.5"><StatusBadge status={booking.status} /></div>
              </div>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.2)" }}>
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* Date + time */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Calendar, label: "Date", value: fmtDate(booking.booking_date) },
              { icon: Clock,    label: "Time", value: booking.booking_time_text || booking.booking_time },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-3xl p-4 flex items-center gap-3"
                style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">{label}</p>
                  <p className="text-sm font-bold text-foreground leading-tight">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Service + price */}
          <div className="rounded-3xl p-4"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">Service</p>
                <p className="text-sm font-bold text-foreground">{booking.service_name || "—"}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">Amount</p>
                  {!isEditingPrice && (
                    <button
                      type="button"
                      onClick={() => setIsEditingPrice(true)}
                      className="text-[10px] text-primary font-bold hover:underline"
                    >
                      (Edit)
                    </button>
                  )}
                </div>
                {!isEditingPrice ? (
                  <p className="text-xl font-extrabold text-primary">{fmt(booking.total_price || booking.service_price || 0)}</p>
                ) : (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-sm font-bold text-foreground">₦</span>
                    <input
                      type="number"
                      value={editedPrice}
                      onChange={(e) => setEditedPrice(e.target.value)}
                      className="w-24 h-8 px-2 rounded-lg bg-secondary text-foreground text-sm font-bold outline-none border border-primary"
                    />
                    <button
                      type="button"
                      onClick={handleSavePrice}
                      disabled={savingPrice}
                      className="px-2 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-bold"
                    >
                      {savingPrice ? "..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingPrice(false)}
                      className="px-1.5 py-1 text-xs text-muted-foreground"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-2 pt-2"
              style={{ borderTop: "1px solid hsl(var(--border))" }}>
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground capitalize">
                {booking.delivery_mode === "at_home" ? "Home service" : "At shop"}
                {booking.customer_location ? <> · <BookingLocation value={booking.customer_location} /></> : ""}
              </span>
            </div>
          </div>

          {/* Contact */}
          <div className="rounded-3xl p-4 space-y-3"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Customer Contact</p>
            <button onClick={() => navigate("/chats", { state: { openForCustomerId: booking.customer_id } })}
              className="w-full flex items-center gap-3 tap-scale">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
                <MessageSquare className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm font-bold text-foreground flex-1 text-left">Message in App</p>
              <span className="text-xs font-bold text-primary px-2 py-1 rounded-xl"
                style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>Chat</span>
            </button>
            {(booking.customer_phone || booking.customer_phone_from_profile) && (
              <a href={`tel:${booking.customer_phone || booking.customer_phone_from_profile}`}
                className="flex items-center gap-3 tap-scale">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
                  <Phone className="w-4 h-4 text-primary" />
                </div>
                <p className="text-sm font-bold text-foreground flex-1">
                  {booking.customer_phone || booking.customer_phone_from_profile}
                </p>
                <span className="text-xs font-bold text-primary px-2 py-1 rounded-xl"
                  style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>Call</span>
              </a>
            )}
          </div>

          {booking.notes && (
            <div className="rounded-3xl p-4"
              style={{ background: "hsl(38 100% 97%)", boxShadow: "var(--shadow-flat)", border: "1px solid hsl(38 92% 80%)" }}>
              <p className="text-[10px] font-bold text-amber-700 uppercase mb-1">Customer Note</p>
              <p className="text-sm text-amber-900 italic">"{booking.notes}"</p>
            </div>
          )}

          <div className="rounded-xl px-4 py-3 flex items-center justify-between"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-inset)" }}>
            <span className="text-xs text-muted-foreground">Booking ref</span>
            <span className="font-mono text-xs font-bold text-foreground">#{booking.id.slice(0, 8).toUpperCase()}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 pt-3 space-y-2 flex-shrink-0"
          style={{ borderTop: "1px solid hsl(var(--border))", background: "hsl(var(--background))", paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}>
          {booking.status === "pending" && !showRejectConfirm && (
            <div className="flex gap-3">
              <button onClick={() => onAccept(booking.id)} disabled={accepting === booking.id}
                className="flex-1 h-13 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 tap-scale"
                style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", boxShadow: "4px 4px 12px rgba(34,197,94,0.4)", height: 52 }}>
                {accepting === booking.id
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <CheckCircle className="w-5 h-5" />}
                {accepting === booking.id ? "Confirming…" : "Accept"}
              </button>
              <button onClick={() => setShowRejectConfirm(true)}
                className="flex-1 h-13 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 tap-scale"
                style={{ height: 52, background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)", color: "hsl(0 84% 55%)", border: "1.5px solid hsl(0 84% 70%)" }}>
                <XCircle className="w-5 h-5" /> Decline
              </button>
            </div>
          )}
          {(booking.status === "confirmed" || booking.status === "accepted") && !showRejectConfirm && (
            <>
              <button onClick={() => onComplete(booking.id)}
                className="w-full rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 tap-scale"
                style={{ height: 52, background: "linear-gradient(145deg, hsl(220 80% 16%), hsl(220 100% 8%))", boxShadow: "var(--shadow-navy)" }}>
                <CheckCircle2 className="w-5 h-5" /> Mark as Completed
              </button>
              <button onClick={() => setShowRejectConfirm(true)}
                className="w-full h-12 mt-2 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 tap-scale"
                style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)", color: "hsl(0 84% 55%)", border: "1.5px solid hsl(0 84% 70%)" }}>
                <XCircle className="w-5 h-5" /> Cancel Booking
              </button>
            </>
          )}

          {["pending", "confirmed", "accepted", "rescheduled"].includes(booking.status) && !showRejectConfirm && !showReschedule && (
            <button onClick={() => setShowReschedule(true)} className="w-full h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 tap-scale" style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)", color: "hsl(var(--primary))" }}>
              <Calendar className="w-5 h-5" /> Reschedule Booking
            </button>
          )}
          {showReschedule && (
            <div className="space-y-3 rounded-2xl p-3" style={{ background: "hsl(var(--muted))" }}>
              <div className="grid grid-cols-2 gap-2"><input type="date" min={new Date().toISOString().split("T")[0]} value={newDate} onChange={e => setNewDate(e.target.value)} className="h-11 rounded-xl bg-background px-3 text-sm" /><input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="h-11 rounded-xl bg-background px-3 text-sm" /></div>
              <textarea value={rescheduleNote} onChange={e => setRescheduleNote(e.target.value)} placeholder="Why are you rescheduling? (Required)" rows={2} className="w-full rounded-xl bg-background p-3 text-sm resize-none outline-none focus:ring-2 focus:ring-primary" />
              <div className="flex gap-2"><button onClick={() => setShowReschedule(false)} className="flex-1 h-11 rounded-xl font-bold" style={{ boxShadow: "var(--shadow-raised)" }}>Keep Date</button><button onClick={() => onReschedule(booking.id, newDate, newTime, rescheduleNote)} disabled={rescheduling || !newDate || !newTime || !rescheduleNote.trim()} className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-60">{rescheduling ? "Checking…" : "Confirm"}</button></div>
            </div>
          )}

          {showRejectConfirm && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-red-600">Are you sure? This cannot be undone.</p>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Why are you declining/cancelling? (Required)"
                className="w-full rounded-2xl bg-muted p-3 text-sm resize-none outline-none focus:ring-2 focus:ring-primary"
                rows={3}
              />
              <div className="flex gap-2">
                <button onClick={() => { setShowRejectConfirm(false); setRejectReason(""); }}
                  className="flex-1 h-11 rounded-2xl text-sm font-bold tap-scale"
                  style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)", color: "hsl(var(--foreground))" }}>
                  Keep Booking
                </button>
                <button 
                  onClick={() => onReject(booking.id, rejectReason)} 
                  disabled={!rejectReason.trim()}
                  className="flex-1 h-11 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-60 tap-scale"
                  style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)", boxShadow: "3px 3px 10px rgba(239,68,68,0.35)" }}>
                  <XCircle className="w-4 h-4" />
                  Confirm
                </button>
              </div>
            </div>
          )}

          {["completed","cancelled","rejected"].includes(booking.status) && (
            <p className="text-center text-sm text-muted-foreground py-2">
              Booking is {booking.status === "completed" ? "complete ✅" : "closed"}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Booking card ──────────────────────────────────────────────────────────── */
const BookingCard = ({ booking, onTap, onAccept, onReject, accepting }: {
  booking: EnrichedBooking; onTap: () => void;
  onAccept: (id: string) => Promise<void>; onReject: (id: string, reason: string) => Promise<void>; accepting: string|null;
}) => {
  const today    = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const isToday  = booking.booking_date === today;
  const isTomorrow = booking.booking_date === tomorrow;
  const dateLabel = isToday ? "Today" : isTomorrow ? "Tomorrow"
    : new Date(booking.booking_date + "T00:00:00").toLocaleDateString("en-NG", { month: "short", day: "numeric" });

  const accentColor: Record<string, string> = {
    pending:   "#f59e0b", confirmed: "#22c55e", accepted: "#22c55e",
    completed: "#3b82f6", cancelled: "#ef4444", rejected: "#ef4444",
  };
  const accent = accentColor[booking.status] ?? "#94a3b8";

  return (
    <button onClick={onTap} className="w-full text-left rounded-3xl overflow-hidden tap-scale-sm animate-fade-in"
      style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
      {/* Status stripe */}
      <div className="h-1 w-full" style={{ background: accent }} />

      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <Avatar url={booking.customer_avatar_url} name={booking.customer_name} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold text-foreground text-sm truncate">{booking.customer_name || "Customer"}</p>
              <StatusBadge status={booking.status} />
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{booking.service_name || "Service"}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          {[
            { icon: Calendar, val: dateLabel, hi: isToday },
            { icon: Clock,    val: booking.booking_time_text || booking.booking_time },
            { icon: MapPin,   val: booking.delivery_mode === "at_home" ? "Home" : "Shop" },
          ].map(({ icon: Icon, val, hi }, i) => (
            <span key={i} className="flex items-center gap-1">
              <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
              <span className={hi ? "font-bold" : ""} style={hi ? { color: accent } : {}}>{val}</span>
              {i < 2 && <span className="ml-1 opacity-40">·</span>}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-base font-extrabold" style={{ color: "hsl(var(--primary))" }}>
            {fmt(booking.total_price || booking.service_price || 0)}
          </p>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            View details <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>

        {booking.status === "pending" && (
          <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: "1px solid hsl(var(--border))" }}
            onClick={e => e.stopPropagation()}>
            <button onClick={() => onAccept(booking.id)} disabled={accepting === booking.id}
              className="flex-1 h-9 rounded-2xl text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 tap-scale"
              style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", boxShadow: "2px 2px 8px rgba(34,197,94,0.35)" }}>
              {accepting === booking.id
                ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <CheckCircle className="w-3.5 h-3.5" />}
              {accepting === booking.id ? "…" : "Accept"}
            </button>
            <button onClick={() => onTap()}
              className="flex-1 h-9 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 tap-scale"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)", color: "#ef4444", border: "1.5px solid hsl(0 84% 80%)" }}>
              <XCircle className="w-3.5 h-3.5" /> Decline
            </button>
          </div>
        )}
      </div>
    </button>
  );
};

/* ── Service Tab ─────────────────────────────────────────────────────────────── */
const ServiceTab = ({ services, userId, onAdd, onDelete, onUpdatePrice }: {
  services: any[]; userId: string;
  onAdd: (d: AddServiceData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdatePrice: (id: string, price: number, maxPrice: number|undefined, pricingType: "fixed"|"range", imageUrls?: string[]) => Promise<void>;
}) => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string|null>(null);

  const getMeta = (s: any) => { try { return JSON.parse(s.description || "{}"); } catch { return {}; } };
  const isLocked = (s: any) => getMeta(s).isLocked === true || s.is_featured === true;
  const locked   = services.filter(isLocked);
  const custom   = services.filter(s => !isLocked(s));

  const ServiceCard = ({ s }: { s: any }) => {
    const meta = getMeta(s);
    const isEditing = editingId === s.id;
    const [pt, setPt]  = useState<"fixed"|"range">(meta.pricingType || "fixed");
    const [p, setP]    = useState<number>(s.price || 0);
    const [mp, setMp]  = useState<number|undefined>(meta.maxPrice);
    const [images, setImages] = useState<string[]>(meta.imageUrls || []);
    const [uploading, setUploading] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);

    const photoRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

    const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>, slot: number) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(slot);
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/services/${Date.now()}_${slot}.${ext}`;
      const { error } = await supabase.storage.from("business-assets").upload(path, file, { upsert: true });
      if (error) {
        toast.error("Photo upload failed: " + error.message);
        setUploading(null);
        e.target.value = "";
        return;
      }
      const { data } = supabase.storage.from("business-assets").getPublicUrl(path);
      setImages(prev => {
        const next = [...prev];
        next[slot] = data.publicUrl;
        return next.filter(Boolean);
      });
      setUploading(null);
      e.target.value = "";
    };

    const removePhoto = (slot: number) => {
      setImages(prev => prev.filter((_, i) => i !== slot));
    };

    const twoX    = p * 2;
    const exceeds = pt === "range" && mp !== undefined && mp > twoX && p > 0;

    return (
      <div className="rounded-3xl overflow-hidden animate-fade-in"
        style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
        {!isEditing && meta.imageUrls?.length > 0 && (
          <div className="flex gap-1 p-3 pb-0">
            {meta.imageUrls.slice(0, 3).map((url: string, i: number) => (
              <img key={i} src={url} alt="" className="w-16 h-16 rounded-2xl object-cover"
                style={{ boxShadow: "var(--shadow-flat)" }} />
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 p-4">
          {!isEditing && !meta.imageUrls?.length && (
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
              {meta.emoji || "⭐"}
            </div>
          )}
          <div className="flex-1">
            <p className="font-bold text-foreground text-sm">{s.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {s.duration} · {meta.pricingType === "range" && meta.maxPrice
                ? `₦${s.price?.toLocaleString()} – ₦${meta.maxPrice?.toLocaleString()}`
                : `₦${s.price?.toLocaleString()}`}
            </p>
          </div>
          <button onClick={() => {
            if (isEditing) {
              setEditingId(null);
              setImages(meta.imageUrls || []);
            } else {
              setEditingId(s.id);
            }
          }}
            className="text-xs font-bold text-primary px-3 py-1.5 rounded-xl tap-scale"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
            {isEditing ? "Cancel" : "Edit"}
          </button>
          {!isLocked(s) && (
            <button onClick={() => onDelete(s.id)}
              className="w-9 h-9 rounded-xl flex items-center justify-center tap-scale"
              style={{ background: "hsl(0 60% 97%)", boxShadow: "var(--shadow-flat)" }}>
              <Trash2 className="w-4 h-4" style={{ color: "hsl(0 84% 60%)" }} />
            </button>
          )}
        </div>
        {isEditing && (
          <div className="px-4 pb-4 space-y-3 pt-1" style={{ borderTop: "1px solid hsl(var(--border))" }}>
            {/* Photos Management */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Service Photos ({images.length}/3)
                </Label>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {images.length > 0 ? "Tap change/remove" : "Optional (up to 3)"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map(slot => {
                  const url = images[slot];
                  const isLoading = uploading === slot;
                  const canShowSlot = slot <= images.length && slot < 3;
                  if (!canShowSlot) return null;
                  return (
                    <div key={slot} className="relative aspect-square">
                      <input ref={photoRefs[slot]} type="file" accept="image/*" className="hidden"
                        onChange={e => handlePhoto(e, slot)} />
                      {url ? (
                        <>
                          <img src={url} alt="" className="w-full h-full object-cover rounded-2xl"
                            style={{ boxShadow: "var(--shadow-flat)" }} />
                          <button type="button" onClick={() => removePhoto(slot)}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center tap-scale z-10"
                            style={{ boxShadow: "1px 1px 4px rgba(0,0,0,0.3)" }}>
                            <X className="w-3 h-3" />
                          </button>
                          <button type="button" onClick={() => !isLoading && photoRefs[slot].current?.click()}
                            className="absolute bottom-1 right-1 bg-black/60 text-white rounded-lg px-1.5 py-0.5 text-[9px] font-bold tap-scale">
                            Change
                          </button>
                        </>
                      ) : (
                        <button type="button" onClick={() => !isLoading && photoRefs[slot].current?.click()} disabled={isLoading}
                          className="w-full h-full rounded-2xl flex flex-col items-center justify-center gap-1 transition-all tap-scale"
                          style={{
                            background: "hsl(var(--background))",
                            boxShadow: "var(--shadow-inset)",
                            border: "1.5px dashed hsl(var(--border))",
                          }}>
                          {isLoading
                            ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            : <><Camera className="w-4 h-4 text-primary" /><span className="text-[10px] text-primary font-bold">{slot === 0 ? "Add Photo" : "+ Photo"}</span></>
                          }
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pricing Section */}
            <div className="flex gap-2 mt-2">
              {(["fixed","range"] as const).map(t => (
                <button key={t} onClick={() => setPt(t)}
                  className="flex-1 h-10 rounded-2xl text-xs font-bold tap-scale transition-all"
                  style={pt === t ? {
                    background: "linear-gradient(145deg, hsl(220 80% 16%), hsl(220 100% 8%))",
                    boxShadow: "var(--shadow-navy)", color: "white",
                  } : {
                    background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)",
                    color: "hsl(var(--muted-foreground))",
                  }}>
                  {t === "fixed" ? "Fixed" : "Range"}
                </button>
              ))}
            </div>
            <div className={`grid gap-2 ${pt === "range" ? "grid-cols-2" : "grid-cols-1"}`}>
              {[
                { label: pt === "range" ? "Min" : "Price", val: p, set: setP },
                ...(pt === "range" ? [{ label: `Max (≤₦${twoX.toLocaleString()})`, val: mp || 0, set: (v: number) => setMp(v) }] : []),
              ].map(({ label, val, set }) => (
                <div key={label} className="flex items-center rounded-2xl overflow-hidden h-11"
                  style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-inset)" }}>
                  <span className="w-9 flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0"
                    style={{ borderRight: "1px solid hsl(var(--border))" }}>₦</span>
                  <input type="number" value={val || ""} onChange={e => set(Number(e.target.value))}
                    placeholder={label} className="flex-1 h-full bg-transparent px-2 text-sm outline-none" />
                </div>
              ))}
            </div>
            {exceeds && (
              <div className="flex gap-2 items-start p-2 rounded-xl"
                style={{ background: "hsl(0 60% 97%)", border: "1px solid hsl(0 84% 80%)" }}>
                <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-destructive">Max must be ≤ 2× min (₦{twoX.toLocaleString()})</p>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={() => {
                setEditingId(null);
                setImages(meta.imageUrls || []);
              }}
                className="flex-1 h-10 rounded-2xl text-xs font-bold tap-scale"
                style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)", color: "hsl(var(--muted-foreground))" }}>
                Cancel
              </button>
              <button onClick={async () => {
                setSaving(true);
                try {
                  await onUpdatePrice(s.id, p, pt === "range" ? mp : undefined, pt, images.filter(Boolean));
                  setEditingId(null);
                } finally {
                  setSaving(false);
                }
              }}
                disabled={!p || exceeds || uploading !== null || saving}
                className="flex-1 h-10 rounded-2xl text-xs font-bold text-white tap-scale disabled:opacity-40"
                style={{ background: "linear-gradient(145deg, hsl(220 80% 16%), hsl(220 100% 8%))", boxShadow: "var(--shadow-navy)" }}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {locked.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1 px-1">
            <Lock className="w-3 h-3" /> Pinned
          </p>
          {locked.map(s => <ServiceCard key={s.id} s={s} />)}
        </div>
      )}
      {custom.map(s => <ServiceCard key={s.id} s={s} />)}
      <button onClick={() => setSheetOpen(true)}
        className="w-full h-14 rounded-3xl text-sm font-bold flex items-center justify-center gap-2 tap-scale"
        style={{ background: "linear-gradient(145deg, hsl(220 80% 16%), hsl(220 100% 8%))", boxShadow: "var(--shadow-navy)", color: "white" }}>
        <Plus className="w-5 h-5" /> Add Service
      </button>
      <AddServiceSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onSave={async (d) => { await onAdd(d); setSheetOpen(false); }} userId={userId} />
    </div>
  );
};

/* ── Metric card ─────────────────────────────────────────────────────────────── */
const MetricCard = ({ icon, value, label, sub, onClick }: {
  icon: React.ReactNode; value: string|number; label: string; sub?: React.ReactNode; onClick?: () => void;
}) => (
  <button onClick={onClick}
    className="text-left rounded-3xl p-4 tap-scale-sm transition-all"
    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
      style={{ background: "rgba(255,255,255,0.15)" }}>
      {icon}
    </div>
    <p className="text-2xl font-extrabold text-white leading-none">{value}</p>
    <p className="text-[11px] text-white/70 mt-1 font-semibold">{label}</p>
    {sub && <div className="mt-2">{sub}</div>}
    {onClick && <p className="text-[10px] text-white/50 mt-1">Tap to view →</p>}
  </button>
);

/* ── Main Dashboard ─────────────────────────────────────────────────────────── */
const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { services, addService, updateService, deleteService } = useServices();
  const { bookings, stats, updateBookingStatus, rescheduleBooking } = useBookings();
  const { percentage, missingItems, completedItems, isShadowBanned } = useProfileCompletion(profile, services.length);
  const { reviews, loading: reviewsLoading, averageRating, ratingBreakdown, totalReviews } = useReviews(profile?.id);

  const [activeTab, setActiveTab]   = useState<typeof TABS[number]>("Bookings");
  const [filter, setFilter]         = useState<FilterType>("all");
  const [selectedBooking, setSelected] = useState<EnrichedBooking|null>(null);
  const [accepting, setAccepting]   = useState<string|null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [revPeriod, setRevPeriod]   = useState<RevPeriod>("Month");
  const [showAll, setShowAll]       = useState(false);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [promoDialog, setPromoDialog] = useState(false);
  const [newPromo, setNewPromo]     = useState({ title: "", description: "", discount_type: "percentage", discount_value: "", service_id: "" });

  const tipShown     = useRef(false);
  const pendingShown = useRef(false);

  // One-time pro tip after 60s idle
  useEffect(() => {
    if (!profile || tipShown.current) return;
    const t = setTimeout(() => {
      if (tipShown.current) return;
      tipShown.current = true;
      const tips = ["📸 Profiles with photos get 3× more bookings.", "⭐ Ask clients to leave a review.", "📣 Create a promotion to fill slow days."];
      toast(tips[Math.floor(Math.random() * tips.length)], { duration: 8000 });
    }, 60000);
    return () => clearTimeout(t);
  }, [profile]);

  // One-time pending reminder after 3s
  useEffect(() => {
    if (!profile || stats.pendingCount === 0 || pendingShown.current) return;
    const t = setTimeout(() => {
      if (pendingShown.current) return;
      pendingShown.current = true;
      toast.warning(`${stats.pendingCount} booking${stats.pendingCount > 1 ? "s" : ""} awaiting your response`, {
        duration: 10000,
        action: { label: "Review", onClick: () => { setActiveTab("Bookings"); setFilter("pending"); } },
      });
    }, 3000);
    return () => clearTimeout(t);
  }, [profile, stats.pendingCount]);

  useEffect(() => {
    if (!profile) return;
    supabase.from("promotions").select("*").eq("provider_id", profile.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setPromotions((data as Promotion[]) || []));
  }, [profile]);

  const handleAccept  = useCallback(async (id: string) => { setAccepting(id); await updateBookingStatus(id, "accepted"); toast.success("Booking confirmed! ✅"); setAccepting(null); setSelected(null); }, [updateBookingStatus]);
  const handleReject  = useCallback(async (id: string, reason: string) => { await updateBookingStatus(id, "rejected", reason); toast.info("Booking declined."); setSelected(null); }, [updateBookingStatus]);
  const handleComplete = useCallback(async (id: string) => { await updateBookingStatus(id, "completed"); toast.success("Booking complete! 🎉"); setSelected(null); }, [updateBookingStatus]);
  const handleReschedule = useCallback(async (id: string, date: string, time: string, note: string) => {
    setRescheduling(true);
    const ok = await rescheduleBooking(id, date, time, note);
    toast[ok ? "success" : "error"](ok ? "Booking rescheduled." : "That time is unavailable or the booking changed.");
    if (ok) setSelected(null);
    setRescheduling(false);
  }, [rescheduleBooking]);

  const handleAddPromotion = async () => {
    if (!newPromo.title || !newPromo.discount_value || !profile) return;
    const { data } = await supabase.from("promotions").insert({
      provider_id: profile.id, user_id: user?.id, title: newPromo.title,
      description: newPromo.description || null, discount_type: newPromo.discount_type,
      discount_value: Number(newPromo.discount_value), service_id: newPromo.service_id || null,
    }).select().single();
    if (data) setPromotions(prev => [data as Promotion, ...prev]);
    setNewPromo({ title: "", description: "", discount_type: "percentage", discount_value: "", service_id: "" });
    setPromoDialog(false);
    toast.success("Promotion created!");
  };

  const today = new Date().toISOString().split("T")[0];
  const filteredBookings = (() => {
    switch (filter) {
      case "today":     return bookings.filter(b => b.booking_date === today);
      case "pending":   return bookings.filter(b => b.status === "pending");
      case "completed": return bookings.filter(b => b.status === "completed");
      case "confirmed": return bookings.filter(b => ["confirmed","accepted"].includes(b.status));
      default:          return bookings;
    }
  })();

  const PREVIEW = 3;
  const isAll = filter === "all";
  const canExpand = isAll && filteredBookings.length > PREVIEW;
  const displayed = isAll && !showAll ? filteredBookings.slice(0, PREVIEW) : filteredBookings;

  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; })();

  const neuTab = (active: boolean) => active ? {
    background: "hsl(var(--background))",
    boxShadow: "var(--shadow-pressed)",
    color: "hsl(var(--primary))",
  } : {
    background: "hsl(var(--background))",
    boxShadow: "var(--shadow-flat)",
    color: "hsl(var(--muted-foreground))",
  };

  return (
    <AppLayout>
      {selectedBooking && (
        <BookingSheet booking={selectedBooking} onClose={() => setSelected(null)}
          onAccept={handleAccept} onReject={handleReject} onComplete={handleComplete} onReschedule={handleReschedule} accepting={accepting} rescheduling={rescheduling} navigate={navigate} />
      )}

      {/* ── Hero header ── */}
      <div className="px-5 pt-5 pb-6 mb-2"
        style={{ background: "linear-gradient(160deg, hsl(220 60% 15%), hsl(220 100% 8%))", borderRadius: "0 0 2rem 2rem" }}>
        <p className="text-white/60 text-sm mb-0.5">{greeting} 👋</p>
        <h1 className="text-xl font-extrabold text-white mb-1">
          {profile?.owner_name || profile?.full_name || "Business Owner"}
        </h1>
        {stats.pendingCount > 0 && (
          <button onClick={() => { setActiveTab("Bookings"); setFilter("pending"); }}
            className="mb-4 flex items-center gap-2 px-3 py-1.5 rounded-full tap-scale"
            style={{ background: "rgba(245,158,11,0.2)", border: "1px solid rgba(245,158,11,0.4)" }}>
            <AlertCircle className="w-3.5 h-3.5 text-amber-300" />
            <p className="text-xs text-amber-200 font-semibold">
              {stats.pendingCount} booking{stats.pendingCount > 1 ? "s" : ""} need attention
            </p>
          </button>
        )}

        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-3 mt-2">
          <MetricCard icon={<CalendarCheck className="w-5 h-5 text-white" />} value={stats.todayCount} label="Today's Bookings"
            onClick={() => { setActiveTab("Bookings"); setFilter("today"); setShowAll(true); }} />
          <MetricCard icon={<Clock className="w-5 h-5 text-amber-300" />} value={stats.pendingCount} label="Pending Approval"
            onClick={() => { setActiveTab("Bookings"); setFilter("pending"); setShowAll(true); }} />
          <MetricCard icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />} value={stats.completedCount} label="Completed"
            onClick={() => { setActiveTab("Bookings"); setFilter("completed"); setShowAll(true); }} />
          <MetricCard icon={<DollarSign className="w-5 h-5 text-white" />} value={fmt(stats.revenue)} label="Revenue"
            sub={
              <div className="flex gap-1">
                {(["Day","Week","Month"] as RevPeriod[]).map(p => (
                  <button key={p} onClick={e => { e.stopPropagation(); setRevPeriod(p); }}
                    className="flex-1 text-[9px] font-bold py-1 rounded-lg transition-all"
                    style={revPeriod === p ? { background: "rgba(255,255,255,0.25)", color: "white" } : { color: "rgba(255,255,255,0.4)" }}>
                    {p}
                  </button>
                ))}
              </div>
            }
          />
        </div>
      </div>

      {/* Profile completion */}
      {percentage < 100 && (
        <div className="px-5 mt-2">
          <ProfileCompletionBar percentage={percentage} missingItems={missingItems} completedItems={completedItems} isShadowBanned={isShadowBanned} />
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="px-5 mt-5">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {TABS.map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab); if (tab === "Bookings") { setFilter("all"); setShowAll(false); } }}
              className="px-4 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all tap-scale"
              style={neuTab(activeTab === tab)}>
              {tab}
              {tab === "Bookings" && stats.pendingCount > 0 && (
                <span className="ml-1.5 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full"
                  style={{ background: "#f59e0b", color: "white" }}>{stats.pendingCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="px-5 mt-3 pb-8">

        {/* BOOKINGS */}
        {activeTab === "Bookings" && (
          <div className="space-y-3">
            {/* Filter pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {(["all","today","pending","confirmed","completed"] as FilterType[]).map(f => (
                <button key={f} onClick={() => { setFilter(f); setShowAll(false); }}
                  className="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap tap-scale transition-all"
                  style={filter === f ? {
                    background: "hsl(var(--primary))", color: "white", boxShadow: "var(--shadow-flat)"
                  } : { background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)", color: "hsl(var(--muted-foreground))" }}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground px-1">
              {isAll && !showAll && filteredBookings.length > PREVIEW
                ? `Showing 3 of ${filteredBookings.length} bookings`
                : `${filteredBookings.length} booking${filteredBookings.length !== 1 ? "s" : ""}`}
            </p>

            {filteredBookings.length === 0 ? (
              <div className="rounded-3xl p-10 text-center animate-fade-in"
                style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
                <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-bold text-foreground">No bookings</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {filter === "pending" ? "You're all caught up!" : "Bookings appear here."}
                </p>
              </div>
            ) : (
              <>
                {displayed.map(b => (
                  <BookingCard key={b.id} booking={b} onTap={() => setSelected(b)}
                    onAccept={handleAccept} onReject={handleReject} accepting={accepting} />
                ))}
                {canExpand && (
                  <button onClick={() => setShowAll(v => !v)}
                    className="w-full h-12 rounded-3xl text-sm font-bold flex items-center justify-center gap-2 tap-scale"
                    style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)", color: "hsl(var(--foreground))" }}>
                    {showAll ? <><ChevronUp className="w-4 h-4" /> Show less</> : <><ArrowUpRight className="w-4 h-4" /> View all {filteredBookings.length} bookings</>}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* SERVICES */}
        {activeTab === "Services" && (
          <ServiceTab
            services={services}
            userId={user?.id || ""}
            onAdd={async (d) => {
              await addService({
                name: d.name,
                duration: d.duration,
                price: d.price,
                category: profile?.category,
                pricingType: d.pricingType,
                maxPrice: d.maxPrice,
                imageUrls: d.imageUrls,
                description: d.description,
              });
            }}
            onDelete={deleteService}
            onUpdatePrice={async (id, price, maxPrice, pricingType, imageUrls) => {
              const cur = services.find(s => s.id === id);
              if (!cur) return;
              const prev = (() => { try { return JSON.parse(cur.description || "{}"); } catch { return {}; } })();
              await updateService(id, { price, description: JSON.stringify({ ...prev, maxPrice, pricingType, imageUrls: imageUrls !== undefined ? imageUrls : prev.imageUrls }) } as any);
            }}
          />
        )}

        {/* REVIEWS */}
        {activeTab === "Reviews" && (
          <div className="space-y-4">
            {reviewsLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-3xl skeleton" />)}</div>
            ) : reviews.length === 0 ? (
              <div className="rounded-3xl p-10 text-center"
                style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
                <Star className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-bold text-foreground">No reviews yet</p>
              </div>
            ) : (
              <>
                {/* Rating summary */}
                <div className="rounded-3xl p-5" style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
                  <div className="flex items-center gap-5">
                    <div className="text-center flex-shrink-0">
                      <p className="text-5xl font-extrabold text-foreground">{averageRating.toFixed(1)}</p>
                      <div className="flex justify-center gap-0.5 mt-1">
                        {[1,2,3,4,5].map(s => <Star key={s} className={`w-4 h-4 ${s <= Math.round(averageRating) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/20"}`} />)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{totalReviews} reviews</p>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {ratingBreakdown.map(({ star, count, pct }) => (
                        <div key={star} className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground w-3">{star}</span>
                          <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400 flex-shrink-0" />
                          <div className="flex-1 h-2 rounded-full" style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-inset)" }}>
                            <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground w-4">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {reviews.map(r => (
                  <div key={r.id} className="rounded-3xl p-4" style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, hsl(220 80% 40%), hsl(220 100% 20%))", boxShadow: "var(--shadow-flat)" }}>
                        {(r.customer_name || "C")[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-sm">{r.customer_name || "Anonymous"}</p>
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/20"}`} />)}
                          </div>
                        </div>
                        {r.comment && <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed italic">"{r.comment}"</p>}
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                          {new Date(r.created_at).toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* PROMOTIONS */}
        {activeTab === "Promotions" && (
          <div className="space-y-3">
            <Dialog open={promoDialog} onOpenChange={setPromoDialog}>
              <DialogTrigger asChild>
                <button className="w-full h-14 rounded-3xl text-white font-bold flex items-center justify-center gap-2 tap-scale"
                  style={{ background: "linear-gradient(145deg, hsl(220 80% 16%), hsl(220 100% 8%))", boxShadow: "var(--shadow-navy)" }}>
                  <Plus className="w-5 h-5" /> Create Promotion
                </button>
              </DialogTrigger>
              <DialogContent className="rounded-3xl" style={{ background: "hsl(var(--background))" }}>
                <DialogHeader><DialogTitle>New Promotion</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                  <Input placeholder="Title e.g. 20% Off Haircut" value={newPromo.title} onChange={e => setNewPromo(p => ({ ...p, title: e.target.value }))} />
                  <Textarea placeholder="Short description (optional)" value={newPromo.description} onChange={e => setNewPromo(p => ({ ...p, description: e.target.value }))} className="min-h-[72px]" />
                  <div className="flex gap-2">
                    {["percentage","fixed_amount"].map(t => (
                      <button key={t} onClick={() => setNewPromo(p => ({ ...p, discount_type: t }))}
                        className="flex-1 h-11 rounded-2xl text-sm font-bold tap-scale"
                        style={newPromo.discount_type === t ? {
                          background: "linear-gradient(145deg, hsl(220 80% 16%), hsl(220 100% 8%))", boxShadow: "var(--shadow-navy)", color: "white"
                        } : { background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)", color: "hsl(var(--muted-foreground))" }}>
                        {t === "percentage" ? "% Discount" : "₦ Amount Off"}
                      </button>
                    ))}
                  </div>
                  <Input type="number" placeholder="Discount value" value={newPromo.discount_value} onChange={e => setNewPromo(p => ({ ...p, discount_value: e.target.value }))} />
                  <button onClick={handleAddPromotion}
                    className="w-full h-12 rounded-2xl text-white font-bold tap-scale"
                    style={{ background: "linear-gradient(145deg, hsl(220 80% 16%), hsl(220 100% 8%))", boxShadow: "var(--shadow-navy)" }}>
                    Create Promotion
                  </button>
                </div>
              </DialogContent>
            </Dialog>

            {promotions.length === 0 ? (
              <div className="rounded-3xl p-10 text-center" style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
                <Sparkles className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-bold text-foreground">No promotions yet</p>
                <p className="text-xs text-muted-foreground mt-1">Create one to attract customers.</p>
              </div>
            ) : promotions.map(p => (
              <div key={p.id} className="rounded-3xl p-4 flex items-center gap-3" style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-foreground text-sm">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.discount_type === "percentage" ? `${p.discount_value}% off` : `₦${p.discount_value?.toLocaleString()} off`}</p>
                </div>
                <button onClick={async () => { await supabase.from("promotions").delete().eq("id", p.id); setPromotions(prev => prev.filter(x => x.id !== p.id)); }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center tap-scale"
                  style={{ background: "hsl(0 60% 97%)", boxShadow: "var(--shadow-flat)" }}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;
