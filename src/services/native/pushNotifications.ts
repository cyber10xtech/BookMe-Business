import { isNative, getPlatform } from "./platform";
import { supabase } from "@/lib/supabase";

let registered = false;

// AuthContext.setupFcm() already wires up its own "registration"/register() flow
// on SIGNED_IN. If that has already run for this session, skip here to avoid a
// second concurrent FirebaseMessaging.getToken() call (which was firing two
// competing listener sets and, on iOS, letting this path's registration race
// ahead and overwrite the token's platform with the wrong value).
declare global {
  interface Window {
    __bookmeFcmRegistered?: boolean;
  }
}

export async function registerPushNotifications(userId: string) {
  if (registered) return;
  if (typeof window !== "undefined" && window.__bookmeFcmRegistered) {
    registered = true;
    return;
  }

  if (isNative()) {
    const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");

    const permResult = await FirebaseMessaging.requestPermissions();
    if (permResult.receive !== "granted") {
      console.warn("Push notification permission denied");
      return;
    }

    // getToken() resolves the real FCM registration token on both platforms.
    // On iOS this internally waits for the APNs device token (registered via
    // the AppDelegate callbacks) and exchanges it with Firebase for an FCM
    // token — it is NOT the raw APNs token.
    const { token } = await FirebaseMessaging.getToken();
    await saveToken(userId, token);
    registered = true;
    if (typeof window !== "undefined") window.__bookmeFcmRegistered = true;

    // Fires again whenever FCM rotates the token (app reinstall, restore,
    // token expiry, etc.) — keep the stored token in sync.
    FirebaseMessaging.addListener("tokenReceived", async (event) => {
      console.log("FCM token refreshed:", event.token);
      await saveToken(userId, event.token);
    });

    FirebaseMessaging.addListener("notificationReceived", (event) => {
      console.log("Push received in foreground:", event.notification);
    });

    FirebaseMessaging.addListener("notificationActionPerformed", (event) => {
      const data = event.notification.data as Record<string, unknown> | undefined;

      // ✅ FIXED TO MATCH BACKEND
      if (data?.related_booking_id) {
        window.location.href = `/calendar?booking=${data.related_booking_id}`;
      } else if (data?.click_action) {
        window.location.href = data.click_action as string;
      }
    });
  } else {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  }
}

async function saveToken(userId: string, token: string) {
  const platform = getPlatform(); // 'ios' | 'android' | 'web'
  // fcm_tokens.token is the table's only UNIQUE column (no unique/exclusion
  // constraint exists on (user_id, platform)), so the conflict target must
  // be "token" — matches the fix in services/notifications.ts. Upserting on
  // "token" also reassigns a row in place when a different account signs in
  // on the same device, so no separate pre-delete step is needed.
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
    console.error("[pushNotifications] saveToken fcm_tokens error:", error.message);
  }
  // Also update profiles.fcm_token for backward compatibility
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ fcm_token: token })
    .eq("user_id", userId);
  if (profileError) {
    console.error("[pushNotifications] saveToken profiles error:", profileError.message);
  }
  if (error || profileError) {
    throw error || profileError;
  }
}

export async function clearFcmToken(userId: string) {
  if (isNative()) {
    try {
      const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");
      // Read the current token before deleting it so the matching
      // fcm_tokens row (this device only) can be removed — deleting by
      // user_id alone would wipe every other device the user is signed
      // in on.
      const { token } = await FirebaseMessaging.getToken();
      if (token) {
        await supabase.from("fcm_tokens").delete().eq("token", token);
      }
      await FirebaseMessaging.deleteToken();
    } catch (e) {
      console.warn("[FCM] deleteToken failed:", e);
    }
  }
  await supabase
    .from("profiles")
    .update({ fcm_token: null })
    .eq("user_id", userId);
  registered = false;
  if (typeof window !== "undefined") window.__bookmeFcmRegistered = false;
}
