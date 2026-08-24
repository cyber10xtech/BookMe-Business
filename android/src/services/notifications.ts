import { supabase } from "@/lib/supabase";

/**
 * Upsert an FCM token for a user into the fcm_tokens table.
 * Called from AuthContext after @capacitor-firebase/messaging registration.
 *
 * user_id  — auth.users.id  (NOT profiles.id)
 * token    — FCM registration token from the device
 */
export async function upsertFcmToken(userId: string, token: string): Promise<void> {
  let platform: string;
  try {
    // Capacitor.getPlatform() is authoritative inside the native shell —
    // user-agent sniffing is a fallback since iPadOS can mask its UA as
    // desktop Safari, which would mislabel the token as "web".
    platform = (window as any)?.Capacitor?.getPlatform?.();
  } catch {
    platform = undefined;
  }
  if (!platform) {
    platform =
      /android/i.test(navigator.userAgent) ? "android"
      : /iphone|ipad|ipod/i.test(navigator.userAgent) ? "ios"
      : "web";
  }

  // fcm_tokens.token carries the table's only UNIQUE constraint (see schema —
  // there is no unique/exclusion constraint on (user_id, platform), so an
  // upsert with onConflict: "user_id,platform" fails on every call with
  // Postgres error 42P10 "no unique or exclusion constraint matching the
  // ON CONFLICT specification"). Conflict must target "token" instead.
  //
  // This also matches the desired device semantics: one row per physical
  // device token, so a user can hold several rows (multiple devices) and a
  // token is reassigned in place if a different account signs in on the
  // same device (multiple users per device), rather than being keyed off
  // (user_id, platform) which would collide two devices of the same
  // platform for one user.
  const { error } = await supabase
    .from("fcm_tokens")
    .upsert(
      {
        user_id: userId,
        token,
        platform,
        app_type: "business",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "token" }
    );

  if (error) {
    // Surfaced to the caller instead of swallowed — AuthContext.setupFcm()
    // already wraps saveToken() in a try/catch and logs via
    // "[FCM] Setup failed", so throwing here makes a failed save visible
    // there rather than silently vanishing.
    console.error("[notifications] upsertFcmToken error:", error.message);
    throw error;
  }
}
