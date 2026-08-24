/**
 * capacitor.ts — Capacitor Native Bridge Utilities
 *
 * Centralises Capacitor plugin interactions that are invoked from the
 * App-level shell (App.tsx) rather than from individual feature components.
 *
 * Currently covers:
 *  - Deep link routing from push notification taps (background → foreground)
 *  - FCM push notification foreground listener setup
 */

import type { NavigateFunction } from "react-router-dom";
import { parseDeepLink } from "@/services/deepLinks";

// ─── Deep Link Handler ────────────────────────────────────────────────────────

/**
 * Sets up the Capacitor App `appUrlOpen` listener that fires when a push
 * notification tap brings the already-running Business App to the foreground
 * with an in-app deep-link URL.
 *
 * Note: Universal Link taps (shared provider links) are handled by
 * useDeepLinkRouter instead. This handler is specifically for push
 * notification action URLs.
 */
export function setupDeepLinkHandler(navigate: NavigateFunction): void {
  import("@capacitor/app")
    .then(({ App }) => {
      App.addListener("appUrlOpen", (event: { url: string }) => {
        if (!event?.url) return;

        const parsed = parseDeepLink(event.url);
        if (parsed?.route === "providerById" && parsed.providerId) {
          const qs = new URLSearchParams();
          if (parsed.ref) qs.set("ref", parsed.ref);
          if (parsed.utmCampaign) qs.set("utm_campaign", parsed.utmCampaign);
          const query = qs.toString() ? `?${qs.toString()}` : "";
          navigate(`/provider/${parsed.providerId}${query}`);
          return;
        }

        // Fallback: route by raw path for non-provider deep links
        try {
          const url = new URL(event.url);
          const path = url.pathname + url.search;
          if (path && path !== "/") navigate(path);
        } catch {
          // Malformed URL — ignore
        }
      });
    })
    .catch(() => {
      // @capacitor/app not available in web/dev builds — safe to ignore
    });
}

// ─── Push Notification Listeners ─────────────────────────────────────────────

export interface PushListenerOptions {
  /** Called when a push notification arrives while the app is in the foreground. */
  onReceived?: (notification: {
    title?: string;
    body?: string;
    data?: Record<string, string>;
  }) => void;
}

/**
 * Wires up foreground FCM push notification listeners via
 * @capacitor-firebase/messaging.
 *
 * Safe to call multiple times — duplicate listeners are a no-op because
 * Capacitor deduplicates by event name per plugin instance.
 */
export function addPushNotificationListeners(
  options: PushListenerOptions
): void {
  import("@capacitor-firebase/messaging")
    .then(({ FirebaseMessaging }) => {
      if (options.onReceived) {
        FirebaseMessaging.addListener(
          "notificationReceived",
          (event: any) => {
            const n = event?.notification ?? event;
            options.onReceived?.({
              title: n?.title,
              body: n?.body,
              data: n?.data,
            });
          }
        );
      }
    })
    .catch(() => {
      // @capacitor-firebase/messaging not available in web builds — safe to ignore
    });
}
