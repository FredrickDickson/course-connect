-- Course access tokens: admin-generated single-use (or limited-use) codes
-- that apply a discount at checkout. 100%-off "access tokens" are the
-- primary use case (students who paid externally); partial percentage
-- coupons are supported by the same schema/type but are not the focus.
--
-- Redemption tracking deliberately reuses the existing `orders` table
-- (payment_method + access_token_id) instead of a parallel redemptions
-- table, so "redeemed by/when" is just `orders WHERE access_token_id = X`
-- and multi-use coupons need zero extra schema (one order row per use).

CREATE TABLE public.course_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage')),
  discount_value numeric(5,2) NOT NULL CHECK (discount_value > 0 AND discount_value <= 100),
  usage_limit integer NOT NULL DEFAULT 1 CHECK (usage_limit > 0),
  usage_count integer NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  expires_at timestamptz NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_by text REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.course_access_tokens.status IS
  'Admin-controlled: active or disabled. "Redeemed" and "expired" are derived (usage_count >= usage_limit / expires_at < now()), not stored, to avoid drift.';
COMMENT ON COLUMN public.course_access_tokens.token IS
  'Stored uppercase/trimmed. Human-facing format e.g. CIMA-XXXX-XXXX (random unambiguous base32-ish characters), generated server-side only (never client-supplied).';

CREATE INDEX idx_course_access_tokens_course_id ON public.course_access_tokens(course_id);
CREATE INDEX idx_course_access_tokens_status ON public.course_access_tokens(status);

CREATE TRIGGER update_course_access_tokens_updated_at
  BEFORE UPDATE ON public.course_access_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- Extend orders to record token-based ($0 or discounted) "payments"
-- ---------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'paystack' CHECK (payment_method IN ('paystack', 'access_token')),
  ADD COLUMN IF NOT EXISTS access_token_id uuid REFERENCES public.course_access_tokens(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_access_token_id ON public.orders(access_token_id) WHERE access_token_id IS NOT NULL;

COMMENT ON COLUMN public.orders.payment_method IS
  'paystack (default, preserves existing rows) or access_token. Existing revenue SUM(amount) queries are unaffected since access_token orders record amount=0 or the discounted amount, not a fabricated Paystack charge.';

-- ---------------------------------------------------------------------
-- RLS: admin-only on course_access_tokens. Students never query this
-- table directly — validation/redemption goes through the SECURITY
-- DEFINER functions below, which bypass RLS deliberately and narrowly.
-- ---------------------------------------------------------------------
ALTER TABLE public.course_access_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "course_access_tokens_admin_select" ON public.course_access_tokens
  FOR SELECT TO authenticated USING (is_admin(auth.uid()::text));
CREATE POLICY "course_access_tokens_admin_insert" ON public.course_access_tokens
  FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()::text));
CREATE POLICY "course_access_tokens_admin_update" ON public.course_access_tokens
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()::text)) WITH CHECK (is_admin(auth.uid()::text));
CREATE POLICY "course_access_tokens_admin_delete" ON public.course_access_tokens
  FOR DELETE TO authenticated USING (is_admin(auth.uid()::text));

-- ---------------------------------------------------------------------
-- Read-only preview/validation (used by checkout's "Apply" button AND
-- by paystack-course-initialize for the partial-coupon amount check).
-- Deliberately NOT called from inside the mutating function below: it
-- has no row lock, so calling it from inside the locked transaction
-- would validate against a pre-lock snapshot. Guard clauses are kept in
-- sync manually with redeem_course_access_token() below.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_course_access_token(_token text, _course_id uuid)
RETURNS TABLE (
  valid boolean,
  reason text,
  discount_type text,
  discount_value numeric,
  discounted_amount numeric,
  currency text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token public.course_access_tokens%ROWTYPE;
  v_course_price numeric(10,2);
  v_course_currency text;
  v_normalized text := upper(trim(_token));
BEGIN
  SELECT * INTO v_token FROM public.course_access_tokens WHERE token = v_normalized;
  -- Explicit table qualification: "currency" is also an OUT parameter name
  -- above, so an unqualified reference is ambiguous between the plpgsql
  -- variable and the courses column.
  SELECT courses.price, courses.currency INTO v_course_price, v_course_currency FROM public.courses WHERE id = _course_id;

  IF v_course_price IS NULL THEN
    RETURN QUERY SELECT false, 'course_not_found', NULL::text, NULL::numeric, NULL::numeric, NULL::text; RETURN;
  END IF;
  IF v_token.id IS NULL THEN
    RETURN QUERY SELECT false, 'invalid_token', NULL::text, NULL::numeric, NULL::numeric, NULL::text; RETURN;
  END IF;
  IF v_token.status <> 'active' THEN
    RETURN QUERY SELECT false, 'token_disabled', NULL::text, NULL::numeric, NULL::numeric, NULL::text; RETURN;
  END IF;
  IF v_token.course_id <> _course_id THEN
    RETURN QUERY SELECT false, 'token_course_mismatch', NULL::text, NULL::numeric, NULL::numeric, NULL::text; RETURN;
  END IF;
  IF v_token.expires_at IS NOT NULL AND v_token.expires_at < now() THEN
    RETURN QUERY SELECT false, 'token_expired', NULL::text, NULL::numeric, NULL::numeric, NULL::text; RETURN;
  END IF;
  IF v_token.usage_count >= v_token.usage_limit THEN
    RETURN QUERY SELECT false, 'token_exhausted', NULL::text, NULL::numeric, NULL::numeric, NULL::text; RETURN;
  END IF;

  RETURN QUERY SELECT
    true, NULL::text, v_token.discount_type, v_token.discount_value,
    GREATEST(round(v_course_price * (1 - v_token.discount_value / 100.0), 2), 0),
    v_course_currency;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_course_access_token(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_course_access_token(text, uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------
-- Mutating, atomic redemption. Restricted to service_role: called only
-- from the redeem-access-token Edge Function (which has already verified
-- caller identity the same way paystack-course-initialize does), and by
-- extension trusted to pass the real user id in p_user_id. Not callable
-- directly by students, because free enrollment creation must go through
-- provisioning (email/community/CRM) which needs service-role/
-- INTERNAL_API_KEY access a browser can't hold.
--
-- Guard clauses below MUST be kept in sync with validate_course_access_token().
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_course_access_token(
  p_token text,
  p_user_id text,
  p_course_id uuid,
  p_enrollment_level text DEFAULT NULL
)
RETURNS TABLE (
  enrollment_id uuid,
  order_id uuid,
  discounted_amount numeric,
  currency text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token public.course_access_tokens%ROWTYPE;
  v_course_price numeric(10,2);
  v_course_currency text;
  v_course_programme_type text;
  v_existing_id uuid;
  v_discounted_amount numeric(10,2);
  v_order_id uuid;
  v_enrollment_id uuid;
  v_normalized text := upper(trim(p_token));
BEGIN
  IF p_user_id IS NULL OR p_user_id = '' THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Serialize against ANY other enrollment-creation path for this exact
  -- user+course (webhook, verify-payment, course-detail free-course
  -- bypass, or a second concurrent token redemption). enrollments has no
  -- DB-level unique constraint on (user_id, course_id) — this advisory
  -- lock is what actually closes the "already enrolled" race.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id || ':' || p_course_id::text, 0));

  -- Lock the token row so two concurrent redemptions of the SAME token
  -- serialize: the second transaction blocks here until the first
  -- commits (or rolls back), then re-reads the updated usage_count.
  SELECT * INTO v_token FROM public.course_access_tokens WHERE token = v_normalized FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_token';
  END IF;
  IF v_token.status <> 'active' THEN
    RAISE EXCEPTION 'token_disabled';
  END IF;
  IF v_token.course_id <> p_course_id THEN
    RAISE EXCEPTION 'token_course_mismatch';
  END IF;
  IF v_token.expires_at IS NOT NULL AND v_token.expires_at < now() THEN
    RAISE EXCEPTION 'token_expired';
  END IF;
  IF v_token.usage_count >= v_token.usage_limit THEN
    RAISE EXCEPTION 'token_exhausted';
  END IF;

  SELECT id INTO v_existing_id FROM public.enrollments
    WHERE user_id = p_user_id AND course_id = p_course_id LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'already_enrolled';
  END IF;

  -- Explicit table qualification: "currency" is also an OUT parameter name
  -- above, so an unqualified reference is ambiguous between the plpgsql
  -- variable and the courses column.
  SELECT courses.price, courses.currency, courses.programme_type INTO v_course_price, v_course_currency, v_course_programme_type
    FROM public.courses WHERE id = p_course_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'course_not_found';
  END IF;

  v_discounted_amount := GREATEST(round(v_course_price * (1 - v_token.discount_value / 100.0), 2), 0);

  INSERT INTO public.orders (user_id, course_id, amount, currency, status, payment_method, access_token_id, paystack_reference)
  VALUES (p_user_id, p_course_id, v_discounted_amount, v_course_currency, 'completed', 'access_token', v_token.id, 'TOKEN-' || v_token.token)
  RETURNING id INTO v_order_id;

  INSERT INTO public.enrollments (user_id, course_id, progress, status, enrollment_type, enrollment_level)
  VALUES (
    p_user_id, p_course_id, '0', 'ACTIVE', 'COURSE',
    CASE WHEN v_course_programme_type = 'ADJUNCT_COURSE' THEN NULL ELSE p_enrollment_level END
  )
  RETURNING id INTO v_enrollment_id;

  -- courses.enrollment_count is kept in sync automatically by the
  -- enrollments_sync_course_count trigger (20260811160000) — do NOT
  -- increment it manually here.
  UPDATE public.course_access_tokens SET usage_count = usage_count + 1, updated_at = now() WHERE id = v_token.id;

  RETURN QUERY SELECT v_enrollment_id, v_order_id, v_discounted_amount, v_course_currency;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_course_access_token(text, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_course_access_token(text, text, uuid, text) TO service_role;

-- ---------------------------------------------------------------------
-- Small helper used only by paystack-webhook's additive coupon block,
-- for the secondary partial-percentage-coupon-paid-via-Paystack path.
-- Guarded so it can never push usage_count past usage_limit.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_access_token_usage(p_access_token_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.course_access_tokens SET usage_count = usage_count + 1, updated_at = now()
  WHERE id = p_access_token_id AND usage_count < usage_limit
  RETURNING true;
$$;

REVOKE ALL ON FUNCTION public.increment_access_token_usage(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_access_token_usage(uuid) TO service_role;
