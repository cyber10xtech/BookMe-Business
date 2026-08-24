/**
 * Centralized provider profile link generation.
 *
 * This mirrors the exact Universal Link format produced by the BookMe
 * Customer App's own deep-link service, so both apps always resolve to
 * the same URL for a given provider:
 *
 *   https://bookmebusiness.com/provider/{providerId}
 *
 * IMPORTANT: This is intentionally kept as a single, tiny, pure function
 * with no app-specific state so it's trivial to lift into a shared
 * package (e.g. `@bookme/shared-links`) consumed by both the Business
 * and Customer apps. Until that extraction happens, treat this file as
 * the source of truth on the Business App side — do not construct
 * provider URLs anywhere else in this codebase.
 *
 * `bookmebusiness.com` is registered as an Associated Domain (iOS) / App Link
 * (Android) for the Customer App, so opening this URL on a device that
 * has the Customer App installed opens it directly to the provider's
 * public profile; otherwise it falls back to the web profile page.
 */

export const BOOKME_UNIVERSAL_LINK_DOMAIN = "https://bookmebusiness.com";

/**
 * Builds the canonical public profile Universal Link for a provider.
 * The provider never has to configure anything — this is always derived
 * from their existing profile id.
 */
export function getProviderProfileUrl(providerId: string): string {
  if (!providerId) {
    throw new Error("getProviderProfileUrl: providerId is required");
  }
  return `${BOOKME_UNIVERSAL_LINK_DOMAIN}/provider/${providerId}`;
}
