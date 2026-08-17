-- Auto-completes bookings once their booking date/time has passed,
-- unless they were already cancelled/rejected/completed/no_show.
--
-- Runs as a scheduled Postgres job (pg_cron) rather than client-side,
-- since this backend is shared by both the Customer and Business apps
-- (see 20260729000000_fcm_tokens_app_type.sql) and status must update
-- even if neither app is currently open.
--
-- NAMING: uses a "bookme_" prefix (rather than the more generic
-- auto_complete_past_bookings) because a function with that plainer
-- name already exists in this database with a different
-- signature/return type, and we don't want to touch or drop it.
--
-- TIMEZONE NOTE: booking_date/booking_time are stored as naive
-- date/time (no offset) representing local business time. This
-- assumes Africa/Lagos (WAT, UTC+1, no DST) since bookings are
-- NGN-priced Nigerian businesses. If providers ever operate across
-- multiple timezones, replace the hardcoded zone below with a
-- per-profile timezone column.

CREATE OR REPLACE FUNCTION public.bookme_auto_complete_past_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH updated AS (
    UPDATE public.bookings
    SET status = 'completed',
        completed_at = now(),
        updated_at = now()
    WHERE status NOT IN ('completed', 'cancelled', 'rejected', 'no_show')
      AND (booking_date + booking_time) AT TIME ZONE 'Africa/Lagos' < now()
    RETURNING id, customer_id, provider_id, service_name
  ),
  notif AS (
    INSERT INTO public.notifications (
      user_id, title, body, type, related_booking_id, related_provider_id, data, is_read
    )
    SELECT
      customer_id,
      'Service Completed ⭐',
      COALESCE(service_name, 'Your service') || ' is complete. Please leave a review!',
      'booking_completed',
      id,
      provider_id,
      jsonb_build_object('booking_id', id, 'status', 'completed', 'type', 'booking_completed', 'auto', true),
      false
    FROM updated
    RETURNING 1
  ),
  audit AS (
    INSERT INTO public.booking_trigger_audit (action, trigger_name, function_name)
    SELECT 'auto_completed', 'bookme_auto_complete_past_bookings_cron', 'public.bookme_auto_complete_past_bookings'
    FROM updated
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM updated;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.bookme_auto_complete_past_bookings() IS
  'Marks bookings as completed once booking_date + booking_time has passed, unless already cancelled/rejected/completed/no_show. Also inserts the customer-facing "Service Completed" notification and a booking_trigger_audit row, mirroring the manual complete flow in useBookings.ts. Scheduled via pg_cron (see job "bookme-auto-complete-past-bookings" below). Named with a "bookme_" prefix to avoid clashing with a pre-existing auto_complete_past_bookings() function.';

-- Speeds up the WHERE clause above at scale: only non-terminal
-- bookings are scanned by date/time.
CREATE INDEX IF NOT EXISTS idx_bookings_open_by_datetime
  ON public.bookings (booking_date, booking_time)
  WHERE status NOT IN ('completed', 'cancelled', 'rejected', 'no_show');

-- Requires the pg_cron extension to be enabled for this project
-- (Supabase Dashboard -> Database -> Extensions -> pg_cron), which
-- must be done once per project before this job can run.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- cron.schedule() upserts by job name, so re-running this migration
-- is safe and just updates the existing schedule.
SELECT cron.schedule(
  'bookme-auto-complete-past-bookings',
  '*/10 * * * *', -- every 10 minutes
  $$SELECT public.bookme_auto_complete_past_bookings();$$
);
