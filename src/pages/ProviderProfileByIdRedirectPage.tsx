/**
 * ProviderProfileByIdRedirectPage
 *
 * Handles the /provider/:id route in a WEB BROWSER on business.bookmebusiness.com.
 *
 * When the app IS installed, iOS/Android intercept the HTTPS URL at the OS level
 * via Universal Links / App Links BEFORE the browser ever opens. This page is
 * never rendered in that case — the app opens directly to the provider profile.
 *
 * When the app is NOT installed, the browser opens this page. The goal is to
 * make this transition completely invisible to the user:
 *
 *   1. Detect iOS or Android from the user-agent — no user choice needed.
 *   2. Save the provider ID as a PendingLink immediately (no DB round-trip).
 *   3. Fire analytics via sendBeacon (survives page unload).
 *   4. Redirect to the correct store with window.location.replace — instant,
 *      no back button, no page shown.
 *
 * Provider validation happens AFTER install + sign-in inside useDeferredDeepLink,
 * not here. Validating here would add a Supabase round-trip delay that the user
 * would see as a visible spinner — we eliminate that entirely.
 *
 * Fallback: if the provider ID in the URL is missing or malformed, redirect to
 * the store anyway (the user still gets BookMe). useDeferredDeepLink will clear
 * any bad pending link gracefully.
 *
 * iOS deferred note: Safari localStorage is NOT shared with WKWebView. The
 * deferred path works reliably on Android. On iOS, Universal Links (app already
 * installed) is the primary mechanism and covers the dominant use-case.
 */

import { useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { savePendingLink } from "@/services/pendingLink";
import { trackLinkOpened, trackStoreRedirect } from "@/services/deepLinkAnalytics";
import { detectIOS, IOS_STORE_URL, ANDROID_STORE_URL } from "@/services/deepLinks";

const isNativeCapacitor = (): boolean => {
  try { return !!(window as any)?.Capacitor?.isNative; } catch { return false; }
};

const ProviderProfileByIdRedirectPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // ── Native fallback: OS should have intercepted this before the browser
    // opened — but if we're here natively, navigate internally immediately.
    if (isNativeCapacitor()) {
      const qs = new URLSearchParams();
      const ref = searchParams.get("ref");
      const utm = searchParams.get("utm_campaign");
      if (ref) qs.set("ref", ref);
      if (utm) qs.set("utm_campaign", utm);
      navigate(`/provider/${id}${qs.toString() ? `?${qs}` : ""}`, { replace: true });
      return;
    }

    if (!id) {
      // No provider ID — still send to correct store
      window.location.replace(detectIOS() ? IOS_STORE_URL : ANDROID_STORE_URL);
      return;
    }

    const ref = searchParams.get("ref") ?? undefined;
    const utmSource = searchParams.get("utm_source") ?? "share";
    const utmCampaign = searchParams.get("utm_campaign") ?? undefined;
    const rawUrl = window.location.href;

    // 1. Save pending link SYNCHRONOUSLY — no DB call, no delay.
    //    Validation happens inside useDeferredDeepLink after install + sign-in.
    savePendingLink({
      kind: "provider",
      providerId: id,
      ref,
      utmSource,
      utmCampaign,
    });

    // 2. Detect platform and pick store — automatic, no user choice.
    const isIOS = detectIOS();
    const platform: "ios" | "android" = isIOS ? "ios" : "android";
    const storeUrl = isIOS ? IOS_STORE_URL : ANDROID_STORE_URL;

    // 3. Fire analytics via sendBeacon — survives the page unload.
    trackLinkOpened(rawUrl, id, ref);
    trackStoreRedirect(platform, id);

    // 4. Redirect — replace so there is no back-button entry for this page.
    window.location.replace(storeUrl);

  }, []); // run once on mount only

  // Render nothing — the redirect fires synchronously before the browser can
  // paint. On the rare occasion paint does happen (very slow JS parse), show
  // a transparent screen rather than a spinner or any BookMe UI.
  return null;
};

export default ProviderProfileByIdRedirectPage;
