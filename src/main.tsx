import { createRoot } from "react-dom/client";
import { isNative } from "@/services/native/platform";
import App from "./App.tsx";
import "./index.css";

// Unregister service workers in preview/iframe contexts
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((regs) =>
    regs.forEach((r) => r.unregister())
  );
}

createRoot(document.getElementById("root")!).render(<App />);

const shouldRegisterServiceWorker = () => {
  if (isPreviewHost || isInIframe) return false;
  if (!('serviceWorker' in navigator)) return false;
  if (isNative()) return true;
  return window.location.protocol === 'https:' || window.location.hostname === 'localhost';
};

if (shouldRegisterServiceWorker()) {
  const origin = window.location.origin === 'null' ? '' : window.location.origin;
  const swUrl = `${origin}/sw.js`;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(swUrl).then((reg) => {
      console.log('Service worker registered:', reg.scope);
    }).catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}
