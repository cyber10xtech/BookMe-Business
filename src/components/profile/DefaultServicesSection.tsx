import { useState, useRef } from "react";
import { Lock, Camera, X, Clock, AlertCircle, Sparkles, Edit2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface DefaultServicesSectionProps {
  services: Service[];
  userId: string;
  onUpdateService: (id: string, updates: Partial<Service>) => Promise<void>;
}

export const DefaultServicesSection = ({ services, userId, onUpdateService }: DefaultServicesSectionProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);

  const getMeta = (s: any) => {
    try {
      return JSON.parse(s.description || "{}");
    } catch {
      return {};
    }
  };

  const isDefaultService = (s: any) => {
    const meta = getMeta(s);
    return s.is_featured === true || meta.isLocked === true;
  };

  const defaultServices = services.filter(isDefaultService);

  if (defaultServices.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl p-5 border border-border space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Lock className="w-4 h-4 text-primary" />
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Onboarding Default Services ({defaultServices.length})
          </Label>
          <p className="text-[11px] text-muted-foreground">
            These core services are managed directly from your profile.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {defaultServices.map((s) => {
          const isEditing = editingId === s.id;
          return (
            <DefaultServiceCard
              key={s.id}
              service={s}
              userId={userId}
              isEditing={isEditing}
              onStartEdit={() => setEditingId(s.id)}
              onCancelEdit={() => setEditingId(null)}
              onSave={async (updatedData) => {
                const meta = getMeta(s);
                const durationLabel = minsToLabel(updatedData.durationMins);
                const updatedMeta = {
                  ...meta,
                  pricingType: updatedData.pricingType,
                  maxPrice: updatedData.pricingType === "range" ? updatedData.maxPrice : undefined,
                  emoji: updatedData.emoji || "⭐",
                  isLocked: true,
                  imageUrls: updatedData.imageUrls,
                  description: updatedData.descText.trim(),
                };

                await onUpdateService(s.id, {
                  name: updatedData.name.trim(),
                  duration: durationLabel,
                  duration_minutes: updatedData.durationMins,
                  price: updatedData.price,
                  is_featured: true,
                  description: JSON.stringify(updatedMeta),
                } as any);

                toast.success("Default service updated!");
                setEditingId(null);
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

interface DefaultServiceCardProps {
  service: any;
  userId: string;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
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

const DefaultServiceCard = ({
  service,
  userId,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSave,
}: DefaultServiceCardProps) => {
  const meta = (() => {
    try {
      return JSON.parse(service.description || "{}");
    } catch {
      return {};
    }
  })();

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

  const resetFields = () => {
    setName(service.name || "");
    setDurationMins(service.duration_minutes || parseDurationToMinutes(service.duration || "60 mins"));
    setPricingType(meta.pricingType || "fixed");
    setPrice(service.price || 0);
    setMaxPrice(meta.maxPrice);
    setEmoji(meta.emoji || "⭐");
    setDescText(meta.description || "");
    setImages(meta.imageUrls || []);
  };

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
    <div
      className="rounded-2xl border border-border p-4 transition-all"
      style={{ background: "hsl(var(--secondary) / 0.5)" }}
    >
      {!isEditing ? (
        <div>
          {meta.imageUrls?.length > 0 && (
            <div className="flex gap-1.5 mb-3">
              {meta.imageUrls.slice(0, 3).map((url: string, i: number) => (
                <img key={i} src={url} alt="" className="w-14 h-14 rounded-xl object-cover border border-border" />
              ))}
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-base flex-shrink-0">
                {meta.emoji || "⭐"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-foreground text-sm truncate">{service.name}</p>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 flex-shrink-0">
                    Default
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {service.duration} ·{" "}
                  {meta.pricingType === "range" && meta.maxPrice
                    ? `₦${service.price?.toLocaleString()} – ₦${meta.maxPrice?.toLocaleString()}`
                    : `₦${service.price?.toLocaleString()}`}
                </p>
                {meta.description && (
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1 italic">
                    {meta.description}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                resetFields();
                onStartEdit();
              }}
              className="flex items-center gap-1 text-xs font-bold text-primary px-3 py-1.5 rounded-xl bg-card border border-border hover:bg-secondary transition-colors flex-shrink-0"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                Edit Default Service
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              Profile-managed
            </span>
          </div>

          {/* Service Name */}
          <div>
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 block">
              Service Name
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard Haircut"
              className="h-11 rounded-xl bg-card border-border font-semibold text-sm"
            />
          </div>

          {/* Duration & Emoji */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1 block">
                Duration
              </Label>
              <div className="flex items-center rounded-xl bg-card border border-border h-11 px-3">
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
              <div className="flex items-center rounded-xl bg-card border border-border h-11 px-2 gap-1">
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
              placeholder="Describe what this default service includes..."
              className="min-h-[64px] text-xs bg-card border-border rounded-xl"
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
                        className="w-full h-full rounded-xl bg-card border-1.5 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors"
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
                      : "bg-card text-muted-foreground border-border hover:bg-secondary"
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
                  <div className="flex items-center rounded-xl bg-card border border-border h-11 px-3">
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
          <div className="flex gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => {
                resetFields();
                onCancelEdit();
              }}
              className="flex-1 h-10 rounded-xl text-xs font-bold bg-card border border-border text-muted-foreground hover:bg-secondary transition-colors"
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
              className="flex-1 h-10 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save Service"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
