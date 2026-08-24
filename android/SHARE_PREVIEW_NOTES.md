# Profile share: no visible URL, card-only where the platform allows it

## The constraint this is built around
A generic OS share sheet has no "tappable but hidden link" concept. If the
shared content needs to open the Customer App / redirect to a store on tap,
the Universal Link has to be part of what's shared — what differs by
platform is how much of it is VISIBLE as text, not whether it's present at
all. This implementation gets each platform to its real ceiling:

| Platform | What the recipient sees | How |
|---|---|---|
| iOS | Business name + image as a real card. No raw `/provider/{id}` path, no "here's a link" sentence. iOS itself still shows the bare **host** (`bookmebusiness.com`) as a small trust indicator on the card — that's an OS-level design choice, not something any app (including this one) can suppress. | Custom native plugin (`ios/App/App/NativeSharePlugin.swift`) supplying `LPLinkMetadata` directly, instead of Capacitor's stock `@capacitor/share`. |
| Android | Business logo/cover attached as a real image file + a short caption. The link is technically present in the shared text (receiving apps need it), but it isn't the visible focus — no separate "check out this link" sentence. | `@capacitor/share` with `files: [staged image]`. There is no OS-level rich-card mechanism for a generic `Intent.ACTION_SEND` on Android — this is the closest achievable equivalent, not a compromise specific to this app. |
| Web (dev only) | Caption + link via Web Share API, or copy-to-clipboard. No image attachment support in either. | Unchanged fallback. |

## What's new in this pass
- **`ios/App/App/NativeSharePlugin.swift`** — new custom Capacitor plugin,
  iOS only. Auto-registers (Capacitor scans for `CAPBridgedPlugin` classes
  compiled into the app target — no `Info.plist` entry needed, confirmed
  none exists already in this project).
- **`src/services/native/nativeShareBridge.ts`** — thin TS wrapper
  (`registerPlugin`) for the above.
- **`src/services/native/shareProfile.ts`** — now branches: iOS calls the
  native plugin; if that call fails for any reason (most likely: app
  hasn't been rebuilt in Xcode since this plugin was added), it falls back
  to the `@capacitor/share` path rather than leaving the button silently
  broken. Android is unchanged from the previous pass.

## ⚠️ This needs a real build/test pass — I can't do that here
`NativeSharePlugin.swift` is new native code written without the ability to
run Xcode or a simulator in this environment. Before shipping:
1. `npm install && npx cap sync ios` (picks up the new Swift file, and
   `@capacitor/filesystem` if not already synced).
2. Open `ios/App/App.xcworkspace` in Xcode, build, and run on a simulator
   or device.
3. Tap Share on a profile with a logo set, and specifically check: (a) the
   plugin is found (no "not implemented" console error — confirms
   auto-registration worked), (b) Messages/Mail render a card with the
   business name + image and no visible path text, (c) tapping that card
   as the recipient actually opens/redirects correctly.
4. If the plugin doesn't auto-register for any reason, the fallback means
   the Share button keeps working (Android-style: caption + attached image
   + link in the text) — it just won't be card-only on iOS until that's
   fixed.

## Still out of this repo's control
If someone copy-pastes the `bookmebusiness.com/provider/{id}` link directly into a
chat (not through this Share button), whether that shows a rich preview is
up to the recipient's app fetching Open Graph tags from that page — served
by the Customer App/backend, not this repo, and it needs to be rendered
server-side per provider (a client-only SPA render won't be seen by those
scrapers). The native-card approach above covers what was asked — taps on
the in-app Share button — regardless of that.
