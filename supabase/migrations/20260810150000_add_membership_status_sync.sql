-- Transitions members.status based on expiry_date passing wall-clock time.
-- Nothing else in the codebase ever moves status away from 'active' once
-- set, so without this, a lapsed member stays "active" forever (breaks
-- the public verify-member gate, admin "Expiring/Expired" filters, and
-- the reminder function's own status filter). Scheduled, not trigger-based,
-- because the condition is time passing, not a row being written.

CREATE OR REPLACE FUNCTION public.sync_membership_statuses()
RETURNS TABLE(transitioned_to_expiring integer, transitioned_to_expired integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expiring_count integer;
  v_expired_count  integer;
BEGIN
  -- active/expiring whose expiry_date has passed -> expired (do this first
  -- so a member isn't briefly re-classified as 'expiring' on the same run)
  WITH updated AS (
    UPDATE public.members
    SET status = 'expired', updated_at = now()
    WHERE status IN ('active', 'expiring')
      AND expiry_date IS NOT NULL
      AND expiry_date < CURRENT_DATE
    RETURNING id
  )
  SELECT count(*) INTO v_expired_count FROM updated;

  -- active memberships entering the 30-day expiry window -> expiring
  WITH updated AS (
    UPDATE public.members
    SET status = 'expiring', updated_at = now()
    WHERE status = 'active'
      AND expiry_date IS NOT NULL
      AND expiry_date >= CURRENT_DATE
      AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'
    RETURNING id
  )
  SELECT count(*) INTO v_expiring_count FROM updated;

  RETURN QUERY SELECT v_expiring_count, v_expired_count;
END;
$$;

COMMENT ON FUNCTION public.sync_membership_statuses() IS
  'Daily status transition: active->expiring (<=30 days to expiry_date), active/expiring->expired (past expiry_date). Invoked by pg_cron before renewal-reminders runs.';

GRANT EXECUTE ON FUNCTION public.sync_membership_statuses() TO service_role, postgres;
