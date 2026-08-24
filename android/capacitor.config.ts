import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bookmebusiness.bookmeapp',
  appName: 'BookMe Business',
  webDir: 'dist',

  server: {
    cleartext: true,
  },

  ios: {
    // Allow the WKWebView to render edge-to-edge, behind the status bar and
    // home indicator. The web layer uses CSS env(safe-area-inset-*) to push
    // its own content below the status bar — matching native app behaviour.
    contentInset: 'always',
    // Scroll to top on status-bar tap (standard iOS behaviour)
    scrollEnabled: true,
    // Use the system background colour while the webview is loading
    backgroundColor: '#ffffff',
  },

  // Required by @capacitor-firebase/messaging to avoid an SPM package-identity
  // collision between this app's local CapApp-SPM package and the plugin's own
  // firebase-ios-sdk dependency. See:
  // https://github.com/capawesome-team/capacitor-firebase/issues/959
  experimental: {
    ios: {
      spm: {
        packageOptions: {
          '@capacitor-firebase/messaging': {
            symlink: true,
          },
        },
      },
    },
  },

  plugins: {
    SplashScreen: {
      // launchAutoHide: false means we call SplashScreen.hide() manually in
      // src/lib/statusBar.ts (syncStatusBar), right after the status bar is
      // configured. This gives us control over the exact moment the splash
      // disappears — after the WebView is ready and status bar is configured.
      launchAutoHide: false,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash_centered',
      splashFullScreen: false,
      splashImmersive: false,
      fadeOutDuration: 300,
    },

    FirebaseMessaging: {
      // Show banners/badges/sounds when the app is in the foreground (iOS only).
      // The native permission dialog is triggered by FirebaseMessaging.requestPermissions()
      // in src/services/native/pushNotifications.ts on first use.
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
