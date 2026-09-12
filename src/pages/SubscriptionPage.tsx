import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Clock, ShieldCheck, Zap, Sparkles } from "lucide-react";

const TARGET_DATE = new Date("2027-06-01T00:00:00+01:00").getTime();

export default function SubscriptionPage() {
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, TARGET_DATE - Date.now()));

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, TARGET_DATE - Date.now());
      setTimeLeft(remaining);
      if (remaining === 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const d = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const h = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
  const m = Math.floor((timeLeft / 1000 / 60) % 60);
  const s = Math.floor((timeLeft / 1000) % 60);

  return (
    <AppLayout>
      <div className="px-5 pt-6 pb-10 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary/10">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground leading-tight">My Subscription</h1>
            <p className="text-sm text-muted-foreground">Manage your BookMe plan</p>
          </div>
        </div>

        {/* Current Active Plan */}
        <div className="rounded-3xl p-5 border-2 border-emerald-500/20"
          style={{ background: "linear-gradient(135deg, hsl(142 50% 95%), hsl(142 50% 90%))", boxShadow: "var(--shadow-raised)" }}>
          <div className="flex items-center justify-between mb-4">
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full uppercase tracking-wider">
              Active Plan
            </span>
            <span className="text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
            </span>
          </div>
          
          <h2 className="text-3xl font-extrabold text-emerald-950 mb-1">Free Plan</h2>
          <p className="text-emerald-800 text-sm font-medium">Enjoy unlimited access to all basic features.</p>
          
          <div className="mt-4 pt-4 border-t border-emerald-500/20 space-y-2">
            {[
              "Unlimited service listings",
              "Unlimited booking requests",
              "In-app chat with customers",
              "Real-time notifications"
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-emerald-900">
                <CheckIcon />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Premium Plans */}
        <div className="rounded-3xl p-5"
          style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)", border: "1px solid hsl(var(--border))" }}>
          
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-bold text-foreground">Premium Upgrades</h3>
          </div>
          
          <p className="text-sm text-muted-foreground mb-5">
            Subscriptions will begin June 1st. Get ready for premium tools to boost your business growth!
          </p>

          {/* Countdown Timer */}
          <div className="bg-secondary/50 rounded-2xl p-4 border border-border">
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-3">
              <Clock className="w-4 h-4" />
              <span>Launching In</span>
            </div>
            
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: "Days", val: d },
                { label: "Hours", val: h },
                { label: "Mins", val: m },
                { label: "Secs", val: s },
              ].map((item, i) => (
                <div key={i} className="bg-background rounded-xl p-2 border border-border" style={{ boxShadow: "var(--shadow-inset)" }}>
                  <p className="text-xl font-extrabold text-foreground">{item.val}</p>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wide">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
