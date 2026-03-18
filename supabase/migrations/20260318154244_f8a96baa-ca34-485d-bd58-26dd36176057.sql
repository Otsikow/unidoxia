
-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- Schedule daily profile completion reminders at 9:00 AM UTC
SELECT cron.schedule(
  'send-profile-completion-reminders',
  '0 9 * * *',
  $$SELECT public.send_profile_completion_reminders();$$
);
