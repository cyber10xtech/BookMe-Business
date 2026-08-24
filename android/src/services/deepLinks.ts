/**
 * deepLinks.ts — BookMe Deep Link Service
 *
 * Production deep-link domain: https://business.bookmebusiness.com
 *
 * Handles:
 *  1. OUTBOUND — builds share URLs: https://business.bookmebusiness.com/provider/{uuid}
 *  2. INBOUND  — parses Universal Link / App Link URLs into structured routes
 *  3. DEFERRED — saves a PendingLink before share for post-install restoration
 *
 * Apple Universal Links and Android App Links intercept the HTTPS URL at the
 * OS level before the browser opens — the app opens directly to the correct
 * provider profile. The web page at business.bookmebusiness.com only runs when
 * the app is NOT installed.
 */

import { savePendingLink } from "@/services/pendingLink";
import { trackShareGenerated } from "@/services/deepLinkAnalytics";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProviderShareParams {
  providerId: string;
  providerName?: string;
  providerBusinessName?: string;
  ref?: string;
  utmCampaign?: string;
  utmSource?: string;
  /** Auth user id of the sharer — used for analytics attribution */
  sharerId?: string;
}

export interface ParsedDeepLink {
  route: "providerById" | "unknown";
  providerId?: string;
  ref?: string;
  utmCampaign?: string;
  rawUrl: string;
}

export interface ShareResult {
  method: "native" | "clipboard" | "failed";
  url: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const BASE_URL = "https://business.bookmebusiness.com";
export const ANDROID_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.bookmebusiness.customerapp1";
export const IOS_STORE_URL =
  "https://apps.apple.com/us/app/bookme-book-a-service/id6782405521";

// ─── URL builder ──────────────────────────────────────────────────────────────

/**
 * Builds the canonical provider share URL:
 *   https://business.bookmebusiness.com/provider/{providerId}?ref=...&utm_source=...
 *
 * This is the ONLY share URL format.
 */
export const buildProviderShareUrl = (params: ProviderShareParams): string => {
  const {
    providerId,
    ref = "profile_share",
    utmCampaign,
    utmSource = "share",
  } = params;

  const qs = new URLSearchParams();
  if (ref) qs.set("ref", ref);
  qs.set("utm_source", utmSource);
  if (utmCampaign) qs.set("utm_campaign", utmCampaign);

  return `${BASE_URL}/provider/${encodeURIComponent(providerId)}?${qs.toString()}`;
};

// ─── URL parser ───────────────────────────────────────────────────────────────

/**
 * Parses an inbound deep-link URL.
 * Only accepts business.bookmebusiness.com.
 */
export const parseDeepLink = (urlString: string): ParsedDeepLink | null => {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return null;
  }

  if (url.hostname !== "business.bookmebusiness.com") return null;

  const qs = url.searchParams;
  const meta = {
    ref: qs.get("ref") ?? undefined,
    utmCampaign: qs.get("utm_campaign") ?? undefined,
    rawUrl: urlString,
  };

  // /provider/{uuid} — only supported path
  const idMatch = url.pathname.match(/^\/provider\/([^/?#]+)/);
  if (idMatch) {
    return {
      route: "providerById",
      providerId: decodeURIComponent(idMatch[1]),
      ...meta,
    };
  }

  return { route: "unknown", ...meta };
};

// ─── Platform detection ───────────────────────────────────────────────────────

export const detectIOS = (): boolean =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export const getStoreUrl = (): string =>
  detectIOS() ? IOS_STORE_URL : ANDROID_STORE_URL;

// ─── Share sheet ──────────────────────────────────────────────────────────────

/**
 * Opens the native OS share sheet with the provider deep-link URL.
 *
 * Tries @capacitor/share (native iOS/Android share sheet) first.
 * Falls back to navigator.share (PWA) then clipboard.
 *
 * Also saves a PendingLink to localStorage for deferred deep link restoration
 * and fires the share_generated analytics event.
 */
export const shareProvider = async (params: ProviderShareParams): Promise<ShareResult> => {
  const url = buildProviderShareUrl(params);

  // Save pending link for deferred deep linking
  savePendingLink({
    kind: "provider",
    providerId: params.providerId,
    ref: params.ref ?? "profile_share",
    utmSource: params.utmSource ?? "share",
    utmCampaign: params.utmCampaign,
  });

  // Analytics
  trackShareGenerated(params.providerId, params.ref, params.utmCampaign, params.sharerId);

  const displayName = params.providerBusinessName ?? params.providerName;
  const title = displayName
    ? `Book ${displayName} on BookMe`
    : "Book on BookMe";
  const text = displayName
    ? `Check out ${displayName} on BookMe — easy online booking!`
    : "Check out this service provider on BookMe!";

  // Try @capacitor/share (native share sheet — first-party feel on iOS + Android)
  try {
    const { Share } = await import("@capacitor/share");
    await Share.share({ title, text, url, dialogTitle: title });
    return { method: "native", url };
  } catch (err: any) {
    const msg: string = err?.message ?? "";
    // User dismissed the share sheet — counts as native success
    if (
      msg.includes("cancelled") ||
      msg.includes("cancel") ||
      err?.name === "AbortError"
    ) {
      return { method: "native", url };
    }
    // @capacitor/share not available or threw unexpectedly — fall through
  }

  // PWA / browser fallback
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text, url });
      return { method: "native", url };
    } catch (err: any) {
      if (err?.name === "AbortError") return { method: "native", url };
    }
  }

  // Last resort: clipboard
  try {
    await navigator.clipboard.writeText(url);
    return { method: "clipboard", url };
  } catch {
    return { method: "failed", url };
  }
};
