import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Sparkles, ShieldCheck, Rocket } from "lucide-react";
import logo from "@/assets/logo.jpg";

interface WelcomePromotionModalProps {
  open: boolean;
  onContinue: () => void;
  /** How many founding-business slots the offer applies to (from promo_campaigns.max_claims) */
  spotCount?: number;
  /** ISO timestamp the granted trial expires at (from promo_claims.trial_end_at) */
  trialEndAt?: string;
  platformName?: string;
}

/** Renders "2 Months Free" / "6 Weeks Free" / "45 Days Free" depending on
 *  however many days the backend actually granted, so the copy always
 *  matches promo_campaigns.trial_days rather than assuming it's 2 months. */
const formatTrialLength = (trialEndAt?: string): string => {
  if (!trialEndAt) return "2 Months Free";
  const days = Math.round((new Date(trialEndAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Free Trial";
  if (days % 30 === 0) return `${days / 30} Month${days / 30 === 1 ? "" : "s"} Free`;
  if (days % 7 === 0) return `${days / 7} Week${days / 7 === 1 ? "" : "s"} Free`;
  return `${days} Days Free`;
};

const SPARKLE_POSITIONS = [
  { top: "6%", left: "12%", size: 7, delay: "0s" },
  { top: "14%", left: "85%", size: 5, delay: "0.15s" },
  { top: "78%", left: "8%", size: 6, delay: "0.3s" },
  { top: "82%", left: "90%", size: 8, delay: "0.45s" },
  { top: "4%", left: "55%", size: 5, delay: "0.6s" },
  { top: "88%", left: "50%", size: 6, delay: "0.75s" },
];

const WelcomePromotionModal = ({
  open,
  onContinue,
  spotCount = 300,
  trialEndAt,
  platformName = "BookMe",
}: WelcomePromotionModalProps) => {
  const trialLengthLabel = formatTrialLength(trialEndAt);
  return (
    <DialogPrimitive.Root open={open}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-[100] bg-navy/70 backdrop-blur-sm data-[state=open]:animate-fade-in"
        />
        <DialogPrimitive.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="fixed left-1/2 top-1/2 z-[101] w-[92vw] max-w-[400px] -translate-x-1/2 -translate-y-1/2 outline-none sm:max-w-[420px]"
        >
          <DialogPrimitive.Title className="sr-only">
            Welcome founding-business offer
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            You are one of the first {spotCount} businesses on {platformName}. Enjoy{" "}
            {trialLengthLabel.toLowerCase()} access, no card required.
          </DialogPrimitive.Description>

          <div className="relative overflow-hidden rounded-[28px] bg-white shadow-[0_24px_70px_-15px_rgba(4,10,30,0.55)] animate-welcome-pop">
            {/* Decorative navy header panel */}
            <div className="relative bg-gradient-to-br from-[hsl(220,100%,12%)] via-[hsl(220,90%,16%)] to-[hsl(220,100%,9%)] px-6 pt-8 pb-14 text-center">
              {/* sparkles */}
              {SPARKLE_POSITIONS.map((s, i) => (
                <span
                  key={i}
                  className="absolute rounded-full bg-amber-300 animate-sparkle-pop"
                  style={{
                    top: s.top,
                    left: s.left,
                    width: s.size,
                    height: s.size,
                    animationDelay: s.delay,
                    boxShadow: "0 0 8px 2px rgba(252,211,77,0.55)",
                  }}
                />
              ))}

              <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/25 backdrop-blur-sm">
                <img src={logo} alt={platformName} className="h-10 w-10 rounded-xl object-cover" />
              </div>

              <div className="relative mx-auto mb-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 bg-[length:200%_auto] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-navy shadow-sm animate-shimmer">
                <Sparkles className="h-3 w-3" />
                Founding Business Reward
              </div>

              <h2 className="relative text-2xl font-extrabold leading-tight text-white">
                Welcome to {platformName} 🎉
              </h2>
            </div>

            {/* Card body — overlaps header slightly for depth */}
            <div className="relative -mt-8 rounded-t-[26px] bg-white px-6 pb-6 pt-6">
              <p className="text-center text-[15px] leading-relaxed text-foreground/80">
                You&apos;re one of the first{" "}
                <span className="font-bold text-navy">{spotCount}</span> businesses on{" "}
                <span className="font-semibold text-navy">{platformName}</span> — and that comes
                with a reward.
              </p>

              <div className="my-5 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-50 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                  Your welcome gift
                </p>
                <p className="mt-1 text-3xl font-extrabold text-navy">
                  {trialLengthLabel}
                </p>
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  Full access to every {platformName} Business feature
                </p>
              </div>

              <div className="mb-6 flex items-center justify-center gap-5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-success" />
                  No card required
                </span>
                <span className="flex items-center gap-1.5">
                  <Rocket className="h-3.5 w-3.5 text-success" />
                  No payment now
                </span>
              </div>

              <button
                type="button"
                onClick={onContinue}
                className="tap-scale w-full rounded-2xl py-4 text-base font-semibold text-white transition-transform"
                style={{
                  background: "linear-gradient(145deg, hsl(220 80% 16%), hsl(220 100% 8%))",
                  boxShadow: "5px 5px 12px #0a1020, -5px -5px 12px #182848",
                }}
              >
                Continue
              </button>

              <p className="mt-3 text-center text-[11px] text-muted-foreground/70">
                Offer reserved for the first {spotCount} businesses that join {platformName}.
              </p>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default WelcomePromotionModal;
