/**
 * Centralized provider profile link generation.
 *
 * Both the Business App (share side) and Customer App (receive side) must use
 * the same URL format for a given provider:
 *
 *   https://business.bookmebusiness.com/provider/{providerId}
 *
 * This is the ONLY production deep-link domain for BookMe provider profiles.
 * Do NOT use https://bookmebusiness.com or https://bookme.app.
 *
 * IMPORTANT: This is intentionally kept as a single, tiny, pure function
 * with no app-specific state so it's trivial to lift into a shared
 * package (e.g. `@bookme/shared-links`) consumed by both the Business
 * and Customer apps. Until that extraction happens, treat this file as
 * the source of truth on the Business App side — do not construct
 * provider URLs anywhere else in this codebase (use deepLinks.ts
 * buildProviderShareUrl instead for the full share flow with UTM params).
 *
 * `business.bookmebusiness.com` is registered as an Associated Domain (iOS) /
 * App Link (Android) for the Customer App, so opening this URL on a device
 * that has the Customer App installed opens it directly to the provider's
 * public profile; otherwise the ProviderProfileByIdRedirectPage falls back
 * to the correct app store automatically.
 */

/** Production deep-link domain — must never change without coordinating with the Customer App. */
export const BOOKME_UNIVERSAL_LINK_DOMAIN = "https://business.bookmebusiness.com";

/**
 * Builds the canonical public profile Universal Link for a provider.
 * The provider never has to configure anything — this is always derived
 * from their existing profile id.
 *
 * Format: https://business.bookmebusiness.com/provider/{providerId}
 */
export function getProviderProfileUrl(providerId: string): string {
  if (!providerId) {
    throw new Error("getProviderProfileUrl: providerId is required");
  }
  return `${BOOKME_UNIVERSAL_LINK_DOMAIN}/provider/${encodeURIComponent(providerId)}`;
}
