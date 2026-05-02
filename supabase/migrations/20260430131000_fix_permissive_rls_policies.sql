-- Fix overly permissive RLS policies
-- This replaces WITH CHECK (true) policies with proper restrictions
-- Fixes "RLS Policy Always True" warnings from Supabase advisors

-- Fix categories INSERT policy - only admins should insert categories
DROP POLICY IF EXISTS "authenticated_users_can_insert_categories" ON public.categories;

CREATE POLICY "Admins can insert categories"
  ON public.categories FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()::text
      AND users.role = 'admin'
  ));

-- Fix certificates INSERT policy - keep for system but add validation
DROP POLICY IF EXISTS "System can insert certificates" ON public.certificates;

CREATE POLICY "System can insert certificates"
  ON public.certificates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()::text
        AND users.role = 'admin'
    )
    OR auth.uid() IS NULL
  );

-- Fix course_completion_records INSERT policy
DROP POLICY IF EXISTS "System can insert course completion records" ON public.course_completion_records;

CREATE POLICY "System can insert course completion records"
  ON public.course_completion_records FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()::text
        AND users.role = 'admin'
    )
    OR auth.uid() IS NULL
  );

-- Fix course_waitlist INSERT policies - skip, table has different schema (legacy structure)
-- Note: course_waitlist table doesn't have user_id column, skipping policies

-- Fix pathway_certificates INSERT policy
DROP POLICY IF EXISTS "System can insert pathway certificates" ON public.pathway_certificates;

CREATE POLICY "System can insert pathway certificates"
  ON public.pathway_certificates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()::text
        AND users.role = 'admin'
    )
    OR auth.uid() IS NULL
  );

-- Fix pathway_progress INSERT policy
DROP POLICY IF EXISTS "System can insert pathway progress" ON public.pathway_progress;

CREATE POLICY "System can insert pathway progress"
  ON public.pathway_progress FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()::text
        AND users.role = 'admin'
    )
    OR auth.uid() IS NULL
  );
