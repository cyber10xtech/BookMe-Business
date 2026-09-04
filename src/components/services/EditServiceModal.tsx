import { useState, useRef, useMemo } from "react";
import { Camera, X, Clock, AlertCircle, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Service } from "@/hooks/useServices";

function parseDurationToMinutes(dur: string): number {
  if (!dur) return 60;
  let mins = 0;
  const hrMatch = dur.match(/(\d+)\s*hr/);
  const minMatch = dur.match(/(\d+)\s*min/);
  if (hrMatch) mins += parseInt(hrMatch[1]) * 60;
  if (minMatch) mins += parseInt(minMatch[1]);
  return mins || 60;
}

function minsToLabel(m: number): string {
  if (!m || m <= 0) return "1 hr";
  if (m < 60) return `${m} mins`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r > 0 ? `${h} hr ${r} mins` : `${h} hr`;
}

const EMOJI_OPTIONS = ["⭐", "💈", "✂️", "🎨", "💅", "💄", "🎤", "🧹", "🐾"];

export interface EditServiceModalProps {
  service: Service;
  userId: string;
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    durationMins: number;
    price: number;
    maxPrice?: number;
    pricingType: "fixed" | "range";
    emoji: string;
    descText: string;
    imageUrls: string[];
  }) => Promise<void>;
}

export const EditServiceModal = ({ service, userId, open, onClose, onSave }: EditServiceModalProps) => {
  const meta = useMemo(() => {
    try {
      return JSON.parse(service.description || "{}");
    } catch {
      return {};
    }
  }, [service.description]);

  const isDefault = service.is_featured === true || meta.isLocked === true;

  // Form state initialized ONLY when modal mounts for this specific service
  const [name, setName] = useState<string>(service.name || "");
  const [durationMins, setDurationMins] = useState<number>(
    service.duration_minutes || parseDurationToMinutes(service.duration || "60 mins")
  );
  const [pricingType, setPricingType] = useState<"fixed" | "range">(meta.pricingType || "fixed");
  const [price, setPrice] = useState<number>(service.price || 0);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(meta.maxPrice);
  const [emoji, setEmoji] = useState<string>(meta.emoji || "⭐");
  const [descText, setDescText] = useState<string>(meta.description || "");
  const [images, setImages] = useState<string[]>(meta.imageUrls || []);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const photoRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, slot: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSlot(slot);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/services/${Date.now()}_${slot}.${ext}`;
    const { error } = await supabase.storage.from("business-assets").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Photo upload failed: " + error.message);
      setUploadingSlot(null);
      e.target.value = "";
      return;
    }
    const { data } = supabase.storage.from("business-assets").getPublicUrl(path);
    setImages((prev) => {
      const next = [...prev];
      next[slot] = data.publicUrl;
      return next.filter(Boolean);
    });
    setUploadingSlot(null);
    e.target.value = "";
  };

  const removePhoto = (slot: number) => {
    setImages((prev) => prev.filter((_, i) => i !== slot));
  };

  const twoX = price * 2;
  const exceeds = pricingType === "range" && maxPrice !== undefined && maxPrice > twoX && price > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-3xl max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6">
        <DialogHeader className="border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              <DialogTitle className="text-base font-bold text-foreground">
                Edit {isDefault ? "Default Service" : "Service"}
              </DialogTitle>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isDefault
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-secondary text-muted-foreground border-border"
              }`}
            >
              {isDefault ? "Profile-managed" : "Custom Service"}
            </span>
          </div>
          <DialogDescription className="text-xs text-muted-foreground text-left mt-1">
            Update service details. Changes apply immediately to your business profile.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Service Name */}
          <div>
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 block">
              Service Name
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard Haircut"
              className="h-11 rounded-xl bg-secondary border-0 font-semibold text-sm"
            />
          </div>

          {/* Duration & Emoji */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 block">
                Duration
              </Label>
              <div className="flex items-center rounded-xl bg-secondary border-0 h-11 px-3">
                <Clock className="w-4 h-4 text-muted-foreground mr-1.5 flex-shrink-0" />
                <input
                  type="number"
                  value={durationMins}
                  onChange={(e) =>
                    setDurationMins(Math.max(5, Math.min(480, Number(e.target.value) || 60)))
                  }
                  className="w-12 bg-transparent text-sm font-semibold outline-none text-foreground"
                />
                <span className="text-[11px] text-muted-foreground font-bold truncate ml-auto">
                  {minsToLabel(durationMins)}
                </span>
              </div>
            </div>
            <div>
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 block">
                Icon / Emoji
              </Label>
              <div className="flex items-center rounded-xl bg-secondary border-0 h-11 px-2 gap-1">
                <input
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value.slice(0, 2))}
                  placeholder="⭐"
                  className="w-7 text-center text-sm font-bold bg-transparent outline-none text-foreground"
                />
                <div className="flex gap-1 overflow-x-auto scrollbar-hide py-1">
                  {EMOJI_OPTIONS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setEmoji(em)}
                      className={`text-xs px-1 rounded transition-transform ${
                        emoji === em ? "scale-125 font-bold" : "opacity-60"
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Description Text */}
          <div>
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 block">
              Description
            </Label>
            <Textarea
              value={descText}
              onChange={(e) => setDescText(e.target.value)}
              placeholder="Describe what this service includes..."
              className="min-h-[70px] text-xs bg-secondary border-0 rounded-xl"
            />
          </div>

          {/* Photos Management */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                Service Photos ({images.length}/3)
              </Label>
              <span className="text-[11px] font-semibold text-muted-foreground">
                {images.length > 0 ? "Tap change/remove" : "Optional (up to 3)"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((slot) => {
                const url = images[slot];
                const isLoading = uploadingSlot === slot;
                const canShowSlot = slot <= images.length && slot < 3;
                if (!canShowSlot) return null;
                return (
                  <div key={slot} className="relative aspect-square">
                    <input
                      ref={photoRefs[slot]}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePhotoUpload(e, slot)}
                    />
                    {url ? (
                      <>
                        <img
                          src={url}
                          alt=""
                          className="w-full h-full object-cover rounded-xl border border-border"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(slot)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center z-10 shadow-sm"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => !isLoading && photoRefs[slot].current?.click()}
                          className="absolute bottom-1 right-1 bg-black/60 text-white rounded px-1.5 py-0.5 text-[9px] font-bold"
                        >
                          Change
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => !isLoading && photoRefs[slot].current?.click()}
                        disabled={isLoading}
                        className="w-full h-full rounded-xl bg-secondary border-1.5 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors"
                      >
                        {isLoading ? (
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Camera className="w-4 h-4 text-primary" />
                            <span className="text-[10px] text-primary font-bold">
                              {slot === 0 ? "Add Photo" : "+ Photo"}
                            </span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pricing Section */}
          <div>
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Pricing Mode
            </Label>
            <div className="flex gap-2 mb-2">
              {(["fixed", "range"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPricingType(t)}
                  className={`flex-1 h-10 rounded-xl text-xs font-bold transition-all border ${
                    pricingType === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary text-muted-foreground border-border hover:bg-secondary/80"
                  }`}
                >
                  {t === "fixed" ? "Fixed Price" : "Price Range"}
                </button>
              ))}
            </div>

            <div className={`grid gap-2 ${pricingType === "range" ? "grid-cols-2" : "grid-cols-1"}`}>
              {[
                { label: pricingType === "range" ? "Min Price (₦)" : "Price (₦)", val: price, set: setPrice },
                ...(pricingType === "range"
                  ? [
                      {
                        label: `Max Price (≤₦${twoX.toLocaleString()})`,
                        val: maxPrice || 0,
                        set: (v: number) => setMaxPrice(v),
                      },
                    ]
                  : []),
              ].map(({ label, val, set }) => (
                <div key={label} className="flex flex-col gap-1">
                  <Label className="text-[10px] font-semibold text-muted-foreground">{label}</Label>
                  <div className="flex items-center rounded-xl bg-secondary border border-border h-11 px-3">
                    <span className="text-xs font-bold text-muted-foreground pr-2 border-r border-border">₦</span>
                    <input
                      type="number"
                      value={val || ""}
                      onChange={(e) => set(Number(e.target.value))}
                      placeholder="0"
                      className="flex-1 h-full bg-transparent px-2 text-sm outline-none font-semibold text-foreground"
                    />
                  </div>
                </div>
              ))}
            </div>

            {exceeds && (
              <div className="flex gap-2 items-start p-2 rounded-xl mt-2 bg-destructive/10 border border-destructive/30">
                <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-destructive font-medium">
                  Max price must be ≤ 2× min price (₦{twoX.toLocaleString()})
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-3 border-t border-border mt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl text-xs font-bold bg-secondary border border-border text-muted-foreground hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!name.trim() || !price) return;
                setSaving(true);
                try {
                  await onSave({
                    name: name.trim(),
                    durationMins,
                    price,
                    maxPrice: pricingType === "range" ? maxPrice : undefined,
                    pricingType,
                    emoji: emoji || "⭐",
                    descText: descText.trim(),
                    imageUrls: images.filter(Boolean),
                  });
                } finally {
                  setSaving(false);
                }
              }}
              disabled={!name.trim() || !price || exceeds || uploadingSlot !== null || saving}
              className="flex-1 h-11 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
