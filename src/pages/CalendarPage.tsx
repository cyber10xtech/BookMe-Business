import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, CheckCircle2, Clock, MapPin, Calendar, Phone, X, MessageSquare } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { useBookings, type EnrichedBooking } from "@/hooks/useBookings";
import { toast } from "sonner";

const WEEKDAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

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
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.text }}>{c.label}</span>;
};

const Avatar = ({ url, name, size = "md" }: { url?: string|null; name?: string|null; size?: "sm"|"md" }) => {
  const sz = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  const initials = (name || "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  return url
    ? <img src={url} alt={name||""} className={`${sz} rounded-full object-cover flex-shrink-0`} style={{ boxShadow: "var(--shadow-flat)" }} />
    : <div className={`${sz} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
        style={{ background: "linear-gradient(135deg, hsl(220 80% 40%), hsl(220 100% 20%))", boxShadow: "var(--shadow-flat)" }}>
        {initials}
      </div>;
};

const BookingSheet = ({ booking, onClose, onAccept, onReject, onComplete, accepting }: {
  booking: EnrichedBooking; onClose: () => void;
  onAccept: (id: string) => Promise<void>; onReject: (id: string) => Promise<void>;
  onComplete: (id: string) => Promise<void>; accepting: string|null;
}) => {
  const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-NG", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const accentGrad: Record<string, string> = {
    pending: "linear-gradient(135deg,#f59e0b,#d97706)", confirmed: "linear-gradient(135deg,#22c55e,#16a34a)",
    accepted: "linear-gradient(135deg,#22c55e,#16a34a)", completed: "linear-gradient(135deg,#3b82f6,#2563eb)",
    cancelled: "linear-gradient(135deg,#ef4444,#dc2626)", rejected: "linear-gradient(135deg,#ef4444,#dc2626)",
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-end" style={{ background: "rgba(13,22,38,0.55)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="w-full rounded-t-[2rem] flex flex-col animate-slide-up"
        style={{ background: "hsl(var(--background))", maxHeight: "90vh", boxShadow: "0 -8px 40px rgba(0,0,0,0.2)" }}
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full" style={{ background: "hsl(var(--muted-foreground)/0.3)" }} /></div>
        <div className="mx-4 rounded-3xl p-4 mb-2" style={{ background: accentGrad[booking.status] ?? accentGrad.confirmed }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-extrabold text-base">{booking.customer_name || "Customer"}</p>
              <p className="text-white/80 text-xs mt-0.5">{booking.service_name}</p>
              <div className="mt-1.5"><StatusBadge status={booking.status} /></div>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.2)" }}>
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Calendar, label: "Date", value: fmtDate(booking.booking_date) },
              { icon: Clock, label: "Time", value: booking.booking_time_text || booking.booking_time },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-3xl p-4" style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
                <Icon className="w-4 h-4 text-primary mb-1" />
                <p className="text-[10px] text-muted-foreground uppercase font-bold">{label}</p>
                <p className="text-sm font-bold text-foreground leading-tight mt-0.5">{value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-3xl p-4" style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
            <div className="flex justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">Service</p>
                <p className="text-sm font-bold">{booking.service_name || "—"}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">Total</p>
                <p className="text-xl font-extrabold text-primary">₦{(booking.total_price || booking.service_price || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
          {(booking.customer_phone || booking.customer_phone_from_profile) && (
            <a href={`tel:${booking.customer_phone || booking.customer_phone_from_profile}`}
              className="flex items-center gap-3 rounded-3xl p-4 tap-scale"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
                <Phone className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm font-bold flex-1">{booking.customer_phone || booking.customer_phone_from_profile}</p>
              <span className="text-xs font-bold text-primary px-2 py-1 rounded-xl" style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>Call</span>
            </a>
          )}
          {booking.notes && (
            <div className="rounded-3xl p-4" style={{ background: "hsl(38 100% 97%)", border: "1px solid hsl(38 92% 80%)" }}>
              <p className="text-[10px] font-bold text-amber-700 uppercase mb-1">Note</p>
              <p className="text-sm text-amber-900 italic">"{booking.notes}"</p>
            </div>
          )}
        </div>
        <div className="px-4 pt-3 space-y-2" style={{ borderTop: "1px solid hsl(var(--border))", background: "hsl(var(--background))", paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}>
          {booking.status === "pending" && (
            <div className="flex gap-3">
              <button onClick={() => onAccept(booking.id)} disabled={accepting === booking.id}
                className="flex-1 h-12 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 tap-scale"
                style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", boxShadow: "3px 3px 10px rgba(34,197,94,0.35)" }}>
                {accepting === booking.id ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                {accepting === booking.id ? "…" : "Accept"}
              </button>
              <button onClick={() => onReject(booking.id)}
                className="flex-1 h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 tap-scale"
                style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)", color: "hsl(0 84% 55%)", border: "1.5px solid hsl(0 84% 70%)" }}>
                <XCircle className="w-5 h-5" /> Decline
              </button>
            </div>
          )}
          {(booking.status === "confirmed" || booking.status === "accepted") && (
            <button onClick={() => onComplete(booking.id)}
              className="w-full h-12 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 tap-scale"
              style={{ background: "linear-gradient(145deg, hsl(220 80% 16%), hsl(220 100% 8%))", boxShadow: "var(--shadow-navy)" }}>
              <CheckCircle2 className="w-5 h-5" /> Mark as Completed
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const CalendarPage = () => {
  const { bookings, updateBookingStatus } = useBookings();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedBooking, setSelectedBooking] = useState<EnrichedBooking|null>(null);
  const [accepting, setAccepting] = useState<string|null>(null);

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date().toISOString().split("T")[0];
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const cells: { day: number; current: boolean; date: string }[] = [];
  for (let i = firstDow - 1; i >= 0; i--) cells.push({ day: prevDays - i, current: false, date: "" });
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d);
    cells.push({ day: d, current: true, date: dt.toISOString().split("T")[0] });
  }
  const rem = cells.length % 7;
  if (rem > 0) for (let d = 1; d <= 7 - rem; d++) cells.push({ day: d, current: false, date: "" });

  const byDate: Record<string, EnrichedBooking[]> = {};
  bookings.forEach(b => { if (!byDate[b.booking_date]) byDate[b.booking_date] = []; byDate[b.booking_date].push(b); });
  const selectedBookings = (byDate[selectedDate] || []).sort((a, b) => a.booking_time > b.booking_time ? 1 : -1);

  const handleAccept = useCallback(async (id: string) => { setAccepting(id); await updateBookingStatus(id, "accepted"); toast.success("Confirmed ✅"); setAccepting(null); setSelectedBooking(null); }, [updateBookingStatus]);
  const handleReject = useCallback(async (id: string) => { await updateBookingStatus(id, "rejected"); toast.info("Declined."); setSelectedBooking(null); }, [updateBookingStatus]);
  const handleComplete = useCallback(async (id: string) => { await updateBookingStatus(id, "completed"); toast.success("Completed 🎉"); setSelectedBooking(null); }, [updateBookingStatus]);

  const monthStats = {
    total:     bookings.filter(b => b.booking_date.startsWith(monthStr)).length,
    pending:   bookings.filter(b => b.status === "pending" && b.booking_date.startsWith(monthStr)).length,
    confirmed: bookings.filter(b => ["confirmed","accepted"].includes(b.status) && b.booking_date.startsWith(monthStr)).length,
    completed: bookings.filter(b => b.status === "completed" && b.booking_date.startsWith(monthStr)).length,
    revenue:   bookings.filter(b => b.status === "completed" && b.booking_date.startsWith(monthStr)).reduce((s, b) => s + (b.total_price || 0), 0),
  };

  const fmtSel = (d: string) => {
    if (!d) return "";
    if (d === today) return "Today";
    return new Date(d + "T00:00:00").toLocaleDateString("en-NG", { weekday: "long", month: "long", day: "numeric" });
  };

  const accentColor: Record<string, string> = { pending: "#f59e0b", confirmed: "#22c55e", accepted: "#22c55e", completed: "#3b82f6", cancelled: "#ef4444", rejected: "#ef4444" };

  return (
    <AppLayout>
      {selectedBooking && (
        <BookingSheet booking={selectedBooking} onClose={() => setSelectedBooking(null)}
          onAccept={handleAccept} onReject={handleReject} onComplete={handleComplete} accepting={accepting} />
      )}

      <div className="px-5 pt-5 pb-8">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-extrabold text-foreground">Calendar</h1>
          <button onClick={() => { setCurrentDate(new Date()); setSelectedDate(today); }}
            className="text-xs font-bold px-3 py-1.5 rounded-2xl tap-scale"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)", color: "hsl(var(--primary))" }}>
            Today
          </button>
        </div>

        {/* Month stats */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[
            { label: "Total",     value: monthStats.total,     color: "hsl(var(--foreground))" },
            { label: "Pending",   value: monthStats.pending,   color: "#f59e0b" },
            { label: "Confirmed", value: monthStats.confirmed, color: "#22c55e" },
            { label: "Done",      value: monthStats.completed, color: "#3b82f6" },
          ].map(s => (
            <div key={s.label} className="rounded-3xl p-3 text-center"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
              <p className="text-lg font-extrabold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Revenue */}
        {monthStats.revenue > 0 && (
          <div className="rounded-3xl p-4 mb-5 flex items-center justify-between"
            style={{ background: "linear-gradient(135deg, hsl(220 60% 15%), hsl(220 100% 8%))" }}>
            <div>
              <p className="text-white/70 text-xs font-semibold">{currentDate.toLocaleString("default", { month: "long" })} Revenue</p>
              <p className="text-white text-2xl font-extrabold">₦{monthStats.revenue.toLocaleString()}</p>
            </div>
            <span className="text-3xl">💰</span>
          </div>
        )}

        {/* Calendar grid */}
        <div className="rounded-3xl p-5 mb-5" style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
              className="w-10 h-10 rounded-2xl flex items-center justify-center tap-scale"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <h2 className="text-base font-extrabold">{currentDate.toLocaleString("default", { month: "long" })} {year}</h2>
            <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
              className="w-10 h-10 rounded-2xl flex items-center justify-center tap-scale"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
              <ChevronRight className="w-5 h-5 text-foreground" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map(d => <div key={d} className="text-center text-[10px] font-extrabold text-primary py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              const daybookings = cell.current ? (byDate[cell.date] || []) : [];
              const isSelected = cell.current && cell.date === selectedDate;
              const isToday    = cell.date === today;
              const hasPending = daybookings.some(b => b.status === "pending");
              const hasConf    = daybookings.some(b => ["confirmed","accepted"].includes(b.status));
              const hasDone    = daybookings.some(b => b.status === "completed");
              return (
                <button key={i} disabled={!cell.current}
                  onClick={() => cell.current && setSelectedDate(cell.date)}
                  className="aspect-square flex flex-col items-center justify-center rounded-2xl text-sm font-bold relative transition-all"
                  style={!cell.current ? { color: "hsl(var(--muted-foreground)/0.25)" }
                    : isSelected ? { background: "linear-gradient(145deg, hsl(220 80% 16%), hsl(220 100% 8%))", color: "white", boxShadow: "var(--shadow-navy)" }
                    : isToday   ? { background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)", color: "hsl(var(--primary))" }
                    : { color: "hsl(var(--foreground))" }}>
                  {cell.day}
                  {daybookings.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {hasPending && <span className="w-1 h-1 rounded-full" style={{ background: "#f59e0b" }} />}
                      {hasConf    && <span className="w-1 h-1 rounded-full" style={{ background: "#22c55e" }} />}
                      {hasDone    && <span className="w-1 h-1 rounded-full" style={{ background: "#3b82f6" }} />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex items-center justify-center gap-5 mt-4 pt-3" style={{ borderTop: "1px solid hsl(var(--border))" }}>
            {[{ color: "#f59e0b", label: "Pending" },{ color: "#22c55e", label: "Confirmed" },{ color: "#3b82f6", label: "Completed" }].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                <span className="text-[10px] text-muted-foreground font-semibold">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected day bookings */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-extrabold text-foreground text-base">{fmtSel(selectedDate)}</h3>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)", color: "hsl(var(--primary))" }}>
              {selectedBookings.length} booking{selectedBookings.length !== 1 ? "s" : ""}
            </span>
          </div>

          {selectedBookings.length === 0 ? (
            <div className="rounded-3xl p-8 text-center" style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
              <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No bookings on this day.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedBookings.map(b => {
                const accent = accentColor[b.status] ?? "#94a3b8";
                return (
                  <div key={b.id} onClick={() => setSelectedBooking(b)}
                    className="rounded-3xl overflow-hidden cursor-pointer tap-scale-sm"
                    style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
                    <div className="h-1 w-full" style={{ background: accent }} />
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 font-bold text-xs"
                          style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-inset)", color: accent }}>
                          {(b.booking_time_text || b.booking_time || "").slice(0, 5)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Avatar url={b.customer_avatar_url} name={b.customer_name} size="sm" />
                              <p className="font-bold text-sm truncate">{b.customer_name || "Customer"}</p>
                            </div>
                            <StatusBadge status={b.status} />
                          </div>
                          <p className="text-xs text-muted-foreground">{b.service_name}</p>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-sm font-extrabold" style={{ color: "hsl(var(--primary))" }}>
                              ₦{(b.total_price || b.service_price || 0).toLocaleString()}
                            </span>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              {b.delivery_mode === "at_home" ? "Home" : "Shop"}
                            </div>
                          </div>
                        </div>
                      </div>
                      {b.status === "pending" && (
                        <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: "1px solid hsl(var(--border))" }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleAccept(b.id)} disabled={accepting === b.id}
                            className="flex-1 h-9 rounded-2xl text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 tap-scale"
                            style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", boxShadow: "2px 2px 8px rgba(34,197,94,0.35)" }}>
                            {accepting === b.id ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                            {accepting === b.id ? "…" : "Accept"}
                          </button>
                          <button onClick={() => handleReject(b.id)}
                            className="flex-1 h-9 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 tap-scale"
                            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)", color: "#ef4444", border: "1.5px solid hsl(0 84% 80%)" }}>
                            <XCircle className="w-3.5 h-3.5" /> Decline
                          </button>
                        </div>
                      )}
                      {(b.status === "confirmed" || b.status === "accepted") && (
                        <div className="mt-3 pt-3" style={{ borderTop: "1px solid hsl(var(--border))" }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleComplete(b.id)}
                            className="w-full h-9 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 tap-scale"
                            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)", color: "hsl(var(--primary))" }}>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Mark as Completed
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default CalendarPage;
