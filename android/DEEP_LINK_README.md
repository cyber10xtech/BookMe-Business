# BookMe Deep Link System — Production Reference

Production domain: **https://business.bookmebusiness.com**

---

## Share URL format

```
https://business.bookmebusiness.com/provider/{providerId}?ref=profile_share&utm_source=share
```

This is the only URL format. No slug paths (`/p/*`). The provider ID is the
Supabase `profiles.id` UUID of the business profile being shared.

---

## End-to-end flow

### App installed — OS intercepts before browser opens

```
Business owner taps Share → shareProvider() builds URL → native share sheet opens
Recipient taps link
  → iOS: Universal Links intercepts → app opens → appUrlOpen fires → /provider/{id}
  → Android: App Links intercepts → app opens → appUrlOpen fires → /provider/{id}
No browser. No page. Direct to provider profile.
```

### App NOT installed — instant store redirect

```
Recipient taps link
  → Browser opens business.bookmebusiness.com/provider/{id}
  → ProviderProfileByIdRedirectPage runs (renders nothing — page is invisible)
    1. savePendingLink({ kind:"provider", providerId }) — synchronous, no DB call
    2. detectIOS() — automatic, no user choice
    3. trackLinkOpened() + trackStoreRedirect() via sendBeacon
    4. window.location.replace(App Store | Play Store) — instant, no back button
  → Recipient sees the store immediately
```

### Deferred deep link — post-install restoration

```
Recipient installs BookMe Customer → opens app → signs in or creates account
  → useDeferredDeepLink() fires (triggered by user auth state becoming non-null)
    1. getPendingLink() reads localStorage
    2. validateProvider() — confirms provider exists and role = "provider"
       - not found / wrong role → clear link, toast, navigate /home
       - network error → retry once after 3s, then clear silently
    3. trackDeferredRestored()
    4. clearPendingLink()
    5. navigate("/provider/{id}")
    6. toast("✨ Taking you to the profile you were checking out!")
```

---

## Files changed in this implementation

### Source files
| File | Purpose |
|---|---|
| `src/services/deepLinks.ts` | URL builder (`BASE_URL = business.bookmebusiness.com`), parser, `shareProvider()` |
| `src/services/pendingLink.ts` | localStorage pending link store (7-day TTL) |
| `src/services/deepLinkAnalytics.ts` | Fire-and-forget funnel analytics via sendBeacon |
| `src/hooks/useDeepLinkRouter.ts` | Capacitor `appUrlOpen` / `getLaunchUrl` listener |
| `src/hooks/useDeferredDeepLink.ts` | Post-auth pending link restoration |
| `src/pages/ProviderProfileByIdRedirectPage.tsx` | `/provider/:id` web route — instant store redirect, no UI rendered |

### Config files
| File | Change |
|---|---|
| `public/.well-known/apple-app-site-association` | Team ID `L4TKDN4H8W`, bundle `com.bookmebusiness.customerapp1`, path `/provider/*` |
| `public/.well-known/assetlinks.json` | Package `com.bookmebusiness.customerapp1` — **SHA-256 must be filled in** |
| `ios/App/App/App.entitlements` | `applinks:business.bookmebusiness.com` only |
| `src/App.tsx` | `/provider/:id` → native: `ProviderProfilePage`, web: `ProviderProfileByIdRedirectPage` |

---

## Production-readiness checklist

| # | Check | Status |
|---|---|---|
| 1 | Production domain `business.bookmebusiness.com` | ✅ PASS — all files use this domain |
| 2 | AASA file path and content | ✅ PASS — `public/.well-known/apple-app-site-association` correct |
| 3 | Apple Team ID | ✅ PASS — `L4TKDN4H8W` set in AASA |
| 4 | iOS bundle identifier | ✅ PASS — `com.bookmebusiness.customerapp1` |
| 5 | iOS Associated Domains | ✅ PASS — `applinks:business.bookmebusiness.com` in entitlements |
| 6 | Android App Links config | ✅ PASS — `assetlinks.json` has correct package name |
| 7 | Android package name | ✅ PASS — `com.bookmebusiness.customerapp1` |
| 8 | Android SHA-256 fingerprint | ⚠️ REQUIRES EXTERNAL CONFIGURATION — see below |
| 9 | AndroidManifest intent-filter | ⚠️ REQUIRES EXTERNAL CONFIGURATION — see below |
| 10 | `/provider/:id` route | ✅ PASS — native → ProviderProfilePage, web → instant store redirect |
| 11 | Automatic OS detection | ✅ PASS — `detectIOS()` from user-agent, no user choice |
| 12 | App installed → opens app | ✅ PASS — Universal Links / App Links + `useDeepLinkRouter` |
| 13 | Android store fallback | ✅ PASS — auto-detected, instant `window.location.replace` |
| 14 | iOS store fallback | ✅ PASS — auto-detected, instant `window.location.replace` |
| 15 | No platform-selection screen | ✅ PASS — page renders nothing, redirect is instant |
| 16 | No unnecessary landing page | ✅ PASS — `ProviderProfileByIdRedirectPage` returns null |
| 17 | Deferred deep linking (pending link save) | ✅ PASS — `savePendingLink` before store redirect |
| 18 | Post-signup continuation | ✅ PASS — `useDeferredDeepLink` fires on auth state change |
| 19 | Post-login continuation | ✅ PASS — same hook |
| 20 | Provider profile restoration | ✅ PASS — `validateProvider` + `navigate("/provider/:id")` |
| 21 | Pending link cleanup | ✅ PASS — `clearPendingLink()` after restoration or on error |
| 22 | HTTPS for deep-link domain | ⚠️ REQUIRES EXTERNAL CONFIGURATION — deploy to business.bookmebusiness.com |
| 23 | AASA publicly accessible | ⚠️ REQUIRES EXTERNAL CONFIGURATION — must be reachable at the subdomain |
| 24 | assetlinks.json publicly accessible | ⚠️ REQUIRES EXTERNAL CONFIGURATION — same |
| 25 | No `bookme.app` in deep-link system | ✅ PASS — removed from all files |
| 26 | No `TEAMID` placeholder | ✅ PASS — replaced with `L4TKDN4H8W` |
| 27 | No fake SHA-256 placeholder | ⚠️ REQUIRES EXTERNAL CONFIGURATION — see below |

---

## External configuration required

### 1. Android SHA-256 fingerprint

Open `public/.well-known/assetlinks.json` and replace
`REPLACE_WITH_YOUR_SHA256_CERT_FINGERPRINT` with your production signing
certificate fingerprint.

**Get it from Google Play Console (recommended — this is the actual signing cert):**
Play Console → Your App → Setup → App integrity → App signing key certificate → SHA-256 certificate fingerprint

**Or from your upload keystore (only if you use self-signing):**
```bash
keytool -list -v -keystore your-release.keystore -alias your-alias
```

### 2. AndroidManifest.xml intent-filter

The `android/` directory is not included in this project zip. After running
`npx cap add android` or `npx cap sync android`, open:

```
android/app/src/main/AndroidManifest.xml
```

Find `<activity android:name="com.getcapacitor.BridgeActivity" ...>` and add
this intent-filter INSIDE the `<activity>` element:

```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https"
          android:host="business.bookmebusiness.com"
          android:pathPrefix="/provider/" />
</intent-filter>
```

Also confirm:
- `android:launchMode="singleTask"` on the activity
- `android:exported="true"` on the activity

### 3. Deploy SPA to business.bookmebusiness.com

The same Vite build that runs the Customer App must be deployed to
`business.bookmebusiness.com`. The `.well-known` files must be reachable at:

```
https://business.bookmebusiness.com/.well-known/apple-app-site-association
https://business.bookmebusiness.com/.well-known/assetlinks.json
```

Requirements:
- HTTPS, no redirect on these paths
- `Content-Type: application/json`
- Not caught by the SPA rewrite (already excluded in `vercel.json`)

### 4. Xcode — Add Associated Domains capability

- Open `ios/App/App.xcworkspace`
- Target → Signing & Capabilities → `+` → Associated Domains
- Add: `applinks:business.bookmebusiness.com`

The entitlements file already has the entry. This step syncs it in Xcode's
UI so it's included in the provisioning profile.

---

## Analytics funnel

| Event | Where | Auth? |
|---|---|---|
| `share_generated` | `shareProvider()` | Yes |
| `link_opened` | `ProviderProfileByIdRedirectPage` | No |
| `store_redirect` | `ProviderProfileByIdRedirectPage` | No |
| `app_opened` | `useDeepLinkRouter` | No |
| `deferred_restored` | `useDeferredDeepLink` | Yes |
| `deferred_cleared` | `useDeferredDeepLink` | Yes |
