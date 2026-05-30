/**
 * AuthContext — session management + FCM push notification wiring
 *
 * Ported from the customer app's AuthContext so the business app has the
 * same "never-logout" behaviour on Android.
 *
 * Key fixes vs the old business AuthContext:
 *
 * 1. initialisedRef race-guard — prevents the cold-start getSession() callback
 *    from overwriting a session that onAuthStateChange already applied.
 *
 * 2. visibilitychange listener — re-validates the session when the user
 *    switches back to the app tab in the browser / WebView.
 *
 * 3. App.appStateChange listener (async IIFE) — re-validates the session when
 *    the native Android app is brought back to the foreground after being
 *    backgrounded. This is the primary "app was killed and reopened" fix.
 *
 * 4. 10-minute heartbeat — keeps long-lived sessions alive even when the
 *    user leaves the app open without interacting.
 *
 * 5. refreshSession() guards against "refresh_token_not_found" / "Invalid
 *    Refresh Token" instead of crashing — signs the user out cleanly so they
 *    see the sign-in screen rather than a broken state.
 *
 * 6. fcmWiredRef — FCM listeners are attached exactly once per session,
 *    preventing duplicate toast notifications or double token upserts.
 *
 * 7. The "keep me signed in" checkbox from the old AuthContext is preserved
 *    and still respected on cold-start.
 */

import {
  createContext, useContext, useEffect, useRef,
  useState, useCallback, ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// ── "Keep me signed in" keys (unchanged from old AuthContext) ─────────────────
export const KEEP_SIGNED_IN_KEY = "bookme_keep_signed_in";
const JUST_SIGNED_IN_KEY        = "bookme_just_signed_in";

// ── Capacitor lazy-loader (identical pattern to customer app) ─────────────────
// Loaded lazily so Rollup / Vite never hard-bundles the native modules, which
// would break the web build.
const loadCapacitor = async () => {
  try {
    const [capMod, pushMod] = await Promise.all([
      import("@capacitor/core"),
      import("@capacitor/push-notifications"),
    ]);
    return { Capacitor: capMod.Capacitor, PushNotifications: pushMod.PushNotifications };
  } catch {
    return null;
  }
};

// ── Context type ──────────────────────────────────────────────────────────────
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

// ── Provider ──────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const initialisedRef = useRef(false);   // prevents double-apply on cold start
  const fcmWiredRef    = useRef(false);   // prevents duplicate FCM listeners

  const applySession = useCallback((s: Session | null) => {
    setSession(s);
    setLoading(false);
  }, []);

  // ── FCM setup — called once after first SIGNED_IN event ────────────────────
  const setupFcm = useCallback(async (authedUser: User) => {
    if (fcmWiredRef.current) return;

    const cap = await loadCapacitor();
    if (!cap?.Capacitor.isNativePlatform()) return;
    fcmWiredRef.current = true;

    const { PushNotifications } = cap;

    try {
      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive !== "granted") {
        console.warn("[FCM] Permission denied");
        return;
      }

      await PushNotifications.register();

      await PushNotifications.addListener("registration", async (tokenData) => {
        const fcmToken = tokenData.value;
        if (!fcmToken) return;

        try {
          // Upsert into fcm_tokens table (token-level conflict fallback)
          const { error: tokenErr } = await supabase
            .from("fcm_tokens")
            .upsert(
              { user_id: authedUser.id, token: fcmToken, platform: "android", updated_at: new Date().toISOString() },
              { onConflict: "user_id,platform" }
            );
          if (tokenErr) {
            await supabase.from("fcm_tokens").upsert(
              { user_id: authedUser.id, token: fcmToken, platform: "android" },
              { onConflict: "token" }
            );
          }

          // Also stamp the profile row (edge functions read this column)
          await supabase
            .from("profiles")
            .update({ fcm_token: fcmToken })
            .eq("user_id", authedUser.id);

          console.log("[FCM] Token saved:", fcmToken);
        } catch (err) {
          console.error("[FCM] Error saving token:", err);
        }

        // Wire foreground display AFTER token is confirmed (critical ordering)
        await PushNotifications.addListener("pushNotificationReceived", (notification) => {
          console.log("[FCM] Foreground notification:", notification);
          // Business app can show its own toast here if desired
        });

        await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
          const data = action.notification?.data || {};
          if (data.related_booking_id) {
            window.location.href = `/calendar?booking=${data.related_booking_id}`;
          } else if (data.click_action) {
            window.location.href = data.click_action;
          } else if (data.type === "new_message") {
            window.location.hash = "/chats";
          } else {
            window.location.hash = "/notifications";
          }
        });

        await PushNotifications.addListener("registrationError", (err) => {
          console.error("[FCM] Registration error:", err);
        });
      });
    } catch (e) {
      console.warn("[FCM] Setup failed (non-fatal):", e);
      fcmWiredRef.current = false; // allow retry on next foreground
    }
  }, []);

  // ── Session refresh with error guard ────────────────────────────────────────
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
          // Token within 60 s of expiry — proactively refresh
          const { data: { session: fresh } } = await supabase.auth.refreshSession();
          applySession(fresh);
        } else {
          applySession(stored);
        }
      } else {
        applySession(null);
      }
    } catch (e) {
      console.warn("[AuthContext] refreshSession error:", e);
    }
  }, [applySession]);

  // ── Main effect ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // Subscribe FIRST — never miss an auth event
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        initialisedRef.current = true;

        // Respect "keep me signed in" on cold-start SIGNED_IN events
        if (event === "SIGNED_IN" && newSession) {
          const keep         = localStorage.getItem(KEEP_SIGNED_IN_KEY);
          const justSignedIn = sessionStorage.getItem(JUST_SIGNED_IN_KEY);

          if (keep === "0" && !justSignedIn) {
            // Cold-start with opt-out → sign out silently
            await supabase.auth.signOut();
            applySession(null);
            return;
          }
          sessionStorage.removeItem(JUST_SIGNED_IN_KEY);
        }

        applySession(newSession);

        if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && newSession?.user) {
          setupFcm(newSession.user);
        }

        if (event === "SIGNED_OUT") {
          applySession(null);
          fcmWiredRef.current = false;
        }
      }
    );

    // Cold-start hydration — only runs if onAuthStateChange hasn't fired yet
    supabase.auth.getSession().then(({ data: { session: stored } }) => {
      if (initialisedRef.current) return; // onAuthStateChange already handled it
      initialisedRef.current = true;

      if (stored) {
        const keep         = localStorage.getItem(KEEP_SIGNED_IN_KEY);
        const justSignedIn = sessionStorage.getItem(JUST_SIGNED_IN_KEY);

        if (keep === "0" && !justSignedIn) {
          supabase.auth.signOut().then(() => applySession(null));
          return;
        }
        sessionStorage.removeItem(JUST_SIGNED_IN_KEY);
      }

      applySession(stored ?? null);
      if (stored?.user) setupFcm(stored.user);
    });

    // Web: re-validate on tab focus
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshSession();
    };
    document.addEventListener("visibilitychange", onVisible);

    // Native Android: re-validate when app comes to foreground
    // Async IIFE so Vite/Rollup never bundles @capacitor/app into the web build
    let removeNativeListener: (() => void) | null = null;
    (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) refreshSession();
        });
        removeNativeListener = () => handle.remove();
      } catch {
        // Not in Capacitor — visibilitychange covers the browser
      }
    })();

    // 10-minute heartbeat — keeps session alive during long passive sessions
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

  // ── Sign out ─────────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    fcmWiredRef.current = false;
    localStorage.removeItem(KEEP_SIGNED_IN_KEY);
    sessionStorage.removeItem(JUST_SIGNED_IN_KEY);
    await supabase.auth.signOut();
    applySession(null);
  }, [applySession]);

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
