/**
 * Attendance eligibility and queue selection for the Business app.
 *
 * Rules:
 *  - status must be "completed"
 *  - calculated service end time must have passed
 *  - provider_attendance_outcome must be null
 *  - attendance_confirmed_at must be null
 *  - attendance_confirmed_by must be null
 *  - booking must end on or after the rollout cutoff (2026-09-12T18:00:00Z)
 */

/** Cutoff: attendance tracking was deployed at this instant. */
export const ATTENDANCE_ROLLOUT_CUTOFF = new Date("2026-09-12T18:00:00Z").getTime();

export interface AttendanceBooking {
  id?: string;
  status?: string;
  provider_attendance_outcome?: string | null;
  attendance_confirmed_at?: string | null;
  attendance_confirmed_by?: string | null;
  booking_date?: string;
  booking_time?: string;
  services?: { duration?: string };
}

/**
 * Parses the service duration string (e.g. "60 mins", "90", "2 hours")
 * and returns minutes.  Defaults to 60 if unparseable.
 */
function parseDurationMins(raw?: string | null): number {
  if (!raw) return 60;
  const match = raw.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 60;
}

/**
 * Computes the service end time in epoch-ms for a booking.
 * Returns NaN when the date/time cannot be parsed.
 */
export function getServiceEndTime(booking: AttendanceBooking): number {
  if (!booking.booking_date || !booking.booking_time) return NaN;

  const dt = new Date(`${booking.booking_date}T${booking.booking_time}`);
  if (isNaN(dt.getTime())) return NaN;

  const durationMins = parseDurationMins(booking.services?.duration);
  return dt.getTime() + durationMins * 60_000;
}

/**
 * Returns true when the booking is eligible for the attendance popup.
 *
 * @param booking  The booking to test.
 * @param now      Optional "now" timestamp for testing with fake timers.
 */
export function isEligibleForAttendance(
  booking: AttendanceBooking,
  now: number = Date.now(),
): boolean {
  if (!booking) return false;

  // Must be completed
  if (booking.status !== "completed") return false;

  // Must not already have an outcome
  if (booking.provider_attendance_outcome) return false;

  // Must not already be confirmed (defensive — the RPC sets all three)
  if (booking.attendance_confirmed_at) return false;
  if (booking.attendance_confirmed_by) return false;

  // Must have parseable date+time
  const endTime = getServiceEndTime(booking);
  if (isNaN(endTime)) return false;

  // Service end time must have passed
  if (endTime > now) return false;

  // Must be on or after the rollout cutoff
  if (endTime < ATTENDANCE_ROLLOUT_CUTOFF) return false;

  return true;
}

/**
 * Returns the oldest eligible booking (by service end time), or null.
 *
 * @param bookings  All bookings for the provider.
 * @param now       Optional "now" timestamp for testing with fake timers.
 */
export function selectOldestPendingBooking(
  bookings: AttendanceBooking[],
  now?: number,
): AttendanceBooking | null {
  if (!bookings || bookings.length === 0) return null;

  const eligible = bookings.filter((b) => isEligibleForAttendance(b, now));
  if (eligible.length === 0) return null;

  return eligible.sort((a, b) => {
    const endA = getServiceEndTime(a);
    const endB = getServiceEndTime(b);
    if (isNaN(endA)) return 1;
    if (isNaN(endB)) return -1;
    if (endA !== endB) return endA - endB;
    return (a.id || "").localeCompare(b.id || "");
  })[0];
}
