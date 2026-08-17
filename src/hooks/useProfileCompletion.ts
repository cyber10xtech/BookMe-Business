import { useEffect, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/database.types";

// ─── Threshold ────────────────────────────────────────────────────────────────
export const COMPLETION_THRESHOLD = 75; // % below which the business is shadow-banned

// ─── Completion items (each worth 10 pts → total 100) ────────────────────────
export interface CompletionItem {
  key: string;
  label: string;
  hint: string;
  done: boolean;
  weight: number; // out of 100
  route?: string; // where to go to fix it
}

function hasBusinessHours(hours: Record<string, any> | null | undefined): boolean {
  if (!hours) return false;
  return Object.values(hours).some((v: any) => v?.open || v?.start || v?.isOpen);
}

export function buildCompletionItems(
  profile: Profile | null,
  serviceCount: number
): CompletionItem[] {
  if (!profile) return [];

  return [
    {
      key: "business_name",
      label: "Business name",
      hint: "Add your business name so customers can find you",
      done: !!profile.business_name?.trim(),
      weight: 10,
      route: "/edit-profile",
    },
    {
      key: "owner_name",
      label: "Owner / contact name",
      hint: "Let customers know who they're booking with",
      done: !!(profile.owner_name?.trim() || profile.full_name?.trim()),
      weight: 10,
      route: "/edit-profile",
    },
    {
      key: "phone",
      label: "Phone number",
      hint: "Customers need a number to reach you",
      done: !!profile.phone?.trim(),
      weight: 10,
      route: "/edit-profile",
    },
    {
      key: "bio",
      label: "Business description",
      hint: "Tell customers what makes your business special",
      done: !!(profile.bio?.trim() || profile.business_description?.trim()),
      weight: 10,
      route: "/edit-profile",
    },
    {
      key: "address",
      label: "Business address",
      hint: "Help customers find your location",
      done: !!(profile.address?.trim() && profile.city?.trim()),
      weight: 10,
      route: "/edit-profile",
    },
    {
      key: "category",
      label: "Service category",
      hint: "Categorise your business so customers can discover you",
      done: !!profile.category?.trim(),
      weight: 10,
      route: "/edit-profile",
    },
    {
      key: "avatar_url",
      label: "Profile photo",
      hint: "Profiles with a photo get 3× more bookings",
      done: !!profile.avatar_url?.trim(),
      weight: 15,
      route: "/edit-profile",
    },
    {
      key: "cover_photo",
      label: "Cover photo",
      hint: "Make your profile page stand out with a cover image",
      done: !!(profile.cover_photo_url?.trim() || profile.cover_image_url?.trim()),
      weight: 10,
      route: "/edit-profile",
    },
    {
      key: "services",
      label: "At least one service listed",
      hint: "Add the services you offer so customers can book you",
      done: serviceCount > 0,
      weight: 15,
      route: "/dashboard",
    },
  ];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useProfileCompletion(profile: Profile | null, serviceCount: number) {
  const items = useMemo(
    () => buildCompletionItems(profile, serviceCount),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      profile?.business_name, profile?.owner_name, profile?.full_name,
      profile?.phone, profile?.bio, profile?.business_description,
      profile?.address, profile?.city, profile?.category,
      profile?.avatar_url, profile?.cover_photo_url, profile?.cover_image_url,
      serviceCount,
    ]
  );

  const percentage = useMemo(
    () => items.reduce((sum, item) => sum + (item.done ? item.weight : 0), 0),
    [items]
  );

  const isShadowBanned = percentage < COMPLETION_THRESHOLD;

  // Auto-sync is_active with the shadowban state
  const lastActiveRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!profile) return;

    const shouldBeActive = !isShadowBanned;

    // Only write when the value actually changes to avoid update loops
    if (lastActiveRef.current === shouldBeActive) return;
    lastActiveRef.current = shouldBeActive;

    // Don't override if the profile is already in the correct state
    if (profile.is_active === shouldBeActive) return;

    supabase
      .from("profiles")
      .update({ is_active: shouldBeActive })
      .eq("id", profile.id)
      .then(({ error }) => {
        if (error) console.error("[ProfileCompletion] Failed to update is_active:", error.message);
      });
  }, [isShadowBanned, profile]);

  const missingItems = items.filter((i) => !i.done);
  const completedItems = items.filter((i) => i.done);

  return { percentage, items, missingItems, completedItems, isShadowBanned };
}
