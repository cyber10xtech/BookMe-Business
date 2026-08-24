import { useState, useRef } from "react";
import { X, Camera, Image as ImageIcon, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export type PricingType = "fixed" | "range";

export interface AddServiceData {
  name: string;
  duration: string;
  price: number;
  pricingType: PricingType;
  maxPrice?: number;
  description: string;
  imageUrls: string[];
}

interface AddServiceSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: AddServiceData) => Promise<void>;
  userId: string;
}

function minsToLabel(m: number) {
  if (!m || m <= 0) return "1 hr";
  if (m < 60) return `${m} mins`;
  const h = Math.floor(m / 60), r = m % 60;
  return r > 0 ? `${h} hr ${r} mins` : `${h} hr`;
}

const NeuPricingBtn = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex-1 h-11 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-150 tap-scale select-none"
    style={active ? {
      background: "linear-gradient(145deg, hsl(220 80% 16%), hsl(220 100% 8%))",
      boxShadow: "var(--shadow-navy)",
      color: "white",
    } : {
      background: "hsl(var(--background))",
      boxShadow: "var(--shadow-flat)",
      color: "hsl(var(--muted-foreground))",
    }}
  >
    {active && <CheckCircle2 style={{ width: 15, height: 15 }} />}
    {children}
  </button>
);

const AddServiceSheet = ({ open, onClose, onSave, userId }: AddServiceSheetProps) => {
  const [name, setName]             = useState("");
  const [pricingType, setPricing]   = useState<PricingType>("fixed");
  const [price, setPrice]           = useState("");
  const [maxPrice, setMaxPrice]     = useState("");
  const [durationMins, setDuration] = useState(60);
  const [description, setDesc]      = useState("");
  const [images, setImages]         = useState<string[]>(["", "", ""]);
  const [uploading, setUploading]   = useState<number | null>(null);
  const [saving, setSaving]         = useState(false);

  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const reset = () => {
    setName(""); setPricing("fixed"); setPrice(""); setMaxPrice("");
    setDuration(60); setDesc(""); setImages(["", "", ""]);
  };
  const handleClose = () => { reset(); onClose(); };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>, slot: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(slot);
    const path = `${userId}/services/${Date.now()}_${slot}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("business-assets").upload(path, file, { upsert: true });
    if (error) { toast.error("Photo upload failed"); setUploading(null); e.target.value = ""; return; }
    const { data } = supabase.storage.from("business-assets").getPublicUrl(path);
    setImages(prev => { const n = [...prev]; n[slot] = data.publicUrl; return n; });
    setUploading(null);
    e.target.value = "";
  };

  const removePhoto = (slot: number) =>
    setImages(prev => { const n = [...prev]; n[slot] = ""; return n; });

  const priceNum = Number(price) || 0;
  const maxNum   = Number(maxPrice) || 0;
  const twoX     = priceNum * 2;
  const exceeds  = pricingType === "range" && maxNum > 0 && priceNum > 0 && maxNum > twoX;
  const hasPhoto = images.some(Boolean);
  const preview  = priceNum > 0 && !exceeds
    ? pricingType === "fixed"
      ? `₦${priceNum.toLocaleString()}`
      : maxNum > 0 ? `₦${priceNum.toLocaleString()} – ₦${maxNum.toLocaleString()}` : null
    : null;

  const hasDesc = description.trim().length >= 10;
  const canSave = name.trim() && priceNum > 0 && !exceeds && hasPhoto && hasDesc && uploading === null;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(), duration: minsToLabel(durationMins), price: priceNum,
        pricingType, maxPrice: pricingType === "range" && maxNum > 0 ? maxNum : undefined,
        description: description.trim(), imageUrls: images.filter(Boolean),
      });
      reset();
    } finally { setSaving(false); }
  };

  if (!open) return null;

  const insetField = "neu-input w-full rounded-2xl px-4 py-0 text-sm text-foreground placeholder:text-muted-foreground outline-none border-0";

  return (
    <div className="fixed inset-0 z-[100] flex items-end" style={{ background: "rgba(13,22,38,0.5)" }} onClick={handleClose}>
      <div
        className="w-full rounded-t-[2rem] flex flex-col animate-slide-up"
        style={{ background: "hsl(var(--background))", maxHeight: "94vh", boxShadow: "0 -8px 40px rgba(0,0,0,0.2), var(--shadow-raised)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: "hsl(var(--muted-foreground)/0.3)" }} />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-3 flex-shrink-0">
          <div>
            <h2 className="text-lg font-extrabold text-foreground">Add Service</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Add a new service customers can book.</p>
          </div>
          <button onClick={handleClose} className="w-9 h-9 rounded-2xl flex items-center justify-center tap-scale"
            style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-raised)" }}>
            <X className="w-4 h-4 text-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4 space-y-5">

          {/* Service name */}
          <div>
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Service Name</Label>
            <input value={name} onChange={e => setName(e.target.value.slice(0, 50))}
              placeholder="e.g. Fade Haircut, Deep Clean…"
              className={`${insetField} h-12`}
              style={{ boxShadow: "var(--shadow-inset)", background: "hsl(var(--background))" }} />
          </div>

          {/* Pricing type */}
          <div>
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Pricing Type</Label>
            <div className="flex gap-3">
              <NeuPricingBtn active={pricingType === "fixed"}  onClick={() => setPricing("fixed")}>Fixed Price</NeuPricingBtn>
              <NeuPricingBtn active={pricingType === "range"} onClick={() => setPricing("range")}>Price Range</NeuPricingBtn>
            </div>
          </div>

          {/* Price inputs */}
          <div>
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">
              {pricingType === "fixed" ? "Price" : "Price Range"}
            </Label>

            {pricingType === "fixed" ? (
              <div className="flex items-center rounded-2xl overflow-hidden h-12"
                style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-inset)" }}>
                <div className="w-12 h-full flex items-center justify-center flex-shrink-0"
                  style={{ borderRight: "1px solid hsl(var(--border))" }}>
                  <span className="font-bold text-foreground text-sm">₦</span>
                </div>
                <input type="number" inputMode="numeric" value={price} onChange={e => setPrice(e.target.value)}
                  placeholder="e.g. 5000"
                  className="flex-1 h-full bg-transparent px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[{ label: "Starting", val: price, set: setPrice },
                    { label: `Max (≤ ₦${twoX > 0 ? twoX.toLocaleString() : "2×"})`, val: maxPrice, set: setMaxPrice }
                  ].map(({ label, val, set }) => (
                    <div key={label}>
                      <p className="text-[11px] text-muted-foreground mb-1.5 font-semibold">{label}</p>
                      <div className={`flex items-center rounded-2xl overflow-hidden h-12 ${val === maxPrice && exceeds ? "ring-2 ring-destructive" : ""}`}
                        style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-inset)" }}>
                        <div className="w-9 h-full flex items-center justify-center flex-shrink-0"
                          style={{ borderRight: "1px solid hsl(var(--border))" }}>
                          <span className="font-bold text-foreground text-xs">₦</span>
                        </div>
                        <input type="number" inputMode="numeric" value={val} onChange={e => set(e.target.value)}
                          placeholder={val === maxPrice && priceNum > 0 ? `max ${twoX}` : "0"}
                          className="flex-1 h-full bg-transparent px-2 text-sm outline-none" />
                      </div>
                    </div>
                  ))}
                </div>
                {exceeds && (
                  <div className="rounded-2xl p-3 flex gap-2"
                    style={{ background: "hsl(0 84% 95%)", boxShadow: "var(--shadow-flat)", border: "1px solid hsl(0 84% 80%)" }}>
                    <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-destructive font-semibold">
                      Max must be ≤ 2× starting price (₦{twoX.toLocaleString()})
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Live customer preview */}
            {preview && (
              <div className="mt-3 rounded-2xl p-4 animate-fade-in"
                style={{ background: "hsl(142 40% 95%)", boxShadow: "var(--shadow-flat)", border: "1px solid hsl(142 40% 80%)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 rounded-full border-2 border-emerald-500 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                  <p className="text-xs font-bold text-emerald-800">Customers will see</p>
                </div>
                <p className="text-xs text-emerald-700 mb-1.5">
                  Displayed as a {pricingType === "fixed" ? "fixed price" : "price range"}.
                </p>
                <p className="text-2xl font-extrabold text-emerald-900">{preview}</p>
              </div>
            )}
          </div>

          {/* Duration */}
          <div>
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Duration</Label>
            <div className="flex items-center rounded-2xl overflow-hidden h-12"
              style={{ background: "hsl(var(--background))", boxShadow: "var(--shadow-inset)" }}>
              <div className="w-12 h-full flex items-center justify-center flex-shrink-0"
                style={{ borderRight: "1px solid hsl(var(--border))" }}>
                <Clock className="w-4 h-4 text-muted-foreground" />
              </div>
              <input type="number" inputMode="numeric" value={durationMins}
                onChange={e => setDuration(Math.max(5, Math.min(480, Number(e.target.value) || 60)))}
                className="flex-1 h-full bg-transparent px-3 text-sm outline-none" />
              <span className="pr-4 text-xs text-muted-foreground font-semibold">{minsToLabel(durationMins)}</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                Description <span className="text-destructive">*</span>
              </Label>
              <span className={`text-[11px] font-bold ${hasDesc ? "text-emerald-600" : description.trim().length > 0 ? "text-amber-500" : "text-destructive"}`}>
                {hasDesc ? "✓ Good" : description.trim().length > 0 ? `${description.trim().length}/10 min` : "Min. 10 chars"}
              </span>
            </div>
            <Textarea
              value={description}
              onChange={e => setDesc(e.target.value)}
              placeholder="Describe what this service includes, what customers can expect, how long it takes…"
              className="min-h-[88px]"
              style={{ boxShadow: description.trim().length > 0 && !hasDesc ? "0 0 0 1.5px hsl(38 92% 50%)" : undefined }}
            />
            {!hasDesc && description.trim().length === 0 && (
              <p className="text-[11px] text-destructive mt-1.5 ml-0.5">
                A description helps customers understand what they're booking.
              </p>
            )}
          </div>

          {/* Photos — required */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                Photos <span className="text-destructive">*</span>
              </Label>
              <span className={`text-[11px] font-bold ${hasPhoto ? "text-emerald-600" : "text-destructive"}`}>
                {hasPhoto ? `${images.filter(Boolean).length}/3 added ✓` : "At least 1 required"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Add up to 3 photos of your work</p>

            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map(slot => {
                const url = images[slot];
                const loading = uploading === slot;
                return (
                  <div key={slot} className="relative aspect-square">
                    <input ref={refs[slot]} type="file" accept="image/*" className="hidden"
                      onChange={e => handlePhoto(e, slot)} />
                    {url ? (
                      <>
                        <img src={url} alt="" className="w-full h-full object-cover rounded-2xl"
                          style={{ boxShadow: "var(--shadow-raised)" }} />
                        <button onClick={() => removePhoto(slot)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-white rounded-full flex items-center justify-center tap-scale"
                          style={{ boxShadow: "2px 2px 6px rgba(0,0,0,0.3)" }}>
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <button onClick={() => !loading && refs[slot].current?.click()} disabled={loading}
                        className="w-full h-full rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all tap-scale"
                        style={slot === 0 ? {
                          background: "hsl(var(--background))",
                          boxShadow: "var(--shadow-inset)",
                          border: "2px dashed hsl(var(--primary)/0.4)",
                        } : {
                          background: "hsl(var(--background))",
                          boxShadow: "var(--shadow-inset)",
                          border: "2px dashed hsl(var(--border))",
                        }}>
                        {loading
                          ? <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          : slot === 0
                            ? <><Camera className="w-5 h-5 text-primary" /><span className="text-[10px] text-primary font-bold">Add Photo</span></>
                            : <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
                        }
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="px-5 pt-3 flex-shrink-0"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)", borderTop: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }}>
          {(!hasPhoto || !hasDesc) && (
            <p className="text-[11px] text-destructive text-center mb-2 font-semibold">
              {!hasDesc ? "Add a description (min. 10 characters) to continue." : "Please add at least one photo to continue."}
            </p>
          )}
          <button onClick={handleSave} disabled={!canSave || saving}
            className="w-full h-14 rounded-2xl text-white font-extrabold text-sm uppercase tracking-widest transition-all disabled:opacity-40 tap-scale"
            style={{ background: "linear-gradient(145deg, hsl(220 80% 16%), hsl(220 100% 8%))", boxShadow: "var(--shadow-navy)" }}>
            {saving
              ? <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving…
                </span>
              : "Save Service"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddServiceSheet;
