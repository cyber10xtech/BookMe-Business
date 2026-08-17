import { X, LayoutDashboard, Calendar, Users, Home, MoreHorizontal, Bell, LogOut, ChevronRight } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import logo from "@/assets/logo.jpg";

interface SidebarProps { open: boolean; onClose: () => void; }

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard",     path: "/dashboard", emoji: "📊" },
  { icon: Calendar,        label: "Calendar",       path: "/calendar",  emoji: "📅" },
  { icon: Users,           label: "Clients",        path: "/clients",   emoji: "👥" },
  { icon: Home,            label: "Profile",        path: "/home",      emoji: "🏠" },
  { icon: Bell,            label: "Notifications",  path: "/notifications", emoji: "🔔" },
  { icon: MoreHorizontal,  label: "Settings",       path: "/more",      emoji: "⚙️" },
];

const Sidebar = ({ open, onClose }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { profile } = useProfile();

  const handleNav = (path: string) => { navigate(path); onClose(); };
  const handleLogout = async () => { await signOut(); navigate("/signin"); onClose(); };

  const initials = (profile?.business_name || "B")[0]?.toUpperCase() || "B";

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 transition-all duration-300 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        style={{ background: "rgba(13,22,38,0.55)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 bottom-0 z-50 flex flex-col transition-transform duration-300 ease-out`}
        style={{
          width: "76vw",
          maxWidth: "300px",
          background: "linear-gradient(160deg, hsl(220 60% 15%), hsl(220 100% 8%))",
          boxShadow: "12px 0 40px rgba(0,0,0,0.4)",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-white/20"
              style={{ boxShadow: "3px 3px 8px rgba(0,0,0,0.4)" }}>
              <img src={logo} alt="BookMe" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">BookMe Business</p>
              <p className="text-white/50 text-[10px]">Provider Portal</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.08)", boxShadow: "inset 1px 1px 3px rgba(0,0,0,0.3)" }}>
            <X className="w-4 h-4 text-white/70" />
          </button>
        </div>

        {/* Profile mini card */}
        {profile && (
          <div className="mx-4 my-4 rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.06)", boxShadow: "inset 2px 2px 6px rgba(0,0,0,0.3)" }}>
            <div className="flex items-center gap-3">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} className="w-12 h-12 rounded-full object-cover border-2 border-white/20" alt="avatar" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center border-2 border-white/20">
                  <span className="text-white font-bold text-lg">{initials}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm truncate">{profile.business_name || "Your Business"}</p>
                <p className="text-white/50 text-[11px] truncate">{profile.city || profile.state || "Nigeria"}</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button key={item.path} onClick={() => handleNav(item.path)}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all tap-scale"
                style={active ? {
                  background: "rgba(255,255,255,0.14)",
                  boxShadow: "inset 2px 2px 6px rgba(0,0,0,0.25), inset -1px -1px 3px rgba(255,255,255,0.05)",
                  color: "white",
                } : { color: "rgba(255,255,255,0.55)" }}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" strokeWidth={active ? 2.4 : 1.8} />
                <span className="flex-1 text-left">{item.label}</span>
                {active && <ChevronRight className="w-4 h-4 opacity-60" />}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-white/10"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all tap-scale"
            style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>
            <LogOut className="w-5 h-5" />
            Log Out
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
