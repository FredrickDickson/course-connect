-- ============================================================================
-- MIGRATION: course_enrollments → enrollments + orders
-- Purpose: Unify fragmented enrollment systems into single source of truth
-- Date: 2026-04-26
-- ============================================================================

-- First, add missing columns to orders table for course_enrollments compatibility
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS booking_ref TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS enrollment_metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS amount_usd TEXT,
  ADD COLUMN IF NOT EXISTS amount_ghs TEXT,
  ADD COLUMN IF NOT EXISTS exchange_rate TEXT,
  ADD COLUMN IF NOT EXISTS original_currency TEXT,
  ADD COLUMN IF NOT EXISTS charged_currency TEXT;

-- Add index for booking_ref lookups
CREATE INDEX IF NOT EXISTS idx_orders_booking_ref ON public.orders(booking_ref);

-- ============================================================================
-- MIGRATE CONFIRMED ENROLLMENTS (paid via Paystack)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'course_enrollments' AND table_schema = 'public') THEN
    WITH migrated_enrollments AS (
      INSERT INTO public.enrollments (
        user_id,
        course_id,
        enrollment_level,
        status,
        enrollment_type,
        enrolled_at
      )
      SELECT 
        ce.user_id,
        ce.course_id,
        UPPER(ce.ticket_type) as enrollment_level,
        'ACTIVE'::text as status,
        'COURSE'::text as enrollment_type,
        COALESCE(ce.confirmed_at, ce.created_at) as enrolled_at
      FROM public.course_enrollments ce
      WHERE ce.payment_status = 'confirmed'
        AND ce.user_id IS NOT NULL
        AND ce.course_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.enrollments e 
          WHERE e.user_id = ce.user_id 
          AND e.course_id = ce.course_id
        )
      RETURNING id, user_id, course_id, enrolled_at
    )
    -- Create corresponding orders for paid enrollments
    INSERT INTO public.orders (
      user_id,
      course_id,
      booking_ref,
      amount,
      currency,
      status,
      paystack_reference,
      created_at,
      enrollment_metadata,
      amount_ghs,
      original_currency,
      charged_currency
    )
    SELECT 
      ce.user_id,
      ce.course_id,
      ce.booking_ref,
      ce.ticket_price,
      ce.currency,
      'completed'::text as status,
      ce.paystack_reference,
      ce.created_at,
      jsonb_build_object(
        'full_name', ce.full_name,
        'email', ce.email,
        'phone', ce.phone,
        'whatsapp', ce.whatsapp,
        'country', ce.country,
        'institution', ce.institution,
        'address', ce.address,
        'programme_selected', ce.programme_selected,
        'personal_statement', ce.personal_statement,
        'payment_method', ce.payment_method,
        'migrated_from', 'course_enrollments',
        'migrated_at', now()
      ),
      ce.ticket_price::text,
      ce.currency,
      ce.currency
    FROM public.course_enrollments ce
    WHERE ce.payment_status = 'confirmed'
      AND ce.user_id IS NOT NULL
      AND ce.course_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.orders o 
        WHERE o.booking_ref = ce.booking_ref
      );
  END IF;
END $$;

-- ============================================================================
-- MIGRATE PENDING ENROLLMENTS (bank transfer, invoice pending)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'course_enrollments' AND table_schema = 'public') THEN
    WITH pending_enrollments AS (
      INSERT INTO public.enrollments (
        user_id,
        course_id,
        enrollment_level,
        status,
        enrollment_type,
        enrolled_at
      )
      SELECT 
        ce.user_id,
        ce.course_id,
        UPPER(ce.ticket_type) as enrollment_level,
        CASE 
          WHEN ce.payment_status IN ('pending_bank', 'pending_invoice') THEN 'PENDING_APPROVAL'::text
          ELSE 'ACTIVE'::text
        END as status,
        'COURSE'::text as enrollment_type,
        ce.created_at as enrolled_at
      FROM public.course_enrollments ce
      WHERE ce.payment_status IN ('pending_bank', 'pending_invoice', 'cancelled')
        AND ce.user_id IS NOT NULL
        AND ce.course_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.enrollments e 
          WHERE e.user_id = ce.user_id 
          AND e.course_id = ce.course_id
        )
      RETURNING id, user_id, course_id
    )
    -- Create pending orders
    INSERT INTO public.orders (
      user_id,
      course_id,
      booking_ref,
      amount,
      currency,
      status,
      created_at,
      enrollment_metadata,
      amount_ghs,
      original_currency,
      charged_currency
    )
    SELECT 
      ce.user_id,
      ce.course_id,
      ce.booking_ref,
      ce.ticket_price,
      ce.currency,
      'pending'::text as status,
      ce.created_at,
      jsonb_build_object(
        'full_name', ce.full_name,
        'email', ce.email,
        'phone', ce.phone,
        'whatsapp', ce.whatsapp,
        'country', ce.country,
        'institution', ce.institution,
        'address', ce.address,
        'programme_selected', ce.programme_selected,
        'personal_statement', ce.personal_statement,
        'payment_method', ce.payment_method,
        'payment_status', ce.payment_status,
        'migrated_from', 'course_enrollments',
        'migrated_at', now()
      ),
      ce.ticket_price::text,
      ce.currency,
      ce.currency
    FROM public.course_enrollments ce
    WHERE ce.payment_status IN ('pending_bank', 'pending_invoice', 'cancelled')
      AND ce.user_id IS NOT NULL
      AND ce.course_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.orders o 
        WHERE o.booking_ref = ce.booking_ref
      );
  END IF;
END $$;

-- ============================================================================
-- CREATE VIEW FOR BACKWARD COMPATIBILITY (optional, for admin queries)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'enrollments' 
    AND column_name = 'order_id'
  ) THEN
    CREATE OR REPLACE VIEW public.course_enrollments_legacy AS
    SELECT 
      e.id,
      o.booking_ref,
      e.course_id,
      e.user_id,
      LOWER(e.enrollment_level) as ticket_type,
      o.amount as ticket_price,
      COALESCE(o.charged_currency, o.currency, 'GHS') as currency,
      (o.enrollment_metadata->>'email') as email,
      (o.enrollment_metadata->>'full_name') as full_name,
      (o.enrollment_metadata->>'country') as country,
      (o.enrollment_metadata->>'phone') as phone,
      (o.enrollment_metadata->>'whatsapp') as whatsapp,
      (o.enrollment_metadata->>'institution') as institution,
      (o.enrollment_metadata->>'address') as address,
      (o.enrollment_metadata->>'programme_selected') as programme_selected,
      (o.enrollment_metadata->>'personal_statement') as personal_statement,
      (o.enrollment_metadata->>'payment_method') as payment_method,
      CASE 
        WHEN o.status = 'completed' THEN 'confirmed'::text
        WHEN o.status = 'pending' THEN 'pending_bank'::text
        WHEN o.status = 'refunded' THEN 'cancelled'::text
        ELSE o.status::text
      END as payment_status,
      o.paystack_reference,
      e.enrolled_at as created_at,
      e.enrolled_at as confirmed_at
    FROM public.enrollments e
    LEFT JOIN public.orders o ON o.user_id = e.user_id AND o.course_id = e.course_id
    WHERE o.enrollment_metadata->>'migrated_from' = 'course_enrollments'
       OR EXISTS (SELECT 1 FROM public.course_enrollments ce WHERE ce.user_id = e.user_id AND ce.course_id = e.course_id);
  END IF;
END $$;

-- ============================================================================
-- UPDATE RLS POLICIES for orders table (add booking_ref policies)
-- ============================================================================

-- Users can view their own orders by booking_ref
DROP POLICY IF EXISTS "Users can view own orders by booking_ref" ON public.orders;
CREATE POLICY "Users can view own orders by booking_ref"
  ON public.orders FOR SELECT
  TO authenticated
  USING (user_id = (auth.uid())::text);

-- ============================================================================
-- LOG MIGRATION RESULTS
-- ============================================================================

DO $$
DECLARE
  v_enrollment_count INTEGER;
  v_order_count INTEGER;
  v_remaining_ce INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'course_enrollments' AND table_schema = 'public') THEN
    SELECT COUNT(*) INTO v_enrollment_count FROM public.enrollments e
    WHERE EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.user_id = e.user_id 
      AND o.course_id = e.course_id
      AND o.enrollment_metadata->>'migrated_from' = 'course_enrollments'
    );
    
    SELECT COUNT(*) INTO v_order_count FROM public.orders
    WHERE enrollment_metadata->>'migrated_from' = 'course_enrollments';
    
    SELECT COUNT(*) INTO v_remaining_ce FROM public.course_enrollments;
    
    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE '  - Migrated enrollments: %', v_enrollment_count;
    RAISE NOTICE '  - Migrated orders: %', v_order_count;
    RAISE NOTICE '  - Remaining in course_enrollments: %', v_remaining_ce;
    RAISE NOTICE '  - Legacy view created: course_enrollments_legacy';
  ELSE
    RAISE NOTICE 'course_enrollments table does not exist, skipping migration';
  END IF;
END $$;

-- ============================================================================
-- NOTE: After verification, run the following to drop old table:
-- 
-- DROP TABLE public.course_enrollments CASCADE;
-- DROP FUNCTION public.generate_booking_ref CASCADE;
-- DROP VIEW public.course_enrollments_legacy;
--
-- ============================================================================
