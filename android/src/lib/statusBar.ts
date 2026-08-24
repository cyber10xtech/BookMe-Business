import { Capacitor } from "@capacitor/core";

/**
 * Call once on app mount to configure the iOS/Android status bar and
 * dismiss the splash screen.
 *
 * iOS 26 / modern Capacitor approach:
 *   - overlay = true  → web content extends behind the status bar (edge-to-edge)
 *   - Style.Light/Dark → sets the icon/text colour to contrast the app background
 *
 * The web layer must use CSS  padding-top: env(safe-area-inset-top)  (or the
 * Tailwind equivalents: pt-[env(safe-area-inset-top)] / safe-top utilities)
 * to push its own content below the status bar.
 *
 * Pass isDark=true when dark mode is active.
 *
 * SplashScreen note:
 *   capacitor.config.ts has launchAutoHide: false, which means the native splash
 *   will stay visible indefinitely unless we call SplashScreen.hide() ourselves.
 *   We do it here (after status-bar is configured) so the transition is seamless.
 */
export async function syncStatusBar(isDark = false) {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    // Extend content behind the status bar so the app fills edge-to-edge
    await StatusBar.setOverlaysWebView({ overlay: true });
    // Match icon colour to the app theme
    await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
  } catch {
    // @capacitor/status-bar not installed or running in browser — silently skip
  }

  // Dismiss the splash screen.
  // launchAutoHide is false in capacitor.config.ts so we must call hide()
  // manually. Doing it here (after status-bar is set) ensures the web content
  // is visually ready before the splash fades out.
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch {
    // @capacitor/splash-screen not available in browser — silently skip
  }
}
