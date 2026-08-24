/**
 * AuthContext — Customer App (customer/)
 *
 * Session management + FCM push notification wiring.
 *
 * FCM dual-token strategy:
 *  - Token saved under auth user.id (for direct push targeting).
 *  - Token ALSO saved under profile.id when they differ (for edge functions
 *    that receive user_id = profiles.id from booking triggers).
 *  - The edge function collects all tokens for the resolved auth user.id
 *    AND profiles.fcm_token as backup, so delivery is guaranteed either way.
 *
 * Listener order fix:
 *  - addListener('tokenReceived') wired BEFORE getToken() so a token
 *    rotation is never missed even if it fires immediately.
 *
 * iOS note:
 *  - Uses @capacitor-firebase/messaging, not @capacitor/push-notifications.
 *    The latter's iOS "registration" event returns the raw APNs device
 *    token, not an FCM token, so tokens saved from it can't be delivered to
 *    via the FCM HTTP v1 API. @capacitor-firebase/messaging bridges the APNs
 *    token to Firebase natively (see AppDelegate.swift) and getToken()
 *    resolves an actual FCM registration token on both platforms.
 */

import {
  createContext, useContext, useEffect, useRef,
  useState, useCallback, ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// Lazy Capacitor loader — never bundled by Rollup/Vite
const loadCapacitor = async () => {
  try {
    const [capMod, pushMod] = await Promise.all([
      import("@capacitor/core"),
      import("@capacitor-firebase/messaging"),
    ]);
    return { Capacitor: capMod.Capacitor, FirebaseMessaging: pushMod.FirebaseMessaging };
  } catch {
    return null;
  }
};

interface AuthContextType {
  session:        Session | null;
  user:           User    | null;
  loading:        boolean;
  signOut:        () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session:        null,
  user:           null,
  loading:        true,
  signOut:        async () => {},
  refreshSession: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const initialisedRef = useRef(false);
  const fcmWiredRef    = useRef(false);

  const applySession = useCallback((s: Session | null) => {
    setSession(s);
    setLoading(false);
  }, []);

  // ── FCM setup ──────────────────────────────────────────────────────────────
  const setupFcm = useCallback(async (authedUser: User, profileId?: string) => {
    if (fcmWiredRef.current) return;
    // Guard against usePermissions.ts's registerPushNotifications() also
    // firing FirebaseMessaging.getToken() for the same session.
    if (typeof window !== "undefined" && (window as any).__bookmeFcmRegistered) {
      fcmWiredRef.current = true;
      return;
    }

    const cap = await loadCapacitor();
    if (!cap?.Capacitor.isNativePlatform()) return;
    fcmWiredRef.current = true;
    if (typeof window !== "undefined") (window as any).__bookmeFcmRegistered = true;

    const { FirebaseMessaging } = cap;

    // Saves/refreshes a token for both authedUser.id and profileId (dual-write
    // strategy described above).
    const saveToken = async (token: string) => {
      if (!token) return;
      const { upsertFcmToken } = await import("@/services/notifications");

      // fcm_tokens.user_id is a FK to auth.users — always use authedUser.id
      await upsertFcmToken(authedUser.id, token);

      // Stamp profiles row directly if profile.id differs from auth user.id
      if (profileId && profileId !== authedUser.id) {
        await supabase
          .from("profiles")
          .update({ fcm_token: token } as any)
          .eq("id", profileId);
      }
    };

    try {
      const permResult = await FirebaseMessaging.requestPermissions();
      if (permResult.receive !== "granted") {
        fcmWiredRef.current = false;
        return;
      }

      // ALL listeners wired BEFORE getToken()
      // Fires on subsequent token rotations (refresh, reinstall, restore).
      await FirebaseMessaging.addListener("tokenReceived", async (event) => {
        await saveToken(event.token);
      });

      await FirebaseMessaging.addListener("notificationReceived", (event) => {
        const notification = event.notification;
        toast(`🔔 ${notification.title ?? "BookMe"}`, {
          description: notification.body ?? "",
          duration: 6000,
        });
      });

      await FirebaseMessaging.addListener("notificationActionPerformed", (event) => {
        const data = (event.notification?.data || {}) as Record<string, unknown>;
        if (data.booking_id || data.type?.includes?.("booking")) {
          window.location.hash = "/bookings";
        } else if (data.type === "new_message") {
          window.location.hash = "/notifications";
        } else {
          window.location.hash = "/notifications";
        }
      });

      // getToken() resolves the real FCM registration token on both platforms.
      // On iOS this waits for the APNs device token (delivered via the
      // AppDelegate callbacks) and exchanges it with Firebase — it is NOT the
      // raw APNs token that @capacitor/push-notifications used to return.
      const { token } = await FirebaseMessaging.getToken();
      await saveToken(token);

    } catch (e) {
      console.warn("[FCM] Setup failed:", e);
      fcmWiredRef.current = false;
    }
  }, []);

  // ── Session refresh ────────────────────────────────────────────────────────
  const refreshSession = useCallback(async () => {
    try {
      const { data: { session: stored }, error } = await supabase.auth.getSession();
      if (error) {
        if (
          error.message.includes("refresh_token_not_found") ||
          error.message.includes("Invalid Refresh Token")
        ) {
          await supabase.auth.signOut();
          applySession(null);
          return;
        }
      }
      if (stored) {
        const nowSec = Math.floor(Date.now() / 1000);
        const expSec = stored.expires_at ?? 0;
        if (expSec - nowSec < 60) {
          const { data: { session: fresh } } = await supabase.auth.refreshSession();
          applySession(fresh);
        } else {
          applySession(stored);
        }
      } else {
        applySession(null);
      }
    } catch (e) {
      console.warn("[AuthContext] refreshSession:", e);
    }
  }, [applySession]);

  // ── Main effect ────────────────────────────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        initialisedRef.current = true;
        applySession(newSession);

        if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && newSession?.user) {
          // Resolve profile.id non-blocking
          supabase
            .from("profiles").select("id").eq("user_id", newSession.user.id).single()
            .then(({ data }) => setupFcm(newSession.user, data?.id));
        }

        if (event === "SIGNED_OUT") {
          applySession(null);
          fcmWiredRef.current = false;
        }
      }
    );

    // Cold start hydration
    supabase.auth.getSession().then(({ data: { session: stored } }) => {
      if (!initialisedRef.current) {
        initialisedRef.current = true;
        applySession(stored);
        if (stored?.user) {
          supabase
            .from("profiles").select("id").eq("user_id", stored.user.id).single()
            .then(({ data }) => setupFcm(stored!.user, data?.id));
        }
      }
    });

    // Web visibility resume
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshSession();
    };
    document.addEventListener("visibilitychange", onVisible);

    // Native app resume
    let removeNativeListener: (() => void) | null = null;
    (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) refreshSession();
        });
        removeNativeListener = () => handle.remove();
      } catch {
        // Not in Capacitor — visibilitychange covers web
      }
    })();

    // 10-min heartbeat
    const heartbeat = setInterval(() => {
      if (document.visibilityState === "visible") refreshSession();
    }, 10 * 60 * 1000);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      removeNativeListener?.();
      clearInterval(heartbeat);
    };
  }, [applySession, refreshSession, setupFcm]);

  const signOut = useCallback(async () => {
    fcmWiredRef.current = false;
    if (typeof window !== "undefined") (window as any).__bookmeFcmRegistered = false;
    const signingOutUserId = session?.user?.id;
    try {
      const cap = await loadCapacitor();
      if (cap?.Capacitor.isNativePlatform()) {
        // Look up this device's current token before revoking it so the
        // matching fcm_tokens row can be removed — deleting by user_id
        // alone would also remove the user's other signed-in devices.
        try {
          const { token } = await cap.FirebaseMessaging.getToken();
          if (token) {
            await supabase.from("fcm_tokens").delete().eq("token", token);
          }
        } catch (e) {
          console.warn("[FCM] token lookup on sign-out failed:", e);
        }
        await cap.FirebaseMessaging.deleteToken();
      }
    } catch (e) {
      console.warn("[FCM] deleteToken on sign-out failed:", e);
    }
    if (signingOutUserId) {
      // Legacy/backup field — best-effort, don't block sign-out on it.
      await supabase
        .from("profiles")
        .update({ fcm_token: null } as any)
        .eq("user_id", signingOutUserId)
        .then(({ error }) => {
          if (error) console.warn("[FCM] clearing profiles.fcm_token on sign-out failed:", error.message);
        });
    }
    await supabase.auth.signOut();
    applySession(null);
  }, [applySession, session]);

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      loading,
      signOut,
      refreshSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
