-- Schedules the paystack-reconcile Edge Function every 30 minutes, using the
-- same pg_cron + pg_net + Vault pattern already established for
-- renewal-reminders/sync-membership-statuses (20260810150100). The
-- 'service_role_key' Vault secret referenced here was created once, out of
-- band, against the project — see docs/certificate-renewal-deployment-guide.md.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'paystack-reconcile') THEN
    PERFORM cron.unschedule('paystack-reconcile');
  END IF;
END $$;

SELECT cron.schedule(
  'paystack-reconcile',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://emvibxbcrvritkwkguya.supabase.co/functions/v1/paystack-reconcile',
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
