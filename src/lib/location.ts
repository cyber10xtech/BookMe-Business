import { Capacitor } from '@capacitor/core';

export const requestLocation = async () => {
  try {
    if (!Capacitor.isNativePlatform()) {
      // Web fallback using browser Geolocation API
      return new Promise((resolve) => {
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            () => { console.log('Location denied'); resolve(null); },
            { enableHighAccuracy: true, timeout: 10000 }
          );
        } else {
          console.log('Geolocation not available');
          resolve(null);
        }
      });
    }
    const { Geolocation } = await import('@capacitor/geolocation');
    const pos = await Geolocation.getCurrentPosition();
    console.log(pos);
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch (err) {
    console.log('Location denied');
    return null;
  }
};
