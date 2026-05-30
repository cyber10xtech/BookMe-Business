import { isNative } from "./platform";
import { supabase } from "@/lib/supabase";

let registered = false;

export async function registerPushNotifications(userId: string) {
  if (registered) return;

  if (isNative()) {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive !== "granted") {
      console.warn("Push notification permission denied");
      return;
    }

    await PushNotifications.register();

    PushNotifications.addListener("registration", async (token) => {
      console.log("FCM Token:", token.value);
      // Upsert into fcm_tokens table
      await supabase
        .from("fcm_tokens")
        .upsert(
          { user_id: userId, token: token.value, platform: "android" },
          { onConflict: "token" }
        );
      // Also update profiles.fcm_token for backward compatibility
      await supabase
        .from("profiles")
        .update({ fcm_token: token.value })
        .eq("user_id", userId);
      registered = true;
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.error("Push registration error:", err.error);
    });

    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      console.log("Push received in foreground:", notification);
    });

    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const data = action.notification.data;

      // ✅ FIXED TO MATCH BACKEND
      if (data?.related_booking_id) {
        window.location.href = `/calendar?booking=${data.related_booking_id}`;
      } else if (data?.click_action) {
        window.location.href = data.click_action;
      }
    });
  } else {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  }
}

export async function clearFcmToken(userId: string) {
  await supabase
    .from("profiles")
    .update({ fcm_token: null })
    .eq("user_id", userId);
  registered = false;
}