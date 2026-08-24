import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown, ChevronUp, CheckCircle2, Circle,
  ShieldAlert, ArrowRight, Zap,
} from "lucide-react";
import type { CompletionItem } from "@/hooks/useProfileCompletion";
import { COMPLETION_THRESHOLD } from "@/hooks/useProfileCompletion";

interface ProfileCompletionBarProps {
  percentage: number;
  missingItems: CompletionItem[];
  completedItems: CompletionItem[];
  isShadowBanned: boolean;
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function progressColor(pct: number): string {
  if (pct < 50) return "bg-rose-500";
  if (pct < COMPLETION_THRESHOLD) return "bg-amber-500";
  if (pct < 90) return "bg-primary";
  return "bg-emerald-500";
}

function ringStroke(pct: number): string {
  if (pct < 50) return "#f43f5e";
  if (pct < COMPLETION_THRESHOLD) return "#f59e0b";
  if (pct < 90) return "hsl(220 100% 12%)";
  return "#10b981";
}

function badgeStyle(pct: number, banned: boolean) {
  if (banned) return "bg-rose-50 text-rose-700 border-rose-200";
  if (pct < 90) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

function statusLabel(pct: number, banned: boolean) {
  if (banned) return "Hidden from customers";
  if (pct < 90) return "Almost there";
  return "Fully optimised ✨";
}

/* ── Component ────────────────────────────────────────────────────────────── */
export default function ProfileCompletionBar({
  percentage,
  missingItems,
  completedItems,
  isShadowBanned,
}: ProfileCompletionBarProps) {
  const [expanded, setExpanded] = useState(isShadowBanned);
  const navigate = useNavigate();

  const stroke = ringStroke(percentage);
  const totalItems = missingItems.length + completedItems.length;
  const doneCount = completedItems.length;

  return (
    <div className="px-4 pt-3 pb-1 space-y-2">

      {/* ── Shadow-ban alert banner ──────────────────────────────────────── */}
      {isShadowBanned && (
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3.5">
          <div className="mt-0.5 w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-4.5 h-4.5 text-rose-600" style={{ width: 18, height: 18 }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-rose-800 leading-snug">
              Your business is currently hidden
            </p>
            <p className="text-xs text-rose-600 mt-0.5 leading-relaxed">
              You're at <span className="font-bold">{percentage}%</span>. Reach{" "}
              <span className="font-bold">{COMPLETION_THRESHOLD}%</span> to appear in customer
              searches.
            </p>
          </div>
          <button
            onClick={() => navigate("/edit-profile")}
            className="mt-0.5 flex-shrink-0 text-[10px] font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 border border-rose-200 rounded-lg px-2.5 py-1.5 transition-colors whitespace-nowrap"
          >
            Fix now
          </button>
        </div>
      )}

      {/* ── Completion card ──────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">

        {/* Header row */}
        <button
          className="w-full flex items-center gap-3.5 px-4 pt-4 pb-3 active:bg-secondary/60 transition-colors"
          onClick={() => setExpanded((p) => !p)}
        >
          {/* SVG ring */}
          <div className="relative w-11 h-11 flex-shrink-0">
            <svg className="w-11 h-11 -rotate-90" viewBox="0 0 40 40">
              <circle
                cx="20" cy="20" r="16"
                fill="none"
                stroke="hsl(220 13% 91%)"
                strokeWidth="3.5"
              />
              <circle
                cx="20" cy="20" r="16"
                fill="none"
                stroke={stroke}
                strokeWidth="3.5"
                strokeDasharray={`${(percentage / 100) * 100.53} 100.53`}
                strokeLinecap="round"
                style={{ transition: "stroke-dasharray 0.7s ease" }}
              />
            </svg>
            <span
              className="absolute inset-0 flex items-center justify-center font-extrabold text-foreground"
              style={{ fontSize: 10 }}
            >
              {percentage}%
            </span>
          </div>

          {/* Labels */}
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-foreground">Profile completion</p>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeStyle(
                  percentage,
                  isShadowBanned
                )}`}
              >
                {statusLabel(percentage, isShadowBanned)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {doneCount} of {totalItems} steps complete
              {missingItems.length > 0 && !isShadowBanned && (
                <> · <span className="text-primary font-semibold">{missingItems.length} remaining</span></>
              )}
            </p>
          </div>

          {/* Chevron */}
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
            {expanded
              ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
              : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            }
          </div>
        </button>

        {/* Progress bar */}
        <div className="px-4 pb-3.5">
          <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${progressColor(percentage)}`}
              style={{ width: `${percentage}%` }}
            />
            {/* threshold tick */}
            <div
              className="absolute top-0 h-full w-0.5 bg-border z-10"
              style={{ left: `${COMPLETION_THRESHOLD}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-1.5">
            <span className="text-[10px] text-muted-foreground">0%</span>
            <div className="flex items-center gap-1">
              <div className="w-0.5 h-2.5 bg-border rounded-full" />
              <span className="text-[10px] font-semibold text-muted-foreground">
                {COMPLETION_THRESHOLD}% to go live
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">100%</span>
          </div>
        </div>

        {/* ── Expandable checklist ─────────────────────────────────────── */}
        {expanded && (
          <div className="border-t border-border">
            {/* Incomplete items */}
            {missingItems.length > 0 && (
              <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  To do
                </p>
                <div className="space-y-0.5">
                  {missingItems.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => item.route && navigate(item.route)}
                      className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-secondary active:bg-secondary/80 transition-colors group text-left"
                    >
                      <div className="w-5 h-5 rounded-full border-2 border-border flex items-center justify-center flex-shrink-0 group-hover:border-primary/40 transition-colors">
                        <Circle className="w-2 h-2 text-muted-foreground/40" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground leading-tight">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">
                          {item.hint}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] font-bold text-primary bg-primary/8 px-1.5 py-0.5 rounded-md border border-primary/15">
                          +{item.weight}%
                        </span>
                        {item.route && (
                          <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Complete items */}
            {completedItems.length > 0 && (
              <div className="px-4 pt-2 pb-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Done
                </p>
                <div className="space-y-0.5">
                  {completedItems.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center gap-3 py-2 px-3"
                    >
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 flex-shrink-0" style={{ width: 18, height: 18 }} />
                      <p className="flex-1 text-xs text-muted-foreground line-through">{item.label}</p>
                      <span className="text-[10px] font-bold text-emerald-600 flex-shrink-0">
                        +{item.weight}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA when shadow-banned */}
            {isShadowBanned && (
              <div className="px-4 pb-4 pt-1">
                <button
                  onClick={() => navigate("/edit-profile")}
                  className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-sm"
                >
                  <Zap className="w-4 h-4" />
                  Complete profile to go live
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
