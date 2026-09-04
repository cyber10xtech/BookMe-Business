import { useState, useMemo } from "react";
import { Lock, Edit2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { EditServiceModal } from "@/components/services/EditServiceModal";
import type { Service } from "@/hooks/useServices";

function minsToLabel(m: number): string {
  if (!m || m <= 0) return "1 hr";
  if (m < 60) return `${m} mins`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r > 0 ? `${h} hr ${r} mins` : `${h} hr`;
}

interface DefaultServicesSectionProps {
  services: Service[];
  servicesLoading?: boolean;
  userId: string;
  onUpdateService: (id: string, updates: Partial<Service>) => Promise<void>;
}

export const DefaultServicesSection = ({
  services,
  servicesLoading = false,
  userId,
  onUpdateService,
}: DefaultServicesSectionProps) => {
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Memoize default services filtering so JSON.parse only runs when services changes
  const defaultServices = useMemo(() => {
    return services.filter((s: any) => {
      if (s.is_featured === true) return true;
      try {
        const meta = JSON.parse(s.description || "{}");
        return meta.isLocked === true;
      } catch {
        return false;
      }
    });
  }, [services]);

  // Handle subtle skeleton loading state
  if (servicesLoading) {
    return (
      <div className="bg-card rounded-2xl p-5 border border-border space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-4 h-4 bg-secondary animate-pulse rounded" />
          <div className="w-44 h-4 bg-secondary animate-pulse rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-16 rounded-xl bg-secondary/50 animate-pulse" />
          <div className="h-16 rounded-xl bg-secondary/50 animate-pulse" />
        </div>
      </div>
    );
  }

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

      {/* Lightweight read-only service cards */}
      <div className="space-y-3">
        {defaultServices.map((s) => (
          <LightweightDefaultCard
            key={s.id}
            service={s}
            onEdit={() => setEditingService(s)}
          />
        ))}
      </div>

      {/* Isolated Edit Service Modal (mounted lazily ONLY when a service is picked for editing) */}
      {editingService && (
        <EditServiceModal
          service={editingService}
          userId={userId}
          open={Boolean(editingService)}
          onClose={() => setEditingService(null)}
          onSave={async (updatedData) => {
            const meta = (() => {
              try {
                return JSON.parse(editingService.description || "{}");
              } catch {
                return {};
              }
            })();

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

            await onUpdateService(editingService.id, {
              name: updatedData.name.trim(),
              duration: durationLabel,
              duration_minutes: updatedData.durationMins,
              price: updatedData.price,
              is_featured: true,
              description: JSON.stringify(updatedMeta),
            } as any);

            toast.success("Default service updated!");
            setEditingService(null);
          }}
        />
      )}
    </div>
  );
};

/* ── 1. Lightweight Read-Only Card Component ───────────────────────────── */
interface LightweightDefaultCardProps {
  service: Service;
  onEdit: () => void;
}

const LightweightDefaultCard = ({ service, onEdit }: LightweightDefaultCardProps) => {
  const meta = useMemo(() => {
    try {
      return JSON.parse(service.description || "{}");
    } catch {
      return {};
    }
  }, [service.description]);

  return (
    <div className="rounded-2xl border border-border p-4 bg-secondary/30 transition-all hover:bg-secondary/50">
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
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1 text-xs font-bold text-primary px-3 py-1.5 rounded-xl bg-card border border-border hover:bg-secondary transition-colors flex-shrink-0 tap-scale"
        >
          <Edit2 className="w-3.5 h-3.5" /> Edit Service
        </button>
      </div>
    </div>
  );
};
