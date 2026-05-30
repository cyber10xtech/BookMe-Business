import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bookmebusiness.bookmeapp',
  appName: 'BookMe Business',
  webDir: 'dist',

  server: {
    cleartext: true,
  },

  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash_centered",
      splashFullScreen: false,
      splashImmersive: false,
      fadeOutDuration: 300,
    },

    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;