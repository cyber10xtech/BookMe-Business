# BookMe Business App Forensic Audit

Date: 2026-08-31

This document is a read-only forensic audit of the Business app. No code was changed while producing it.

## Scope

Reviewed areas:
- App bootstrap and routing
- Authentication and notification wiring
- Deep-link and update-policy flows
- Supabase edge functions and migrations
- Native Android/iOS integration files where they affect runtime behavior

## Executive Summary

The Business app is structurally solid, but there are a few high-impact correctness issues and a few architectural risks that should be addressed before treating it as production-hardened.

The most serious issue is notification tap routing. The app uses `window.location.hash` inside a `BrowserRouter` app, which does not reliably drive React Router navigation. That makes push actions brittle and can leave users on the wrong screen.

The second major issue is that update enforcement is explicitly fail-open. If the update config query fails, or the backend config is malformed, the app allows continued access. That may be acceptable for resilience, but it is a policy decision that should be deliberate because it disables mandatory update enforcement whenever the backend has trouble.

The rest of the app is generally coherent, with a few maintenance concerns around duplicated notification logic, duplicate Android asset trees, and the fact that this repo appears to include generated bundles and build outputs alongside source.

## Severity Ranked Findings

### 1. Push notification tap navigation is unreliable

Location:
- [`src/contexts/AuthContext.tsx`](/C:/Users/pc/Desktop/Kassy/BookMe/MDS/BookMe_Business%20Deeplinks/BookMe_Business_Fixed/src/contexts/AuthContext.tsx#L116)

What I found:
- The app listens for `pushNotificationActionPerformed`.
- On tap, it mutates `window.location.hash` to `/bookings` or `/notifications`.
- The app is using `BrowserRouter`, not `HashRouter`.

Why this is a problem:
- In a browser-router app, changing `location.hash` does not behave like route navigation.
- Depending on platform and router state, the user may stay on the same page, get a weird URL fragment, or trigger inconsistent behavior between web and native shells.

Impact:
- Tapping a push notification can appear to do nothing.
- Deep navigation from notifications is not dependable.
- This is user-visible and hard to diagnose from logs alone.

Recommended fix:
- Route via React Router navigation instead of mutating the hash.
- Centralize notification tap dispatch so the logic is shared with any future deep-link handling.

### 2. Update checks fail open on backend/config errors

Location:
- [`src/services/updateService.ts`](/C:/Users/pc/Desktop/Kassy/BookMe/MDS/BookMe_Business%20Deeplinks/BookMe_Business_Fixed/src/services/updateService.ts#L73)
- [`supabase/migrations/20260829000000_app_update_config.sql`](/C:/Users/pc/Desktop/Kassy/BookMe/MDS/BookMe_Business%20Deeplinks/BookMe_Business_Fixed/supabase/migrations/20260829000000_app_update_config.sql)

What I found:
- If the update query fails, the service returns `check_failed`.
- If backend version strings are malformed, it also returns `check_failed`.
- The UI then continues instead of blocking the user.

Why this is a problem:
- If the app relies on update enforcement for support or security reasons, the current design disables it whenever Supabase is unavailable or the config row is wrong.
- A typo in the config table can silently turn off enforcement.

Impact:
- Mandatory updates are not truly mandatory in failure scenarios.
- This may be fine if the intent is resilience-first, but it should be acknowledged as an explicit policy choice.

Recommended fix:
- Decide whether “fail open” is acceptable.
- If not, split update policy into:
  - hard-block required updates
  - soft-fail optional checks
- At minimum, surface a stronger user-facing state for config failures.

### 3. Notification token ownership is split across multiple code paths

Location:
- [`src/contexts/AuthContext.tsx`](/C:/Users/pc/Desktop/Kassy/BookMe/MDS/BookMe_Business%20Deeplinks/BookMe_Business_Fixed/src/contexts/AuthContext.tsx)
- [`src/services/native/pushNotifications.ts`](/C:/Users/pc/Desktop/Kassy/BookMe/MDS/BookMe_Business%20Deeplinks/BookMe_Business_Fixed/src/services/native/pushNotifications.ts)
- [`src/services/notifications.ts`](/C:/Users/pc/Desktop/Kassy/BookMe/MDS/BookMe_Business%20Deeplinks/BookMe_Business_Fixed/src/services/notifications.ts)

What I found:
- There are multiple token registration pathways.
- One path uses Capacitor push notifications.
- Another path uses Firebase Messaging.
- A guard flag exists to avoid double registration, but the logic is spread out.

Why this matters:
- Push delivery bugs often come from split ownership, especially on iOS.
- If one code path changes and another is left stale, token writes can drift or duplicate.

Impact:
- Hard-to-reproduce push bugs.
- Greater chance of token churn or stale records.

Recommended fix:
- Consolidate registration into one canonical flow.
- Keep all token persistence in one service.
- Leave wrappers only for platform-specific entry points.

### 4. The repo contains generated app artifacts alongside source

Location:
- `android/android/app/src/main/assets/public/...`
- `android/app/release/...`
- `src.zip`
- `bun.lockb`

What I found:
- The repository includes build outputs and generated bundles.
- That makes audits harder and can hide stale assets.

Why this matters:
- Reviewers can accidentally inspect built JS instead of source TSX.
- Old bundles can survive long after source changes and create confusion during debugging.

Impact:
- Higher maintenance cost.
- Increased risk of shipping stale or misleading artifacts.

Recommended fix:
- Keep source-of-truth code and generated output clearly separated.
- Exclude build artifacts from review scope unless intentionally needed.

## Other Notable Observations

- [`src/App.tsx`](/C:/Users/pc/Desktop/Kassy/BookMe/MDS/BookMe_Business%20Deeplinks/BookMe_Business_Fixed/src/App.tsx#L41) correctly handles the cold-start redirect to `/dashboard` or `/signin`.
- [`src/services/native/providerLink.ts`](/C:/Users/pc/Desktop/Kassy/BookMe/MDS/BookMe_Business%20Deeplinks/BookMe_Business_Fixed/src/services/native/providerLink.ts) is simple and predictable, which is good.
- The app’s update policy flow is stable under normal conditions.
- The app uses lazy loading for routes, which is a good fit for a Capacitor shell.

## Risk Notes

- I did not execute device-level runtime tests in this audit.
- I did not modify code.
- Some push issues may only appear on physical iOS/Android devices, not in browser testing.

## Prioritized Fix List

1. Replace `window.location.hash` navigation in notification tap handlers with React Router navigation.
2. Decide whether update checks should fail open or fail closed, then document that policy.
3. Consolidate push token registration into one authoritative path.
4. Clean up generated artifacts from the repository where possible.

## Suggested Validation After Fixes

- Tap a push notification on Android and iOS and verify route changes.
- Force the update-config query to fail and confirm expected policy behavior.
- Reinstall the app and ensure token registration still resolves once per install.
- Check that notification tap navigation works from both foreground and background states.

