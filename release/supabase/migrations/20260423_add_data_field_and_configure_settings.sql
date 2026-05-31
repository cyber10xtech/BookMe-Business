-- Add data field to notifications table for storing custom notification data
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';

-- Add read_at field for tracking when notifications were read
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable realtime for notifications table (ensure it's in publication)
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Note: service_role_key must be set via Supabase dashboard or CLI:
-- supabase secrets set SERVICE_ROLE_KEY='your-service-role-key'
-- Then in the database, set it via:
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';
-- 
-- For now, the trigger will use the hardcoded URL and attempt to call the edge function.
-- The edge function (send-notification) uses SUPABASE_SERVICE_ROLE_KEY from environment.