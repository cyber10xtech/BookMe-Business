/**
 * pendingLink.ts — Deferred Deep Link Persistence
 *
 * Saves and retrieves a "pending link" in localStorage so that when a
 * recipient taps a shared provider profile link, installs the Customer App,
 * and signs in for the first time, useDeferredDeepLink can restore them to
 * the original provider profile they were sent to.
 *
 * IMPORTANT: On iOS, Safari localStorage is NOT shared with WKWebView.
 * Deferred deep linking works reliably on Android. On iOS, Universal Links
 * (app already installed) is the primary mechanism — if the app IS installed,
 * the OS intercepts the URL before Safari ever opens, so this code path is
 * never needed on iOS for the installed-app case.
 *
 * Links expire after 7 days to avoid stale navigations.
 */

const STORAGE_KEY = "bookme_pending_link";
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type PendingLink =
  | {
      kind: "provider";
      providerId: string;
      ref?: string;
      utmSource?: string;
      utmCampaign?: string;
      savedAt: number;
    };

/**
 * Saves a pending link to localStorage for later restoration.
 * Overwrites any previously saved link (last write wins).
 */
export function savePendingLink(
  link: Omit<PendingLink, "savedAt">
): void {
  try {
    const record: PendingLink = { ...link, savedAt: Date.now() } as PendingLink;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // localStorage may be unavailable (private browsing, storage full, etc.)
    // — fail silently; the deferred link is a UX enhancement, not required.
  }
}

/**
 * Reads the pending link from localStorage.
 * Returns null if there is no link, if it has expired (>7 days), or if
 * the stored value is malformed.
 */
export function getPendingLink(): PendingLink | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const link = JSON.parse(raw) as PendingLink;

    // Validate minimum shape
    if (!link?.kind || !link?.savedAt) return null;

    // Expire after 7 days
    if (Date.now() - link.savedAt > EXPIRY_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return link;
  } catch {
    return null;
  }
}

/**
 * Clears the pending link from localStorage.
 * Call this after the link has been successfully consumed or when it
 * turns out to be invalid.
 */
export function clearPendingLink(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silent — if we can't clear it, getPendingLink's expiry check
    // will clean it up eventually.
  }
}
