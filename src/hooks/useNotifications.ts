import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Notification } from "@/lib/database.types";

export type { Notification } from "@/lib/database.types";

const CHIME_URL = "https://actions.google.com/sounds/v1/alerts/notification_simple-01.ogg";

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playChime = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(CHIME_URL);
        audioRef.current.volume = 0.4;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } catch {}
  }, []);

  const showBrowserNotification = useCallback((title: string, body: string) => {
    if (typeof window === "undefined") return;
    if ("Notification" in window && Notification.permission === "granted") {
      try { new Notification(title, { body, icon: "/favicon.ico" }); } catch {}
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    // Get the business profile id first
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    const pid = profile?.id ?? null;
    setProfileId(pid);

    // Fetch by BOTH profiles.id AND auth user.id, then deduplicate.
    // notifications.user_id FK references profiles.id, so new_booking notifications
    // from the customer app arrive with user_id = profiles.id.
    // Older notifications may have been inserted with auth user.id.
    const queries = [
      supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    ];
    if (pid && pid !== user.id) {
      queries.push(
        supabase.from("notifications").select("*").eq("user_id", pid).order("created_at", { ascending: false }).limit(50)
      );
    }

    const results = await Promise.all(queries);
    const merged = results.flatMap((r) => (r.data as Notification[]) || []);
    const seen = new Set<string>();
    const deduped = merged.filter((n) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });
    deduped.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setNotifications(deduped);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user) return;

    let pid: string | null = null;

    const setupRealtime = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      pid = profile?.id ?? null;

      const handleInsert = (payload: any) => {
        const n = payload.new as Notification;
        setNotifications((prev) => {
          if (prev.find((x) => x.id === n.id)) return prev; // dedupe
          return [n, ...prev];
        });
        playChime();
        toast(n.title, { description: n.body || (n as any).message || "" });
        showBrowserNotification(n.title, n.body || (n as any).message || "");
      };

      // Channel 1: listen on auth user.id (for legacy notifications)
      const channelAuth = supabase
        .channel(`notifications-auth-${user.id}`)
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        }, handleInsert)
        .subscribe();

      // Channel 2: listen on profiles.id (for new_booking notifications from customer app)
      let channelProfile: ReturnType<typeof supabase.channel> | null = null;
      if (pid && pid !== user.id) {
        channelProfile = supabase
          .channel(`notifications-profile-${pid}`)
          .on("postgres_changes", {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${pid}`,
          }, handleInsert)
          .subscribe();
      }

      return () => {
        supabase.removeChannel(channelAuth);
        if (channelProfile) supabase.removeChannel(channelProfile);
      };
    };

    const cleanup = setupRealtime();
    return () => {
      cleanup.then((fn) => fn?.());
    };
  }, [user, playChime, showBrowserNotification]);

  const markAsRead = async (id: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() } as any)
      .eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const markAllAsRead = async () => {
    if (!user) return;
    const updates: Promise<any>[] = [
      supabase.from("notifications").update({ is_read: true, read_at: new Date().toISOString() } as any).eq("user_id", user.id).eq("is_read", false),
    ];
    if (profileId && profileId !== user.id) {
      updates.push(
        supabase.from("notifications").update({ is_read: true, read_at: new Date().toISOString() } as any).eq("user_id", profileId).eq("is_read", false)
      );
    }
    await Promise.all(updates);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return { notifications, loading, unreadCount, markAsRead, markAllAsRead, refetch: fetchNotifications };
};
