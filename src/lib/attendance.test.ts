import { describe, it, expect } from 'vitest';
import { isEligibleForAttendance, selectOldestPendingBooking } from './attendance';

describe('Business Attendance Eligibility Logic', () => {
  it('Completed and unresolved booking is eligible', () => {
    const booking = {
      id: '1',
      status: 'completed',
      provider_attendance_outcome: null,
      booking_date: '2020-01-01',
      booking_time: '10:00',
      services: { duration: '60 mins' }
    };
    expect(isEligibleForAttendance(booking)).toBe(true);
  });

  it('Future/end-time-not-reached booking is ineligible', () => {
    // 10 years in the future
    const futureDate = new Date(new Date().getTime() + 10 * 365 * 24 * 60 * 60 * 1000);
    const booking = {
      id: '2',
      status: 'completed',
      provider_attendance_outcome: null,
      booking_date: futureDate.toISOString().split('T')[0],
      booking_time: '10:00',
      services: { duration: '60 mins' }
    };
    expect(isEligibleForAttendance(booking)).toBe(false);
  });

  it('attended is resolved', () => {
    const booking = {
      id: '3',
      status: 'completed',
      provider_attendance_outcome: 'attended',
      booking_date: '2020-01-01',
      booking_time: '10:00'
    };
    expect(isEligibleForAttendance(booking)).toBe(false);
  });

  it('no_show is resolved', () => {
    const booking = {
      id: '4',
      status: 'completed',
      provider_attendance_outcome: 'no_show',
      booking_date: '2020-01-01',
      booking_time: '10:00'
    };
    expect(isEligibleForAttendance(booking)).toBe(false);
  });

  it('Cancelled/rejected booking is ineligible', () => {
    const booking = {
      id: '5',
      status: 'cancelled',
      provider_attendance_outcome: null,
      booking_date: '2020-01-01',
      booking_time: '10:00'
    };
    expect(isEligibleForAttendance(booking)).toBe(false);
  });

  it('Missing date/time information fails safely', () => {
    const booking = {
      id: '6',
      status: 'completed',
      provider_attendance_outcome: null
    };
    expect(isEligibleForAttendance(booking)).toBe(false);
  });
});

describe('Business Attendance Selection Logic', () => {
  it('Oldest unresolved booking is selected', () => {
    const b1 = { id: 'b1', status: 'completed', provider_attendance_outcome: null, booking_date: '2020-01-02', booking_time: '10:00', services: { duration: '60' } };
    const b2 = { id: 'b2', status: 'completed', provider_attendance_outcome: null, booking_date: '2020-01-01', booking_time: '10:00', services: { duration: '60' } };
    const selected = selectOldestPendingBooking([b1, b2]);
    expect(selected?.id).toBe('b2');
  });

  it('Multiple bookings are deterministically ordered', () => {
    const b1 = { id: 'b1', status: 'completed', provider_attendance_outcome: null, booking_date: '2020-01-01', booking_time: '10:00', services: { duration: '60' } };
    const b2 = { id: 'b2', status: 'completed', provider_attendance_outcome: null, booking_date: '2020-01-01', booking_time: '10:00', services: { duration: '60' } };
    const selected1 = selectOldestPendingBooking([b1, b2]);
    const selected2 = selectOldestPendingBooking([b2, b1]);
    expect(selected1?.id).toBe('b1');
    expect(selected2?.id).toBe('b1');
  });

  it('Provider submission error remains recoverable (returns null if empty)', () => {
    const selected = selectOldestPendingBooking([]);
    expect(selected).toBe(null);
  });
});
