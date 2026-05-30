import { Bell, CheckCheck, Trash2 } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";

const TYPE_CONFIG: Record<string, { emoji: string; accent: string }> = {
  booking_accepted:    { emoji: "✅", accent: "hsl(142 71% 38%)" },
  booking_rejected:    { emoji: "❌", accent: "hsl(0 84% 60%)"   },
  booking_completed:   { emoji: "🎉", accent: "hsl(220 100% 40%)" },
  booking_rescheduled: { emoji: "📅", accent: "hsl(38 92% 50%)"  },
  booking_reminder:    { emoji: "⏰", accent: "hsl(38 92% 50%)"  },
  new_message:         { emoji: "💬", accent: "hsl(220 80% 50%)" },
  new_booking:         { emoji: "📋", accent: "hsl(220 100% 12%)" },
  new_review:          { emoji: "⭐", accent: "hsl(38 92% 50%)"  },
  promotion:           { emoji: "🎁", accent: "hsl(280 60% 50%)" },
  info:                { emoji: "ℹ️",  accent: "hsl(220 50% 50%)" },
};

const NotificationsPage = () => {
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const unread = notifications.filter(n => !n.is_read);
  const read   = notifications.filter(n => n.is_read);

  const NotiCard = ({ n }: { n: typeof notifications[0] }) => {
    const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
    return (
      <button
        onClick={() => !n.is_read && markAsRead(n.id)}
        className="w-full text-left rounded-3xl p-4 transition-all tap-scale-sm flex items-start gap-3"
        style={n.is_read ? {
          background: "hsl(var(--background))",
          boxShadow: "var(--shadow-flat)",
          opacity: 0.7,
        } : {
          background: "hsl(var(--background))",
          boxShadow: "var(--shadow-raised)",
        }}
      >
        {/* Emoji icon */}
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-lg"
          style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-flat)" }}>
          {cfg.emoji}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-foreground leading-tight">{n.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
            {n.body || (n as any).message || ""}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1.5 font-medium">
            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
          </p>
        </div>

        {/* Unread dot */}
        {!n.is_read && (
          <div className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
            style={{ background: cfg.accent, boxShadow: `0 0 6px ${cfg.accent}` }} />
        )}
      </button>
    );
  };

  return (
    <AppLayout>
      <div className="px-5 pt-5 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {unreadCount} unread message{unreadCount > 1 ? "s" : ""}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button onClick={markAllAsRead}
                className="h-9 px-3 rounded-2xl text-xs font-bold text-primary flex items-center gap-1.5 tap-scale"
                style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-3xl skeleton" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center py-20">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
              <Bell className="w-9 h-9 text-muted-foreground" />
            </div>
            <p className="text-base font-bold text-foreground">All caught up</p>
            <p className="text-sm text-muted-foreground mt-1">No notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {unread.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">New</p>
                <div className="space-y-2">
                  {unread.map(n => <NotiCard key={n.id} n={n} />)}
                </div>
              </div>
            )}
            {read.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">Earlier</p>
                <div className="space-y-2">
                  {read.slice(0, 20).map(n => <NotiCard key={n.id} n={n} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default NotificationsPage;
