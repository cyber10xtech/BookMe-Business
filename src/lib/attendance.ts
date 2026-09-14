export interface AttendanceBooking {
  id?: string;
  status?: string;
  provider_attendance_outcome?: string | null;
  booking_date?: string;
  booking_time?: string;
  services?: { duration?: string };
}

export function isEligibleForAttendance(booking: AttendanceBooking): boolean {
  if (!booking) return false;
  if (booking.status !== "completed") return false;
  if (booking.provider_attendance_outcome) return false;

  if (!booking.booking_date || !booking.booking_time) return false;

  try {
    const serviceDurationStr = booking.services?.duration || "60 mins";
    const durationMatch = serviceDurationStr.match(/(\d+)/);
    const durationMins = durationMatch ? parseInt(durationMatch[1], 10) : 60;

    const bookingDateTime = new Date(`${booking.booking_date}T${booking.booking_time}`);
    if (isNaN(bookingDateTime.getTime())) return false;

    const endDateTime = new Date(bookingDateTime.getTime() + durationMins * 60000);
    const now = new Date();
    
    if (endDateTime > now) return false;

    return true;
  } catch (e) {
    return false;
  }
}

export function selectOldestPendingBooking(bookings: AttendanceBooking[]): AttendanceBooking | null {
  if (!bookings || bookings.length === 0) return null;

  const eligibleBookings = bookings.filter(isEligibleForAttendance);
  if (eligibleBookings.length === 0) return null;

  return eligibleBookings.sort((a, b) => {
    const dateA = new Date(`${a.booking_date}T${a.booking_time}`).getTime();
    const dateB = new Date(`${b.booking_date}T${b.booking_time}`).getTime();
    if (isNaN(dateA)) return 1;
    if (isNaN(dateB)) return -1;
    
    if (dateA !== dateB) return dateA - dateB;
    return (a.id || "").localeCompare(b.id || "");
  })[0];
}
