-- Persistent audit trail for every Paystack webhook invocation (including
-- signature failures), plus idempotency guards on the payment reference
-- columns. Before this, a failed webhook left zero trace anywhere except
-- ephemeral Supabase function logs — which is how a real, successfully
-- charged payment (Paystack ref jp3mrs7fxv, GHS 5,501.75) went missing from
-- the DB with no way for admins to even discover it happened.

CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'paystack',
  event_type text NOT NULL,
  reference text,
  signature_valid boolean,
  status text NOT NULL CHECK (status IN ('processed', 'already_processed', 'failed', 'duplicate', 'skipped', 'reconciled_by_cron')),
  error_message text,
  metadata jsonb,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_reference ON public.payment_webhook_events (reference);
CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_created_at ON public.payment_webhook_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_status ON public.payment_webhook_events (status);

ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage payment_webhook_events"
  ON public.payment_webhook_events FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Admins can view payment_webhook_events"
  ON public.payment_webhook_events FOR SELECT
  TO authenticated
  USING (is_admin((auth.uid())::text));

-- ---------------------------------------------------------------------
-- Idempotency: a real Paystack reference must not be recorded twice. This
-- excludes the 'TOKEN-' pseudo-references written by
-- redeem_course_access_token() for 100%-off coupon redemptions, which
-- legitimately reuse the same token-derived string across multiple orders.
-- ---------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_paystack_reference_unique
  ON public.orders (paystack_reference)
  WHERE paystack_reference IS NOT NULL AND paystack_reference NOT LIKE 'TOKEN-%';

CREATE UNIQUE INDEX IF NOT EXISTS idx_renewal_history_payment_reference_unique
  ON public.renewal_history (payment_reference)
  WHERE payment_reference IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_expedited_applications_paystack_reference_unique
  ON public.expedited_applications (paystack_reference)
  WHERE paystack_reference IS NOT NULL;

-- Speeds up the admin Payments tab (search/sort by reference and date) and
-- the reconciliation sweep's "does this reference already exist" checks.
CREATE INDEX IF NOT EXISTS idx_orders_paystack_reference ON public.orders (paystack_reference);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
