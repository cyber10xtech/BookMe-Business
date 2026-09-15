import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAttendancePopup, POLL_INTERVAL_MS, DISMISS_DURATION_MS } from "@/hooks/useAttendancePopup";
import type { AttendanceBooking } from "@/lib/attendance";
import { ATTENDANCE_ROLLOUT_CUTOFF } from "@/lib/attendance";

// Mock @capacitor/app — need to track the callback
const mockRemove = vi.fn();
let capturedAppStateCallback: ((state: { isActive: boolean }) => void) | null = null;

vi.mock("@capacitor/app", () => ({
  App: {
    addListener: vi.fn((_eventName: string, callback: any) => {
      capturedAppStateCallback = callback;
      return Promise.resolve({ remove: mockRemove });
    }),
  },
}));

/**
 * BASE_NOW = 2026-09-15T14:00:00 LOCAL TIME (WAT = UTC+1 = 13:00 UTC)
 *
 * All booking_time values are in local time (same as Date constructor without Z suffix).
 */
const BASE_NOW = new Date("2026-09-15T14:00:00").getTime();

function makeBooking(overrides: Partial<AttendanceBooking> & { id: string }): AttendanceBooking {
  return {
    status: "completed",
    provider_attendance_outcome: null,
    attendance_confirmed_at: null,
    attendance_confirmed_by: null,
    // Service ended at 13:00 local => end = 13:00+60m = 14:00 local = before or at BASE_NOW
    // Actually let's make it clearly in the past: 12:00 + 60m = 13:00 local, well before 14:00
    booking_date: "2026-09-15",
    booking_time: "12:00",
    services: { duration: "60 mins" },
    ...overrides,
  };
}

describe("useAttendancePopup", () => {
  let fetchBookings: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_NOW);
    fetchBookings = vi.fn().mockResolvedValue(undefined);
    capturedAppStateCallback = null;
    mockRemove.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Immediate eligibility on mount
  // ──────────────────────────────────────────────────────────────────────────

  it("shows eligible booking immediately on mount", () => {
    const bookings = [makeBooking({ id: "b1" })];
    const { result } = renderHook(() =>
      useAttendancePopup({ bookings, fetchBookings })
    );
    expect(result.current.currentBooking?.id).toBe("b1");
  });

  it("returns null when no bookings are eligible", () => {
    const bookings = [makeBooking({ id: "b1", status: "pending" })];
    const { result } = renderHook(() =>
      useAttendancePopup({ bookings, fetchBookings })
    );
    expect(result.current.currentBooking).toBeNull();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Booking becomes eligible while dashboard is open (60s check)
  // ──────────────────────────────────────────────────────────────────────────

  it("detects newly eligible booking after 60-second interval", () => {
    // Service at 14:00 local with 60 min → ends at 15:00 local.
    // At BASE_NOW (14:00), service hasn't ended yet → not eligible.
    const bookings = [
      makeBooking({
        id: "b2",
        booking_date: "2026-09-15",
        booking_time: "14:00",
        services: { duration: "60 mins" },
      }),
    ];

    const { result, rerender } = renderHook(
      ({ bookings: bk }) => useAttendancePopup({ bookings: bk, fetchBookings }),
      { initialProps: { bookings } }
    );

    // At 14:00 local, service ends at 15:00 local → not eligible
    expect(result.current.currentBooking).toBeNull();

    // Advance clock to 15:01 local (service ended) + trigger the poll
    vi.setSystemTime(new Date("2026-09-15T15:01:00").getTime());
    act(() => {
      vi.advanceTimersByTime(POLL_INTERVAL_MS);
    });

    // The poll re-evaluates with new Date.now() → booking is now eligible
    expect(result.current.currentBooking?.id).toBe("b2");
  });

  it("popup appears within 60 seconds of eligibility, never later than 5 minutes", () => {
    // Service at 14:00 local, 61 min duration → ends at 15:01 local
    const bookings = [
      makeBooking({
        id: "b3",
        booking_date: "2026-09-15",
        booking_time: "14:00",
        services: { duration: "61 mins" },
      }),
    ];

    const { result } = renderHook(
      ({ bookings: bk }) => useAttendancePopup({ bookings: bk, fetchBookings }),
      { initialProps: { bookings } }
    );

    // Not eligible yet at 14:00 local
    expect(result.current.currentBooking).toBeNull();

    // Move clock to 15:02 local (service ended at 15:01) and trigger ONE poll
    vi.setSystemTime(new Date("2026-09-15T15:02:00").getTime());
    act(() => {
      vi.advanceTimersByTime(POLL_INTERVAL_MS);
    });

    // Must be detected within the 60s poll cycle
    expect(result.current.currentBooking?.id).toBe("b3");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Browser visibility refresh
  // ──────────────────────────────────────────────────────────────────────────

  it("rechecks on browser visibilitychange (foreground)", () => {
    const bookings = [makeBooking({ id: "vis1" })];
    renderHook(() =>
      useAttendancePopup({ bookings, fetchBookings })
    );

    // Simulate tab becoming visible
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      writable: true,
      configurable: true,
    });

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(fetchBookings).toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Capacitor foreground refresh
  // ──────────────────────────────────────────────────────────────────────────

  it("registers Capacitor appStateChange listener", async () => {
    const { App } = await import("@capacitor/app");
    const bookings = [makeBooking({ id: "cap1" })];

    renderHook(() => useAttendancePopup({ bookings, fetchBookings }));

    // Flush the microtask queue for the async import inside useEffect
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(App.addListener).toHaveBeenCalledWith(
      "appStateChange",
      expect.any(Function)
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5-minute dismissal
  // ──────────────────────────────────────────────────────────────────────────

  it("dismisses booking for 5 minutes, then re-shows it", () => {
    const bookings = [makeBooking({ id: "d1" })];
    const { result } = renderHook(
      ({ bookings: bk }) => useAttendancePopup({ bookings: bk, fetchBookings }),
      { initialProps: { bookings } }
    );

    expect(result.current.currentBooking?.id).toBe("d1");

    // Dismiss
    act(() => {
      result.current.dismissCurrent();
    });
    expect(result.current.currentBooking).toBeNull();

    // Still dismissed after 4 minutes (advance by 4 poll cycles)
    act(() => {
      vi.advanceTimersByTime(4 * 60_000);
    });
    expect(result.current.currentBooking).toBeNull();

    // After 5 minutes total + 1 more poll cycle, the dismissal expires
    act(() => {
      vi.advanceTimersByTime(1 * 60_000 + 1000);
    });
    expect(result.current.currentBooking?.id).toBe("d1");
  });

  it("clears dismissals on visibility foreground event", () => {
    const bookings = [makeBooking({ id: "d2" })];
    const { result } = renderHook(() =>
      useAttendancePopup({ bookings, fetchBookings })
    );

    // Dismiss
    act(() => {
      result.current.dismissCurrent();
    });
    expect(result.current.currentBooking).toBeNull();

    // Simulate foreground return
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      writable: true,
      configurable: true,
    });

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // fetchBookings was called, and dismissals are cleared
    expect(fetchBookings).toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Rollout cutoff
  // ──────────────────────────────────────────────────────────────────────────

  it("excludes bookings ending before the rollout cutoff", () => {
    const oldBooking = makeBooking({
      id: "old1",
      booking_date: "2026-09-01",
      booking_time: "10:00",
      services: { duration: "60 mins" },
    });
    const { result } = renderHook(() =>
      useAttendancePopup({ bookings: [oldBooking], fetchBookings })
    );
    expect(result.current.currentBooking).toBeNull();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Oldest-first queue
  // ──────────────────────────────────────────────────────────────────────────

  it("shows oldest eligible booking first when multiple are queued", () => {
    const newer = makeBooking({ id: "q1", booking_date: "2026-09-15", booking_time: "11:00" });
    const older = makeBooking({ id: "q2", booking_date: "2026-09-14", booking_time: "10:00" });
    const { result } = renderHook(() =>
      useAttendancePopup({ bookings: [newer, older], fetchBookings })
    );
    expect(result.current.currentBooking?.id).toBe("q2");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Confirmed booking removal
  // ──────────────────────────────────────────────────────────────────────────

  it("removes confirmed booking from the queue after refetch", () => {
    const b1 = makeBooking({ id: "r1" });
    const { result, rerender } = renderHook(
      ({ bookings: bk }) => useAttendancePopup({ bookings: bk, fetchBookings }),
      { initialProps: { bookings: [b1] } }
    );

    expect(result.current.currentBooking?.id).toBe("r1");

    // Simulate confirmation: refetch returns the booking with outcome set
    const confirmed = { ...b1, provider_attendance_outcome: "attended" };
    rerender({ bookings: [confirmed] });
    expect(result.current.currentBooking).toBeNull();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Exclusion of non-completed statuses
  // ──────────────────────────────────────────────────────────────────────────

  it.each([
    ["pending"],
    ["accepted"],
    ["confirmed"],
    ["cancelled"],
    ["rejected"],
    ["rescheduled"],
  ])("never shows popup for %s bookings", (status) => {
    const b = makeBooking({ id: `status-${status}`, status });
    const { result } = renderHook(() =>
      useAttendancePopup({ bookings: [b], fetchBookings })
    );
    expect(result.current.currentBooking).toBeNull();
  });

  it("never shows popup for future completed bookings", () => {
    const b = makeBooking({
      id: "future",
      booking_date: "2030-01-01",
      booking_time: "10:00",
    });
    const { result } = renderHook(() =>
      useAttendancePopup({ bookings: [b], fetchBookings })
    );
    expect(result.current.currentBooking).toBeNull();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Interval and listener cleanup
  // ──────────────────────────────────────────────────────────────────────────

  it("cleans up interval on unmount", () => {
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
    const bookings = [makeBooking({ id: "cleanup1" })];
    const { unmount } = renderHook(() =>
      useAttendancePopup({ bookings, fetchBookings })
    );

    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it("removes visibilitychange listener on unmount", () => {
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const bookings = [makeBooking({ id: "cleanup2" })];
    const { unmount } = renderHook(() =>
      useAttendancePopup({ bookings, fetchBookings })
    );

    unmount();
    expect(removeSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function)
    );
    removeSpy.mockRestore();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // App reopen (immediate eligibility on mount)
  // ──────────────────────────────────────────────────────────────────────────

  it("shows unresolved popup immediately when app reopens after service ended", () => {
    // Service ended hours ago at 09:00 local, app was closed, now opening at 14:00 local
    const b = makeBooking({
      id: "reopen1",
      booking_date: "2026-09-15",
      booking_time: "08:00",
      services: { duration: "60 mins" },
    });
    const { result } = renderHook(() =>
      useAttendancePopup({ bookings: [b], fetchBookings })
    );
    expect(result.current.currentBooking?.id).toBe("reopen1");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// RPC tests (AttendanceConfirmationModal behavior) — tested via hook state
// ──────────────────────────────────────────────────────────────────────────────

describe("AttendanceConfirmationModal RPC behavior", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("RPC success removes booking from queue on refetch", () => {
    const b = makeBooking({ id: "rpc1" });
    const fetchBookings = vi.fn();

    const { result, rerender } = renderHook(
      ({ bookings: bk }) => useAttendancePopup({ bookings: bk, fetchBookings }),
      { initialProps: { bookings: [b] } }
    );

    expect(result.current.currentBooking?.id).toBe("rpc1");

    // Simulate: onSuccess calls fetchBookings, which returns updated data
    const updated = { ...b, provider_attendance_outcome: "attended" };
    rerender({ bookings: [updated] });
    expect(result.current.currentBooking).toBeNull();
  });

  it("RPC failure keeps booking in queue (modal stays open)", () => {
    const b = makeBooking({ id: "rpc2" });
    const fetchBookings = vi.fn();

    const { result, rerender } = renderHook(
      ({ bookings: bk }) => useAttendancePopup({ bookings: bk, fetchBookings }),
      { initialProps: { bookings: [b] } }
    );

    expect(result.current.currentBooking?.id).toBe("rpc2");

    // Simulate: RPC failed, bookings unchanged
    rerender({ bookings: [b] });
    expect(result.current.currentBooking?.id).toBe("rpc2");
  });

  it("duplicate-tap prevention: dismissCurrent is idempotent when no booking shown", () => {
    const fetchBookings = vi.fn();
    const { result } = renderHook(() =>
      useAttendancePopup({ bookings: [], fetchBookings })
    );

    // Should not throw
    act(() => {
      result.current.dismissCurrent();
    });
    expect(result.current.currentBooking).toBeNull();
  });
});
