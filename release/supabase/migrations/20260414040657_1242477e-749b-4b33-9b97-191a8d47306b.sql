
-- Fix overly permissive INSERT on bookings
DROP POLICY IF EXISTS "Authenticated users can create bookings" ON public.bookings;
CREATE POLICY "Authenticated users can create bookings"
ON public.bookings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = business_user_id);

-- Fix overly permissive INSERT on notifications  
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
CREATE POLICY "Authenticated users can create notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Also allow service_role to insert notifications (for edge function trigger)
CREATE POLICY "Service role can create notifications"
ON public.notifications FOR INSERT TO service_role
WITH CHECK (true);
