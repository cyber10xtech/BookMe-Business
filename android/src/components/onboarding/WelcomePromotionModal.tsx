import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Store, Crown } from "lucide-react";

interface WelcomePromotionModalProps {
  open: boolean;
  onContinue: () => void;
  spotCount?: number;
  trialEndAt?: string;
  platformName?: string;
}

const WelcomePromotionModal = ({
  open,
  onContinue,
}: WelcomePromotionModalProps) => {
  return (
    <DialogPrimitive.Root open={open}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm data-[state=open]:animate-fade-in"
        />
        <DialogPrimitive.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="fixed left-1/2 top-1/2 z-[101] w-[90vw] max-w-[370px] -translate-x-1/2 -translate-y-1/2 outline-none sm:max-w-[400px]"
        >
          <DialogPrimitive.Title className="sr-only">
            Welcome to BookMe
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Your business is now listed on BookMe for FREE. Enjoy Premium benefits FREE for your first 2 months. No card. No payment required.
          </DialogPrimitive.Description>

          <div className="relative overflow-hidden rounded-[26px] bg-white p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.25)] animate-scale-in">
            {/* Top Party Popper Icon Badge */}
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#EBF4FF]">
              <div className="relative flex items-center justify-center">
                <svg
                  viewBox="0 0 64 64"
                  className="h-12 w-12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Confetti Specks & Streamers */}
                  <circle cx="20" cy="18" r="2.5" fill="#EF4444" />
                  <circle cx="28" cy="12" r="2" fill="#3B82F6" />
                  <circle cx="38" cy="14" r="2.5" fill="#10B981" />
                  <circle cx="44" cy="22" r="2" fill="#F59E0B" />
                  <circle cx="16" cy="28" r="1.5" fill="#F59E0B" />
                  <circle cx="48" cy="14" r="1.5" fill="#EF4444" />

                  <path d="M22 24L18 20" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
                  <path d="M34 18L36 12" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
                  <path d="M42 26L48 24" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />

                  {/* Party Popper Cone */}
                  <path
                    d="M18 46L30 34L44 48L32 60L18 46Z"
                    fill="#F59E0B"
                  />
                  <path
                    d="M18 46L34 18L46 30L30 46H18Z"
                    fill="#FBBF24"
                  />
                  {/* Horn stripes */}
                  <path
                    d="M24 38L32 26"
                    stroke="#3B82F6"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <path
                    d="M28 42L38 32"
                    stroke="#EF4444"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            {/* Title & Accent Divider */}
            <h2 className="text-center text-2xl font-bold text-[#0F172A] tracking-tight">
              Welcome to BookMe <span className="inline-block">🎉</span>
            </h2>
            <div className="mx-auto my-3.5 h-[3px] w-10 rounded-full bg-[#CBDCF7]" />

            {/* Benefit Items */}
            <div className="divide-y divide-gray-100/90 text-left">
              {/* Item 1 */}
              <div className="flex items-center gap-3.5 py-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0066FF] text-white shadow-sm">
                  <Store className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium leading-snug text-slate-700">
                  Your business is now listed on BookMe for{" "}
                  <span className="font-bold text-[#0066FF]">FREE</span>.
                </p>
              </div>

              {/* Item 2 */}
              <div className="flex items-center gap-3.5 py-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFB800] text-white shadow-sm">
                  <Crown className="h-5 w-5 fill-current" />
                </div>
                <p className="text-sm font-medium leading-snug text-slate-700">
                  Enjoy Premium benefits{" "}
                  <span className="font-bold text-[#0066FF]">FREE</span> for your first 2 months.
                </p>
              </div>

              {/* Item 3 */}
              <div className="flex items-center gap-3.5 py-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#10B981] text-white shadow-sm">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5 stroke-current fill-none"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                    <line x1="3" y1="21" x2="21" y2="3" strokeWidth="2.5" />
                  </svg>
                </div>
                <p className="text-sm font-medium leading-snug text-slate-700">
                  <span className="font-bold text-slate-900">No card.</span>{" "}
                  <span className="font-bold text-slate-900">No payment required.</span>
                </p>
              </div>
            </div>

            {/* CTA Button */}
            <button
              type="button"
              onClick={onContinue}
              className="mt-5 w-full rounded-2xl bg-[#0066FF] py-3.5 text-center text-base font-semibold text-white shadow-md transition-all hover:bg-[#0052CC] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#0066FF]/50"
            >
              Continue
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default WelcomePromotionModal;
