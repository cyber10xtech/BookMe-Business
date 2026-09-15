/**
 * useAttendancePopup — reliable attendance popup detection for the Business app.
 *
 * Detection strategy:
 *  1. Immediate eligibility check on mount.
 *  2. Re-evaluate every 60 seconds via setInterval.
 *  3. Re-evaluate on browser visibilitychange (tab returns to foreground).
 *  4. Re-evaluate on Capacitor appStateChange (native app returns to foreground).
 *  5. After every fetchBookings() call (data-driven re-evaluation).
 *
 * Dismissal:
 *  - "Maybe Later" suppresses a specific booking for 5 minutes.
 *  - On next foreground event, all dismissals are cleared.
 *  - After successful confirmation, the booking is removed on next refetch.
 *
 * Queue:
 *  - Only one popup shown at a time.
 *  - Oldest eligible booking (by service end time) is shown first.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { selectOldestPendingBooking, type AttendanceBooking } from "@/lib/attendance";

/** How often (ms) to re-evaluate eligibility. */
export const POLL_INTERVAL_MS = 60_000;

/** How long (ms) a dismissed booking stays suppressed. */
export const DISMISS_DURATION_MS = 5 * 60_000;

interface DismissedEntry {
  /** When the dismissal expires (epoch-ms). */
  expiresAt: number;
}

interface UseAttendancePopupOptions {
  /** Current bookings array from useBookings. */
  bookings: AttendanceBooking[];
  /** Function to refetch bookings from Supabase. */
  fetchBookings: () => Promise<void> | void;
}

interface UseAttendancePopupResult {
  /** The booking to show in the attendance popup, or null. */
  currentBooking: AttendanceBooking | null;
  /** Dismiss the current popup temporarily. */
  dismissCurrent: () => void;
}

export function useAttendancePopup({
  bookings,
  fetchBookings,
}: UseAttendancePopupOptions): UseAttendancePopupResult {
  const [currentBooking, setCurrentBooking] = useState<AttendanceBooking | null>(null);
  const dismissedRef = useRef<Map<string, DismissedEntry>>(new Map());
  const cleanupNativeRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);

  /** Purge expired dismissals, then find the oldest eligible non-dismissed booking. */
  const evaluate = useCallback(() => {
    const now = Date.now();

    // Purge expired dismissals
    for (const [id, entry] of dismissedRef.current) {
      if (entry.expiresAt <= now) {
        dismissedRef.current.delete(id);
      }
    }

    const candidate = selectOldestPendingBooking(bookings, now);

    if (candidate && candidate.id && dismissedRef.current.has(candidate.id)) {
      // The oldest candidate is dismissed — don't show anything.
      // (We could look for the next one, but the spec says "queue one at a time,
      //  oldest first", so the next one won't be shown until this one is resolved
      //  or the dismissal expires.)
      setCurrentBooking(null);
      return;
    }

    setCurrentBooking(candidate);
  }, [bookings]);

  /** On foreground: clear all dismissals, refetch, then re-evaluate. */
  const handleForeground = useCallback(async () => {
    dismissedRef.current.clear();
    await fetchBookings();
    // evaluate() will fire via the bookings dependency change
  }, [fetchBookings]);

  // Re-evaluate whenever bookings changes
  useEffect(() => {
    evaluate();
  }, [evaluate]);

  // 60-second polling interval
  useEffect(() => {
    const id = setInterval(() => {
      evaluate();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [evaluate]);

  // Browser visibility change
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible") {
        handleForeground();
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [handleForeground]);

  // Capacitor App.appStateChange (native foreground)
  useEffect(() => {
    let removed = false;

    (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("appStateChange", ({ isActive }) => {
          if (isActive && !removed) {
            handleForeground();
          }
        });
        if (!removed) {
          cleanupNativeRef.current = () => {
            handle.remove();
          };
        } else {
          handle.remove();
        }
      } catch {
        // Not running in Capacitor — this is fine on web
      }
    })();

    return () => {
      removed = true;
      cleanupNativeRef.current?.();
      cleanupNativeRef.current = null;
    };
  }, [handleForeground]);

  // Cleanup mounted ref
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /** Dismiss the current booking for DISMISS_DURATION_MS. */
  const dismissCurrent = useCallback(() => {
    if (currentBooking?.id) {
      dismissedRef.current.set(currentBooking.id, {
        expiresAt: Date.now() + DISMISS_DURATION_MS,
      });
      setCurrentBooking(null);
    }
  }, [currentBooking]);

  return { currentBooking, dismissCurrent };
}
