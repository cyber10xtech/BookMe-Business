/**
 * deepLinkAnalytics.ts — Deep Link Event Tracking
 *
 * Thin analytics wrapper for deep-link lifecycle events. All functions are
 * fire-and-forget; failures are silently swallowed so they never block the
 * share or navigation flow.
 *
 * Currently logs to the console in development and uses navigator.sendBeacon
 * (where supported) for events that fire during page unloads (trackLinkOpened,
 * trackStoreRedirect) so the data survives the page being closed.
 *
 * Replace the console.debug calls and sendBeacon payloads with real analytics
 * (e.g. Mixpanel, Amplitude, Supabase edge function) as needed.
 */

const isDev = import.meta.env.DEV;

function log(event: string, data: Record<string, unknown>) {
  if (isDev) {
    console.debug(`[DeepLinkAnalytics] ${event}`, data);
  }
}

/**
 * Fired by shareProvider() in deepLinks.ts when a share URL is generated.
 */
export function trackShareGenerated(
  providerId: string,
  ref?: string,
  utmCampaign?: string,
  sharerId?: string
): void {
  try {
    log("share_generated", { providerId, ref, utmCampaign, sharerId });
    // TODO: send to your analytics backend, e.g.:
    // analytics.track('share_generated', { providerId, ref, utmCampaign, sharerId });
  } catch {
    // Never throw — analytics must not break the share flow
  }
}

/**
 * Fired by ProviderProfileByIdRedirectPage when a shared link is opened in
 * a browser (i.e. Customer App not installed). Uses sendBeacon so the event
 * survives the immediate page unload caused by the store redirect.
 */
export function trackLinkOpened(
  rawUrl: string,
  providerId?: string,
  ref?: string
): void {
  try {
    log("link_opened", { rawUrl, providerId, ref });
    // sendBeacon survives the upcoming window.location.replace()
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      // TODO: replace with your real analytics endpoint
      // navigator.sendBeacon('/api/analytics', JSON.stringify({ event: 'link_opened', providerId, ref }));
    }
  } catch {
    /* silent */
  }
}

/**
 * Fired by ProviderProfileByIdRedirectPage just before redirecting the user
 * to their platform's app store.
 */
export function trackStoreRedirect(
  platform: "ios" | "android",
  providerId?: string
): void {
  try {
    log("store_redirect", { platform, providerId });
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      // TODO: replace with your real analytics endpoint
      // navigator.sendBeacon('/api/analytics', JSON.stringify({ event: 'store_redirect', platform, providerId }));
    }
  } catch {
    /* silent */
  }
}

/**
 * Fired by useDeepLinkRouter when the app is opened via a Universal Link /
 * App Link (i.e. Customer App IS installed).
 */
export function trackAppOpened(
  providerId?: string,
  userId?: string,
  ref?: string
): void {
  try {
    log("app_opened_via_link", { providerId, userId, ref });
  } catch {
    /* silent */
  }
}

/**
 * Fired by useDeferredDeepLink when a stored pending link is successfully
 * restored after the user installs and signs in.
 */
export function trackDeferredRestored(
  providerId: string,
  userId: string,
  ref?: string
): void {
  try {
    log("deferred_link_restored", { providerId, userId, ref });
  } catch {
    /* silent */
  }
}

/**
 * Fired by useDeferredDeepLink when a pending link is discarded (expired,
 * provider not found, network error, etc.).
 */
export function trackDeferredCleared(
  reason: string,
  providerId?: string,
  userId?: string
): void {
  try {
    log("deferred_link_cleared", { reason, providerId, userId });
  } catch {
    /* silent */
  }
}
