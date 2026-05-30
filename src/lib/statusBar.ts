import { Capacitor } from "@capacitor/core";

/**
 * Call once on app mount to make the Android/iOS status bar colour
 * match the app's neumorphic background (#e8ecf3 in light mode).
 * Pass isDark=true when dark mode is active.
 */
export async function syncStatusBar(isDark = false) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    // Light mode bg = hsl(220 22% 92%) ≈ #e8ecf3
    // Dark mode bg  = hsl(220 45% 12%) ≈ #0f1929
    await StatusBar.setBackgroundColor({ color: isDark ? "#0f1929" : "#e8ecf3" });
    await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch {
    // Browser or plugin not installed — silently skip
  }
}
