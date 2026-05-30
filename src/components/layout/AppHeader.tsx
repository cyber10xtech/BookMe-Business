import { Menu, MessageSquare, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.jpg";

interface AppHeaderProps { onMenuOpen: () => void; }

const AppHeader = ({ onMenuOpen }: AppHeaderProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [bellSwing, setBellSwing] = useState(false);
  const swingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Periodic bell swing when there are unread notifications
  useEffect(() => {
    if (swingTimerRef.current) clearInterval(swingTimerRef.current);
    if (unreadCount > 0) {
      setBellSwing(true);
      swingTimerRef.current = setInterval(() => {
        setBellSwing(false);
        setTimeout(() => setBellSwing(true), 100);
      }, 3500);
    } else {
      setBellSwing(false);
    }
    return () => { if (swingTimerRef.current) clearInterval(swingTimerRef.current); };
  }, [unreadCount]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      setUnreadCount(count || 0);
    };
    fetch();
    const ch = supabase.channel(`hdr-notif-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: "hsl(var(--background))",
        boxShadow: "0 4px 16px var(--neu-dark), 0 -2px 8px var(--neu-light)",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <div className="flex items-center justify-between px-5 h-14">
        {/* Menu button */}
        <button
          onClick={onMenuOpen}
          className="w-10 h-10 rounded-2xl flex items-center justify-center tap-scale"
          style={{ boxShadow: "var(--shadow-raised)", background: "hsl(var(--card))" }}
        >
          <Menu className="w-[18px] h-[18px] text-foreground" strokeWidth={2.2} />
        </button>

        {/* Logo + wordmark */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl overflow-hidden"
            style={{ boxShadow: "var(--shadow-flat)" }}
          >
            <img src={logo} alt="BookMe" className="w-full h-full object-cover" />
          </div>
          <span className="text-[15px] font-extrabold text-foreground tracking-tight">
            BookMe <span className="text-primary/70">Business</span>
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/messages")}
            className="w-10 h-10 rounded-2xl flex items-center justify-center tap-scale"
            style={{ boxShadow: "var(--shadow-raised)", background: "hsl(var(--card))" }}
          >
            <MessageSquare className="w-[18px] h-[18px] text-foreground" strokeWidth={2} />
          </button>
          <button
            onClick={() => navigate("/notifications")}
            className="w-10 h-10 rounded-2xl flex items-center justify-center tap-scale relative"
            style={{ boxShadow: "var(--shadow-raised)", background: "hsl(var(--card))" }}
          >
            <Bell
              className={`w-[18px] h-[18px] text-foreground${bellSwing ? " animate-bell-swing" : ""}`}
              strokeWidth={2}
              style={{ transformOrigin: "top center" }}
            />
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-destructive text-white text-[9px] font-extrabold rounded-full flex items-center justify-center"
                style={{ boxShadow: "0 0 0 2px hsl(var(--card)), 0 0 8px hsl(var(--destructive) / 0.6)" }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
