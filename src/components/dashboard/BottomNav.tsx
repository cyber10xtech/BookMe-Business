import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Calendar, Users, Home, MoreHorizontal } from "lucide-react";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Calendar,        label: "Calendar",  path: "/calendar"  },
  { icon: Users,           label: "Clients",   path: "/clients"   },
  { icon: Home,            label: "Profile",   path: "/home"      },
  { icon: MoreHorizontal,  label: "More",      path: "/more"      },
];

const BottomNav = () => {
  const location = useNavigate();
  const navigate  = useNavigate();
  const loc       = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: "hsl(var(--background))",
        boxShadow: "0 -4px 20px var(--neu-dark), 0 -1px 4px var(--neu-light)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex items-stretch justify-around max-w-lg mx-auto h-[60px] px-2">
        {NAV_ITEMS.map((item) => {
          const active = loc.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex-1 flex flex-col items-center justify-center gap-1 relative tap-scale select-none"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              {/* Icon container */}
              <div
                className="w-10 h-8 rounded-xl flex items-center justify-center relative transition-all duration-200"
                style={active ? {
                  background: "hsl(var(--background))",
                  boxShadow: "inset 3px 3px 7px var(--neu-dark), inset -2px -2px 5px var(--neu-light)",
                } : {}}
              >
                <item.icon
                  className="transition-colors duration-200"
                  style={{
                    width: 19, height: 19,
                    color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                    strokeWidth: active ? 2.5 : 1.8,
                  }}
                />
              </div>

              {/* Label */}
              <span
                className="text-[9px] font-bold leading-none transition-colors duration-200"
                style={{ color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
              >
                {item.label}
              </span>

              {/* Active dot */}
              {active && (
                <span
                  className="absolute bottom-0.5 w-1 h-1 rounded-full"
                  style={{ background: "hsl(var(--primary))", boxShadow: "0 0 4px hsl(var(--primary))" }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
