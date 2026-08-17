import { isNative, getPlatform } from "./platform";
import { buildProviderShareUrl } from "@/services/deepLinks";

/**
 * Shares a provider's public BookMe profile using the platform's native
 * share sheet — deliberately built so the shared content reads as "a
 * business card from the BookMe app," not "a website link."
 *
 * PRODUCTION DEEP-LINK DOMAIN
 * All shared URLs use: https://business.bookmebusiness.com/provider/{providerId}
 * DO NOT use https://bookme.app or https://bookmebusiness.com — those are wrong.
 *
 * THE CORE CONSTRAINT (read before changing this file)
 * A generic OS share sheet has no concept of "tappable but URL hidden."
 * The Universal Link has to be part of what's shared for the recipient's
 * tap to actually open the Customer App / redirect to a store — what
 * differs by platform is how much of that link is VISIBLE as text:
 *
 * - iOS: routed through the custom NativeSharePlugin (see
 *   ios/App/App/NativeSharePlugin.swift), which supplies LPLinkMetadata
 *   directly. Share targets that support it (Messages, Mail, etc.) render
 *   a genuine card — business name + image — with no raw "/provider/{id}"
 *   path visible. iOS itself still shows the link's bare HOST (e.g.
 *   "business.bookmebusiness.com") as a small trust indicator on that card;
 *   that's an OS design choice no app can suppress. If the native plugin
 *   call fails for any reason (most likely: app hasn't been rebuilt in Xcode
 *   since this was added), this falls back to the @capacitor/share path below
 *   rather than silently doing nothing.
 * - Android: no OS-level "rich card" concept exists for a generic
 *   Intent.ACTION_SEND — whatever a receiving app shows is entirely up to
 *   that app. The closest achievable equivalent is what's used here: the
 *   business's own photo attached as a real file (so it renders as an
 *   actual image, not text) plus a short caption, via @capacitor/share.
 *   The link is still technically present in the shared text (share
 *   targets need it to build their own preview/tap-through), but it is
 *   not the focus — the caption and attached image are.
 * - Web (dev only): Web Share API / clipboard fallback, caption + link,
 *   no image attachment support.
 *
 * RECEIVING BEHAVIOUR
 * The Business App does NOT handle incoming shared links. All shared
 * https://business.bookmebusiness.com/provider/{id} links resolve to the
 * BOOKME CUSTOMER APP:
 *   - iOS Customer App: https://apps.apple.com/us/app/bookme-book-a-service/id6782405521
 *   - Android Customer App: https://play.google.com/store/apps/details?id=com.bookmebusiness.customerapp1
 *
 * When the Customer App is installed, the OS intercepts the URL directly.
 * When it is not installed, ProviderProfileByIdRedirectPage detects the platform
 * automatically and redirects to the correct store — no user choice required.
 *
 * We deliberately do NOT build a custom share UI — whichever apps the
 * user has installed are surfaced by the OS itself.
 */

export interface ShareProviderProfileOptions {
  businessName?: string | null;
  /** Short business description/bio, used to build the caption. Truncated if long. */
  description?: string | null;
  /** Business logo or cover photo — downloaded and attached as the share image on native. */
  imageUrl?: string | null;
  /** Analytics/attribution ref tag (default: "profile_share") */
  ref?: string;
}

const MAX_CAPTION_DESCRIPTION_LENGTH = 80;

function buildCaption(options?: ShareProviderProfileOptions): string {
  const name = options?.businessName?.trim();
  if (!name) return "My BookMe profile";

  const description = options?.description?.trim();
  if (!description) return name;

  const truncated =
    description.length > MAX_CAPTION_DESCRIPTION_LENGTH
      ? `${description.slice(0, MAX_CAPTION_DESCRIPTION_LENGTH).trimEnd()}…`
      : description;

  return `${name} — ${truncated}`;
}

/**
 * Downloads a remote image into the app's cache directory and returns a
 * local file URI both the Android @capacitor/share path and the iOS native
 * plugin can use. Returns null on any failure (offline, CORS, no image set,
 * etc.) so the caller can fall back to a share with no image attachment
 * rather than failing the whole share.
 */
async function stageShareImage(
  imageUrl: string,
  providerId: string
): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    const blob = await response.blob();

    const extension = blob.type.includes("png") ? "png" : "jpg";
    const path = `share-${providerId}.${extension}`;

    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip the "data:image/jpeg;base64," prefix — Filesystem wants raw base64.
        resolve(result.split(",")[1] ?? "");
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    if (!base64Data) return null;

    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    await Filesystem.writeFile({
      path,
      data: base64Data,
      directory: Directory.Cache,
    });
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
    return uri;
  } catch {
    // Offline, CORS-blocked, no image configured, etc. — share still works without it.
    return null;
  }
}

/**
 * Opens the native share sheet for the business owner's own provider profile.
 *
 * URL format: https://business.bookmebusiness.com/provider/{providerId}
 *
 * Returns "copied" if the link was copied to clipboard (web fallback),
 * or undefined if the share sheet was opened (or dismissed by the user).
 */
export async function shareProviderProfile(
  providerId: string,
  options?: ShareProviderProfileOptions
): Promise<"copied" | undefined> {
  // Build the canonical provider share URL with attribution params.
  // Uses business.bookmebusiness.com — the ONLY production deep-link domain.
  const url = buildProviderShareUrl({
    providerId,
    ref: options?.ref ?? "profile_share",
    utmSource: "share",
    providerBusinessName: options?.businessName ?? undefined,
  });
  const caption = buildCaption(options);

  if (isNative()) {
    const imageUri = options?.imageUrl
      ? await stageShareImage(options.imageUrl, providerId)
      : null;

    if (getPlatform() === "ios") {
      try {
        const { NativeShare } = await import("./nativeShareBridge");
        const result = await NativeShare.shareProviderCard({
          url,
          title: caption,
          imagePath: imageUri ?? undefined,
        });
        if (result.completed === false) return; // user dismissed the sheet
        return;
      } catch {
        // Plugin not linked yet (app not rebuilt since it was added) or any
        // other native failure — fall through to the generic path below
        // rather than leaving the Share button silently broken.
      }
    }

    // Android, and iOS fallback if the native plugin call above failed.
    const { Share } = await import("@capacitor/share");
    await Share.share({
      title: caption,
      text: caption,
      url,
      files: imageUri ? [imageUri] : undefined,
      dialogTitle: "Share your profile",
    });
    return;
  }

  // Web / PWA
  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      await (
        navigator as Navigator & {
          share: (data: ShareData) => Promise<void>;
        }
      ).share({
        title: caption,
        text: caption,
        url,
      });
      return;
    } catch (err) {
      // AbortError = user dismissed the share sheet; nothing to do.
      if ((err as Error)?.name === "AbortError") return;
      // Otherwise fall through to clipboard fallback below.
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(url);
    return "copied" as const;
  }
}

/**
 * NOTE on link-preview cards when a URL is pasted directly into a chat
 * (not shared through this button): that unfurling is done by the
 * RECEIVING app fetching Open Graph meta tags from the URL's actual web
 * page — https://business.bookmebusiness.com/provider/{id}, served by the
 * Customer App/backend, not this repo. The OG meta tags must include the
 * business name, description, and image for rich previews in WhatsApp,
 * Telegram, iMessage, etc.
 */
