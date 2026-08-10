-- Fixes pg_cron -> Edge Function auth: the previous job authenticated via
-- current_setting('app.settings.service_role_key'), a Postgres setting that
-- was never actually set anywhere, so every invocation sent an empty
-- Authorization header and was rejected. Supabase's documented pattern for
-- pg_cron/pg_net calling an Edge Function is to store the service role key
-- in Vault and read it back at call time. The secret itself is created via
-- a one-time `select vault.create_secret(...)` run manually against the
-- project (not stored in this migration - see docs/certificate-renewal-deployment-guide.md).

CREATE EXTENSION IF NOT EXISTS supabase_vault;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'renewal-reminders') THEN
    PERFORM cron.unschedule('renewal-reminders');
  END IF;
END $$;

-- Runs 5 minutes before renewal-reminders so status transitions land first.
SELECT cron.schedule(
  'sync-membership-statuses',
  '55 5 * * *',
  $$ SELECT public.sync_membership_statuses(); $$
);

SELECT cron.schedule(
  'renewal-reminders',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://emvibxbcrvritkwkguya.supabase.co/functions/v1/renewal-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'service_role_key' LIMIT 1
      )
    ),
    body := '{}'::jsonb
  );
  $$
);
