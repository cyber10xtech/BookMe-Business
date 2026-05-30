import { isNative } from "./platform";

export function setupDeepLinks(navigate: (path: string) => void) {
  if (isNative()) {
    import("@capacitor/app").then(({ App }) => {
      App.addListener("appUrlOpen", (event) => {
        const url = new URL(event.url);
        const path = url.pathname + url.search;
        if (path) navigate(path);
      });
    });
  }
}
