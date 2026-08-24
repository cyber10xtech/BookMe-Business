import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Profile } from "@/lib/database.types";

export type { Profile } from "@/lib/database.types";

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();
    setProfile(data as Profile | null);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user || !profile) return;
    const { error } = await supabase
      .from("profiles")
      .update(updates as any)
      .eq("id", profile.id);
    if (!error) await fetchProfile();
    return error;
  };

  const uploadImage = async (file: File, path: string): Promise<string | null> => {
    if (!user) return null;
    // Use single bucket "avatars" for everything - avoids missing bucket errors
    // Sanitize filename: remove spaces and special chars
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").toLowerCase();
    const bucket = "avatars";
    const filePath = `${user.id}/${path}/${Date.now()}_${safeFileName}`;

    // Try upload
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      // Fallback: try "business-assets" bucket
      const { error: fallbackError } = await supabase.storage
        .from("business-assets")
        .upload(filePath, file, { upsert: true });
      if (fallbackError) {
        console.error("Upload failed:", uploadError.message, fallbackError.message);
        return null;
      }
      const { data: fallbackData } = supabase.storage.from("business-assets").getPublicUrl(filePath);
      return fallbackData.publicUrl;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  };

  return { profile, loading, updateProfile, uploadImage, refetch: fetchProfile };
};
