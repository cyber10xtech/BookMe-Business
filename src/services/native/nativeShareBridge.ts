import { registerPlugin } from "@capacitor/core";

/**
 * Bridge for ios/App/App/NativeSharePlugin.swift — see that file for why it
 * exists (card-only share via LPLinkMetadata, no visible raw URL/path).
 *
 * iOS only. Do not call this on Android/web — see shareProfile.ts for the
 * platform branch; there is no equivalent native module for those platforms.
 */
export interface NativeShareTarget {
  shareProviderCard(options: {
    url: string;
    title: string;
    /** Local file path or file:// URI to a staged image, e.g. from Filesystem.getUri(). */
    imagePath?: string;
  }): Promise<{ completed: boolean }>;
}

export const NativeShare = registerPlugin<NativeShareTarget>("NativeShare");
