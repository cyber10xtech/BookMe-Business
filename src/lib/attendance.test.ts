import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isEligibleForAttendance,
  selectOldestPendingBooking,
  getServiceEndTime,
  ATTENDANCE_ROLLOUT_CUTOFF,
  type AttendanceBooking,
} from './attendance';

// A fixed "now" well after rollout cutoff for deterministic tests
const NOW = new Date("2026-09-15T12:00:00Z").getTime();

function makeBooking(overrides: Partial<AttendanceBooking> & { id: string }): AttendanceBooking {
  return {
    status: 'completed',
    provider_attendance_outcome: null,
    attendance_confirmed_at: null,
    attendance_confirmed_by: null,
    booking_date: '2026-09-14',
    booking_time: '10:00',
    services: { duration: '60 mins' },
    ...overrides,
  };
}

describe('isEligibleForAttendance', () => {
  it('Completed and unresolved booking whose service has ended is eligible', () => {
    const b = makeBooking({ id: '1' });
    expect(isEligibleForAttendance(b, NOW)).toBe(true);
  });

  it('Future booking (service end time not reached) is ineligible', () => {
    const b = makeBooking({ id: '2', booking_date: '2030-01-01', booking_time: '10:00' });
    expect(isEligibleForAttendance(b, NOW)).toBe(false);
  });

  it('Booking with provider_attendance_outcome = "attended" is ineligible', () => {
    const b = makeBooking({ id: '3', provider_attendance_outcome: 'attended' });
    expect(isEligibleForAttendance(b, NOW)).toBe(false);
  });

  it('Booking with provider_attendance_outcome = "no_show" is ineligible', () => {
    const b = makeBooking({ id: '4', provider_attendance_outcome: 'no_show' });
    expect(isEligibleForAttendance(b, NOW)).toBe(false);
  });

  it('Booking with attendance_confirmed_at set is ineligible', () => {
    const b = makeBooking({ id: '5', attendance_confirmed_at: '2026-09-14T12:00:00Z' });
    expect(isEligibleForAttendance(b, NOW)).toBe(false);
  });

  it('Booking with attendance_confirmed_by set is ineligible', () => {
    const b = makeBooking({ id: '6', attendance_confirmed_by: 'user-abc' });
    expect(isEligibleForAttendance(b, NOW)).toBe(false);
  });

  it('Cancelled booking is ineligible', () => {
    const b = makeBooking({ id: '7', status: 'cancelled' });
    expect(isEligibleForAttendance(b, NOW)).toBe(false);
  });

  it('Pending booking is ineligible', () => {
    const b = makeBooking({ id: '8', status: 'pending' });
    expect(isEligibleForAttendance(b, NOW)).toBe(false);
  });

  it('Declined/rejected booking is ineligible', () => {
    const b = makeBooking({ id: '9', status: 'rejected' });
    expect(isEligibleForAttendance(b, NOW)).toBe(false);
  });

  it('Rescheduled booking is ineligible', () => {
    const b = makeBooking({ id: '10', status: 'rescheduled' });
    expect(isEligibleForAttendance(b, NOW)).toBe(false);
  });

  it('Missing date/time fails safely', () => {
    const b = makeBooking({ id: '11', booking_date: undefined, booking_time: undefined });
    expect(isEligibleForAttendance(b, NOW)).toBe(false);
  });

  it('Booking ending before rollout cutoff is ineligible', () => {
    const b = makeBooking({
      id: '12',
      booking_date: '2026-09-01',
      booking_time: '10:00',
      services: { duration: '60 mins' },
    });
    expect(isEligibleForAttendance(b, NOW)).toBe(false);
  });

  it('Booking ending at or after rollout cutoff is eligible', () => {
    // Rollout cutoff = 2026-09-12T18:00:00Z
    // Use a booking whose end time is clearly after the cutoff
    const b = makeBooking({
      id: '13',
      booking_date: '2026-09-13',
      booking_time: '10:00',
      services: { duration: '60 mins' },
    });
    expect(isEligibleForAttendance(b, NOW)).toBe(true);
  });
});

describe('getServiceEndTime', () => {
  it('Computes end time correctly with 60 min duration', () => {
    const b = makeBooking({ id: 'e1', booking_date: '2026-09-14', booking_time: '10:00', services: { duration: '60 mins' } });
    const endMs = getServiceEndTime(b);
    // '2026-09-14T10:00' is parsed as local time. End = start + 60 min.
    const expectedEnd = new Date('2026-09-14T10:00').getTime() + 60 * 60_000;
    expect(endMs).toBe(expectedEnd);
  });

  it('Defaults to 60 mins if duration is missing', () => {
    const b = makeBooking({ id: 'e2', booking_date: '2026-09-14', booking_time: '10:00', services: undefined });
    const endMs = getServiceEndTime(b);
    const expectedEnd = new Date('2026-09-14T10:00').getTime() + 60 * 60_000;
    expect(endMs).toBe(expectedEnd);
  });

  it('Returns NaN for missing date', () => {
    const b = makeBooking({ id: 'e3', booking_date: undefined });
    expect(isNaN(getServiceEndTime(b))).toBe(true);
  });
});

describe('selectOldestPendingBooking', () => {
  it('Selects the oldest unresolved booking', () => {
    const b1 = makeBooking({ id: 'b1', booking_date: '2026-09-14', booking_time: '14:00' });
    const b2 = makeBooking({ id: 'b2', booking_date: '2026-09-13', booking_time: '10:00' });
    const result = selectOldestPendingBooking([b1, b2], NOW);
    expect(result?.id).toBe('b2');
  });

  it('Multiple bookings with same end time are deterministically ordered by id', () => {
    const b1 = makeBooking({ id: 'b1', booking_date: '2026-09-14', booking_time: '10:00' });
    const b2 = makeBooking({ id: 'b2', booking_date: '2026-09-14', booking_time: '10:00' });
    expect(selectOldestPendingBooking([b1, b2], NOW)?.id).toBe('b1');
    expect(selectOldestPendingBooking([b2, b1], NOW)?.id).toBe('b1');
  });

  it('Returns null for empty array', () => {
    expect(selectOldestPendingBooking([], NOW)).toBe(null);
  });

  it('Returns null when no bookings are eligible', () => {
    const b1 = makeBooking({ id: 'x1', status: 'pending' });
    const b2 = makeBooking({ id: 'x2', provider_attendance_outcome: 'attended' });
    expect(selectOldestPendingBooking([b1, b2], NOW)).toBe(null);
  });

  it('Skips confirmed bookings in the queue', () => {
    const confirmed = makeBooking({ id: 'c1', provider_attendance_outcome: 'attended' });
    const unresolved = makeBooking({ id: 'c2' });
    const result = selectOldestPendingBooking([confirmed, unresolved], NOW);
    expect(result?.id).toBe('c2');
  });
});
