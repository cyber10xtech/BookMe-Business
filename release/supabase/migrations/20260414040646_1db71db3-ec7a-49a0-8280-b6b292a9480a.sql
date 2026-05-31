
-- Create a function that calls the send-notification edge function via pg_net
CREATE OR REPLACE FUNCTION public.notify_fcm_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _supabase_url text;
  _service_role_key text;
  _payload jsonb;
BEGIN
  -- Read from vault or use hardcoded project URL
  _supabase_url := current_setting('app.settings.supabase_url', true);
  IF _supabase_url IS NULL THEN
    _supabase_url := 'https://trnsuruvwdzfrhfaboxe.supabase.co';
  END IF;

  _service_role_key := current_setting('app.settings.service_role_key', true);

  _payload := jsonb_build_object(
    'user_id', NEW.user_id,
    'title', NEW.title,
    'message', NEW.message,
    'type', NEW.type,
    'related_booking_id', NEW.related_booking_id
  );

  -- Use pg_net to make async HTTP call to edge function
  PERFORM net.http_post(
    url := _supabase_url || '/functions/v1/send-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _service_role_key
    ),
    body := _payload
  );

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_notification_inserted ON public.notifications;
CREATE TRIGGER on_notification_inserted
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_fcm_on_insert();

-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
