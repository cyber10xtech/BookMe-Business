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

  // Note: Profile completion is informational only.
  // We do NOT automatically alter profiles.is_active here so that new accounts remain active.

  const missingItems = items.filter((i) => !i.done);
  const completedItems = items.filter((i) => i.done);

  return { percentage, items, missingItems, completedItems, isShadowBanned };
}
