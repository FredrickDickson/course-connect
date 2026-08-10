-- Enhance email_logs for Brevo delivery tracking and admin visibility

ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'failed', 'pending')),
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'brevo',
  ADD COLUMN IF NOT EXISTS provider_message_id TEXT,
  ADD COLUMN IF NOT EXISTS error_message TEXT;

CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_provider ON public.email_logs(provider);

-- Admins can read email logs for the renewal dashboard
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'email_logs'
      AND policyname = 'Admins can read email_logs'
  ) THEN
    CREATE POLICY "Admins can read email_logs" ON public.email_logs
      FOR SELECT
      TO authenticated
      USING (is_admin((auth.uid())::text));
  END IF;
END $$;
