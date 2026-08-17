import { useState, useRef } from "react";
import {
  Plus, Trash2, Lock, AlertCircle, ChevronDown, ChevronUp,
  Info, Camera, X, ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getCategoryConfig, type LockedService } from "@/lib/categoryServices";

// ─── Types ────────────────────────────────────────────────────────────────────
export type PricingType = "fixed" | "range";

export interface ServiceEntry {
  id: string;
  name: string;
  emoji: string;
  duration: string;
  pricingType: PricingType;
  price: number;
  maxPrice?: number;
  isLocked: boolean;
  lockedKey?: string;
  description?: string;
  imageDataUrls: string[]; // required: min 1
}

interface Props {
  categoryId: string;
  services: ServiceEntry[];
  onChange: (services: ServiceEntry[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const uid = () => Math.random().toString(36).slice(2);

function buildLockedEntries(lockedServices: LockedService[]): ServiceEntry[] {
  return lockedServices.map((ls) => ({
    id: uid(),
    name: ls.name,
    emoji: ls.emoji,
    duration: ls.duration,
    pricingType: "fixed" as PricingType,
    price: 500, // ₦500 default to trigger user interaction
    isLocked: true,
    lockedKey: ls.key,
    description: "",
    imageDataUrls: [],
  }));
}

const DURATIONS = [
  "15 mins","20 mins","30 mins","45 mins",
  "1 hr","1 hr 30 mins","2 hrs","2 hrs 30 mins","3 hrs",
];

// ─── Price Inputs ─────────────────────────────────────────────────────────────
const PriceInputs = ({
  pricingType, price, maxPrice,
  onPriceChange, onMaxPriceChange, onTypeChange,
}: {
  pricingType: PricingType;
  price: number;
  maxPrice?: number;
  onPriceChange: (v: number) => void;
  onMaxPriceChange: (v: number) => void;
  onTypeChange: (t: PricingType) => void;
}) => {
  const twoXLimit = price * 2;
  const maxExceeds = pricingType === "range" && maxPrice !== undefined && maxPrice > twoXLimit && price > 0;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {(["fixed", "range"] as PricingType[]).map((t) => (
          <button key={t} type="button" onClick={() => onTypeChange(t)}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold border transition-all ${
              pricingType === t
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-foreground border-border"
            }`}>
            {t === "fixed" ? "Fixed Price" : "Price Range"}
          </button>
        ))}
      </div>

      {pricingType === "fixed" ? (
        <div>
          <Label className="text-xs text-muted-foreground">Price</Label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">₦</span>
            <Input type="number" min={0} placeholder="e.g. 3000" value={price || ""}
              onChange={(e) => onPriceChange(Number(e.target.value))}
              className="pl-7 h-11 rounded-xl bg-secondary border-0" />
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Min Price (₦)</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">₦</span>
                <Input type="number" min={0} placeholder="5000" value={price || ""}
                  onChange={(e) => onPriceChange(Number(e.target.value))}
                  className="pl-7 h-11 rounded-xl bg-secondary border-0" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Max Price (₦)</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">₦</span>
                <Input type="number" min={0}
                  placeholder={price > 0 ? `max ${price * 2}` : "10000"}
                  value={maxPrice || ""}
                  onChange={(e) => onMaxPriceChange(Number(e.target.value))}
                  className={`pl-7 h-11 rounded-xl border-0 ${maxExceeds ? "bg-red-50 ring-1 ring-red-400" : "bg-secondary"}`} />
              </div>
            </div>
          </div>
          {price > 0 && (
            <div className={`rounded-xl p-3 flex gap-2 text-xs ${maxExceeds ? "bg-red-50 border border-red-200" : "bg-blue-50 border border-blue-100"}`}>
              {maxExceeds ? (
                <><AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 font-medium">Max must be ≤ 2× starting price (₦{(price * 2).toLocaleString()}).</p></>
              ) : (
                <><Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-blue-700">2× Rule: Max cannot exceed ₦{price > 0 ? (price * 2).toLocaleString() : "—"}.</p></>
              )}
            </div>
          )}
        </>
      )}

      {/* Preview */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
        <p className="text-xs text-emerald-700 font-semibold">⊙ Customers will see</p>
        <p className="text-[11px] text-emerald-600 mt-0.5">
          {pricingType === "fixed" ? "Your service will be displayed as a fixed price." : "Your service will be displayed as a price range."}
        </p>
        <p className="text-sm font-bold text-emerald-800 mt-1">
          {pricingType === "fixed"
            ? price > 0 ? `₦${price.toLocaleString()}` : "₦___"
            : price > 0 && maxPrice && maxPrice <= twoXLimit
              ? `₦${price.toLocaleString()} – ₦${maxPrice.toLocaleString()}`
              : "₦___ – ₦___"}
        </p>
      </div>
    </div>
  );
};

// ─── Media Upload ─────────────────────────────────────────────────────────────
const MediaUpload = ({ imageDataUrls, onChange }: { imageDataUrls: string[]; onChange: (urls: string[]) => void }) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 3 - imageDataUrls.length;
    files.slice(0, remaining).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        onChange([...imageDataUrls, url].slice(0, 3));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removeImage = (idx: number) => onChange(imageDataUrls.filter((_, i) => i !== idx));

  const emptySlots = Math.max(0, 3 - imageDataUrls.length);

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
      <div className="flex gap-2 flex-wrap">
        {imageDataUrls.map((url, i) => (
          <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-border flex-shrink-0">
            <img src={url} alt={`photo ${i + 1}`} className="w-full h-full object-cover" />
            <button type="button" onClick={() => removeImage(i)}
              className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        ))}
        {imageDataUrls.length < 3 && (
          <button type="button" onClick={() => fileRef.current?.click()}
            className="w-24 h-24 rounded-xl border-2 border-dashed border-border bg-secondary/60 flex flex-col items-center justify-center gap-1 hover:bg-secondary transition-colors flex-shrink-0">
            <Camera className="w-6 h-6 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground font-medium">Add Photo</span>
          </button>
        )}
        {Array.from({ length: Math.min(emptySlots - 1, 2) }).map((_, i) => (
          <div key={`empty-${i}`} className="w-24 h-24 rounded-xl border-2 border-dashed border-border/40 bg-secondary/30 flex items-center justify-center flex-shrink-0">
            <ImageIcon className="w-5 h-5 text-border" />
          </div>
        ))}
      </div>
      {imageDataUrls.length === 0 && (
        <p className="text-xs text-rose-600 font-medium mt-1.5 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> At least 1 photo is required
        </p>
      )}
    </div>
  );
};

// ─── Service Dialog ───────────────────────────────────────────────────────────
interface DialogState { service: ServiceEntry; isNew: boolean; }

const ServiceDialog = ({ dialogState, onSave, onClose }: {
  dialogState: DialogState;
  onSave: (updated: ServiceEntry) => void;
  onClose: () => void;
}) => {
  const { service, isNew } = dialogState;
  const [draft, setDraft] = useState<ServiceEntry>({ ...service });

  const twoX = draft.price * 2;
  const maxExceeds = draft.pricingType === "range" && draft.maxPrice !== undefined && draft.maxPrice > twoX && draft.price > 0;
  const canSave = draft.name.trim().length > 0 && draft.price > 0 && draft.imageDataUrls.length >= 1 && !maxExceeds;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="rounded-2xl max-h-[90vh] overflow-y-auto mx-4 p-0">
        <div className="p-5">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold">
              {isNew ? "Add Service" : "Edit Service"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {isNew ? "Add a new service that customers can book." : "Update your service details."}
            </p>
          </DialogHeader>

          <div className="space-y-4">
            {/* Service Name */}
            <div>
              <Label className="text-sm font-semibold">Service Name</Label>
              <div className="relative mt-1">
                {draft.isLocked ? (
                  <div className="flex items-center h-11 px-3 rounded-xl bg-secondary/40 border border-border text-sm text-muted-foreground">
                    <span className="mr-2">{draft.emoji}</span>
                    {draft.name}
                    <Lock className="w-3.5 h-3.5 ml-auto text-muted-foreground/60" />
                  </div>
                ) : (
                  <>
                    <Input placeholder="Enter service name" maxLength={50} value={draft.name}
                      onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                      className="h-11 rounded-xl bg-secondary border-0 pr-12" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      {draft.name.length}/50
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Pricing */}
            <div>
              <Label className="text-sm font-semibold">Pricing Type</Label>
              <div className="mt-1">
                <PriceInputs
                  pricingType={draft.pricingType}
                  price={draft.price}
                  maxPrice={draft.maxPrice}
                  onPriceChange={(v) => setDraft((d) => ({ ...d, price: v }))}
                  onMaxPriceChange={(v) => setDraft((d) => ({ ...d, maxPrice: v }))}
                  onTypeChange={(t) => setDraft((d) => ({ ...d, pricingType: t, maxPrice: undefined }))}
                />
              </div>
            </div>

            {/* Duration */}
            <div>
              <Label className="text-sm font-semibold">Duration (minutes)</Label>
              <select value={draft.duration}
                onChange={(e) => setDraft((d) => ({ ...d, duration: e.target.value }))}
                className="mt-1 w-full h-11 rounded-xl bg-secondary border border-border px-3 text-sm">
                {DURATIONS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>

            {/* Description */}
            <div>
              <Label className="text-sm font-semibold">
                Description <span className="font-normal text-muted-foreground">(Optional)</span>
              </Label>
              <Textarea placeholder="Brief description of this service..."
                value={draft.description || ""}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                className="mt-1 rounded-xl bg-secondary border-0 resize-none" rows={3} />
            </div>

            {/* Media — REQUIRED */}
            <div>
              <Label className="text-sm font-semibold">
                Media <span className="text-rose-600">*</span>
              </Label>
              <p className="text-xs text-muted-foreground mb-2">Add up to 3 photos of your work</p>
              <MediaUpload
                imageDataUrls={draft.imageDataUrls}
                onChange={(urls) => setDraft((d) => ({ ...d, imageDataUrls: urls }))}
              />
            </div>
          </div>

          <Button onClick={() => onSave(draft)} disabled={!canSave}
            className="w-full h-12 rounded-xl mt-5 uppercase tracking-wide font-bold text-sm">
            Save Service
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const StepServices = ({ categoryId, services, onChange, onNext, onBack }: Props) => {
  const config = getCategoryConfig(categoryId);
  const [dialogState, setDialogState] = useState<DialogState | null>(null);

  // Seed locked services on first render
  const lockedKeys = services.filter((s) => s.isLocked).map((s) => s.lockedKey);
  const missingLocked = config.lockedServices.filter((ls) => !lockedKeys.includes(ls.key));
  if (missingLocked.length > 0) {
    onChange([...buildLockedEntries(missingLocked), ...services]);
    return null;
  }

  const lockedServices = services.filter((s) => s.isLocked);
  const customServices = services.filter((s) => !s.isLocked);

  const allHavePhotos = services.every((s) => s.imageDataUrls.length >= 1);
  const canProceed = allHavePhotos;

  const saveService = (updated: ServiceEntry) => {
    if (services.find((s) => s.id === updated.id)) {
      onChange(services.map((s) => (s.id === updated.id ? updated : s)));
    } else {
      onChange([...services, updated]);
    }
    setDialogState(null);
  };

  const removeService = (id: string) => onChange(services.filter((s) => s.id !== id));

  const openAdd = () => setDialogState({
    isNew: true,
    service: {
      id: uid(), name: "", emoji: "⭐", duration: "1 hr",
      pricingType: "fixed", price: 0, isLocked: false,
      description: "", imageDataUrls: [],
    },
  });

  return (
    <div className="bg-card rounded-3xl p-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-foreground mb-1">Add Your Services</h2>
      <p className="text-muted-foreground text-sm mb-5">
        Tap each service to set your price and upload photos.{" "}
        <strong>Photos are required</strong> for all services.
      </p>

      {/* Locked Services */}
      <div className="space-y-2 mb-4">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
          <Lock className="w-3 h-3" /> Locked Services (pinned)
        </p>
        {lockedServices.map((svc) => {
          const hasPhoto = svc.imageDataUrls.length > 0;
          const hasRealPrice = svc.price > 500;
          const isSetup = hasPhoto && hasRealPrice;
          return (
            <button
              key={svc.id}
              type="button"
              className={`w-full flex items-center gap-3 p-4 text-left rounded-2xl border transition-colors ${
                isSetup
                  ? "bg-secondary/60 border-border hover:bg-secondary"
                  : "bg-amber-50/60 border-amber-200 hover:bg-amber-50"
              }`}
              onClick={() => setDialogState({ service: svc, isNew: false })}
            >
              <span className="text-xl">{svc.emoji}</span>
              <div className="flex-1">
                <p className="font-semibold text-foreground text-sm">{svc.name}</p>
                <p className="text-xs text-muted-foreground">
                  {svc.duration} · ₦{svc.price.toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {hasPhoto
                  ? <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">✓ Photo</span>
                  : <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full">Add photo</span>}
                {!hasRealPrice && (
                  <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">Set price</span>
                )}
                <Lock className="w-3.5 h-3.5 text-muted-foreground ml-1" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom Services */}
      {customServices.length > 0 && (
        <div className="space-y-2 mb-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Your Added Services</p>
          {customServices.map((svc) => (
            <div key={svc.id} className="bg-card rounded-2xl border border-border flex items-center gap-3 p-4">
              <span className="text-xl">{svc.emoji}</span>
              <div className="flex-1">
                <p className="font-semibold text-foreground text-sm">{svc.name}</p>
                <p className="text-xs text-muted-foreground">
                  {svc.duration} · {svc.pricingType === "range" && svc.maxPrice
                    ? `₦${svc.price.toLocaleString()} – ₦${svc.maxPrice.toLocaleString()}`
                    : `₦${svc.price.toLocaleString()}`}
                </p>
              </div>
              <button type="button"
                onClick={() => setDialogState({ service: svc, isNew: false })}
                className="text-xs text-primary font-semibold px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors">
                Edit
              </button>
              <button type="button" onClick={() => removeService(svc.id)}
                className="p-1.5 rounded-lg hover:bg-destructive/10">
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add service button */}
      <button type="button" onClick={openAdd}
        className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl border-2 border-dashed border-primary/30 text-primary hover:bg-primary/5 transition-colors mb-4">
        <Plus className="w-4 h-4" />
        <span className="text-sm font-semibold">Add Another Service</span>
      </button>

      {/* Photo reminder */}
      {!allHavePhotos && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex gap-2 text-xs mb-4">
          <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
          <p className="text-rose-700">
            Each service needs <strong>at least 1 photo</strong>. Tap a service above to add photos.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mt-2">
        <Button variant="outline" onClick={onBack} className="flex-1 h-12 rounded-xl">Back</Button>
        <Button onClick={onNext} disabled={!canProceed} className="flex-1 h-12 rounded-xl">Continue</Button>
      </div>

      {/* Dialog */}
      {dialogState && (
        <ServiceDialog
          dialogState={dialogState}
          onSave={saveService}
          onClose={() => setDialogState(null)}
        />
      )}
    </div>
  );
};

export default StepServices;
