import { useState } from "react";
import { Button } from "@/components/ui/button";

export type ReferralSource =
  | "shop_sticker_qr"
  | "book_me_rep"
  | "keke_bus"
  | "instagram_tiktok"
  | "online_ads"
  | "friend_referral";

const OPTIONS: { value: ReferralSource; label: string; emoji: string; description: string }[] = [
  {
    value: "shop_sticker_qr",
    label: "At a shop",
    emoji: "🏪",
    description: "Book Me sticker / QR code",
  },
  {
    value: "book_me_rep",
    label: "Book Me representative",
    emoji: "🤝",
    description: "A Book Me team member told me",
  },
  {
    value: "keke_bus",
    label: "Keke / Bus",
    emoji: "🛺",
    description: "I saw it on a keke or bus",
  },
  {
    value: "instagram_tiktok",
    label: "Instagram / TikTok",
    emoji: "📱",
    description: "Saw it on social media",
  },
  {
    value: "online_ads",
    label: "Online ads",
    emoji: "💻",
    description: "Google, YouTube or other ads",
  },
  {
    value: "friend_referral",
    label: "From a friend / referral",
    emoji: "👥",
    description: "A friend recommended Book Me",
  },
];

interface Props {
  onSelect: (source: ReferralSource) => void;
  onBack: () => void;
  loading?: boolean;
}

const StepReferral = ({ onSelect, onBack, loading }: Props) => {
  const [selected, setSelected] = useState<ReferralSource | null>(null);

  return (
    <div className="bg-card rounded-3xl p-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-foreground mb-1">One last thing 🎉</h2>
      <p className="text-muted-foreground text-sm mb-6">
        How did you hear about <strong>Book Me</strong>? This helps us grow!
      </p>

      <div className="space-y-3 mb-6">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setSelected(opt.value)}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
              selected === opt.value
                ? "border-primary bg-primary/5"
                : "border-border bg-secondary/40 hover:border-primary/30"
            }`}
          >
            <span className="text-2xl flex-shrink-0">{opt.emoji}</span>
            <div>
              <p className={`font-semibold text-sm ${selected === opt.value ? "text-primary" : "text-foreground"}`}>
                {opt.label}
              </p>
              <p className="text-xs text-muted-foreground">{opt.description}</p>
            </div>
            <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              selected === opt.value ? "border-primary bg-primary" : "border-muted-foreground/30"
            }`}>
              {selected === opt.value && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={loading} className="flex-1 h-12 rounded-xl">
          Back
        </Button>
        <Button
          onClick={() => selected && onSelect(selected)}
          disabled={!selected || loading}
          className="flex-1 h-12 rounded-xl"
        >
          {loading ? "Creating account…" : "Complete Setup"}
        </Button>
      </div>
    </div>
  );
};

export default StepReferral;
