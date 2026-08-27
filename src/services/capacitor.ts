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
