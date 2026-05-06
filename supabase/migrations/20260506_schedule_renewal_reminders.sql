-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule daily renewal reminders at 6:00 AM UTC
-- Replace <project_ref> with your Supabase project reference ID
SELECT cron.schedule(
  'renewal-reminders',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url:='https://emvibxbcrvritkwkguya.supabase.co/functions/v1/renewal-reminders',
    headers:='{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  );
  $$
);
