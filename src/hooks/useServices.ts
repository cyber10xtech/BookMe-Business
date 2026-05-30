import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import type { Service } from "@/lib/database.types";

export type { Service } from "@/lib/database.types";

export const useServices = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchServices = useCallback(async () => {
    if (!user || !profile) return;
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("provider_id", profile.id)
      .order("created_at", { ascending: false });
    setServices((data as Service[]) || []);
    setLoading(false);
  }, [user, profile]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  const addService = async (service: { name: string; duration: string; price: number; category?: string; emoji?: string; pricingType?: string; maxPrice?: number; imageUrls?: string[]; description?: string }) => {
    if (!user || !profile) return;
    const { error } = await supabase.from("services").insert({
      provider_id: profile.id,
      user_id: user.id,
      name: service.name,
      duration: service.duration,
      duration_minutes: parseDurationToMinutes(service.duration),
      price: service.price,
      description: JSON.stringify({
        pricingType: service.pricingType || "fixed",
        maxPrice: service.maxPrice,
        emoji: service.emoji || "⭐",
        isLocked: false,
        imageUrls: service.imageUrls || [],
        description: service.description || "",
      }),
      category: service.category || profile.category || "general",
      is_active: true,
    } as any);
    if (error) { toast.error("Failed to add service: " + error.message); return; }
    await fetchServices();
  };

  const updateService = async (id: string, updates: Partial<Service>) => {
    await supabase.from("services").update(updates as any).eq("id", id);
    await fetchServices();
  };

  const deleteService = async (id: string) => {
    await supabase.from("services").delete().eq("id", id);
    await fetchServices();
  };

  return { services, loading, addService, updateService, deleteService, refetch: fetchServices };
};

function parseDurationToMinutes(dur: string): number {
  let mins = 0;
  const hrMatch = dur.match(/(\d+)\s*hr/);
  const minMatch = dur.match(/(\d+)\s*min/);
  if (hrMatch) mins += parseInt(hrMatch[1]) * 60;
  if (minMatch) mins += parseInt(minMatch[1]);
  return mins || 60;
}
