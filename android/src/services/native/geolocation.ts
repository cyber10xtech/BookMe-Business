import { isNative } from "./platform";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export async function requestLocationPermission(): Promise<boolean> {
  if (isNative()) {
    const { Geolocation } = await import("@capacitor/geolocation");
    const perm = await Geolocation.requestPermissions();
    return perm.location === "granted" || perm.coarseLocation === "granted";
  } else {
    // Web fallback
    if (!("geolocation" in navigator)) return false;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve(true),
        () => resolve(false),
        { timeout: 5000 }
      );
    });
  }
}

export async function getCurrentPosition(): Promise<Coordinates | null> {
  try {
    if (isNative()) {
      const { Geolocation } = await import("@capacitor/geolocation");
      const pos = await Geolocation.getCurrentPosition();
      return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    } else {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          () => resolve(null),
          { timeout: 10000 }
        );
      });
    }
  } catch {
    return null;
  }
}
