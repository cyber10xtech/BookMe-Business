
-- Add fcm_token and role to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fcm_token text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'business';

-- Indexes on foreign keys for performance
CREATE INDEX IF NOT EXISTS idx_bookings_business_user_id ON public.bookings(business_user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON public.bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_clients_business_user_id ON public.clients(business_user_id);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_user_id ON public.gallery_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_related_booking_id ON public.notifications(related_booking_id);
CREATE INDEX IF NOT EXISTS idx_promotions_user_id ON public.promotions(user_id);
CREATE INDEX IF NOT EXISTS idx_promotions_applicable_service_id ON public.promotions(applicable_service_id);
CREATE INDEX IF NOT EXISTS idx_services_user_id ON public.services(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- Fix overly permissive INSERT on bookings
DROP POLICY IF EXISTS "Anyone can create bookings" ON public.bookings;
CREATE POLICY "Authenticated users can create bookings"
ON public.bookings FOR INSERT TO authenticated
WITH CHECK (true);

-- Fix overly permissive INSERT on notifications
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Authenticated users can create notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (true);

-- Add DELETE policies
CREATE POLICY "Users can delete their own bookings"
ON public.bookings FOR DELETE
USING (auth.uid() = business_user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create business-assets bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-assets', 'business-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for business-assets
CREATE POLICY "Business assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'business-assets');

CREATE POLICY "Users can upload business assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'business-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update business assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'business-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete business assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'business-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
