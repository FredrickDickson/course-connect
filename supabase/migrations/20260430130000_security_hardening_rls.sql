-- Security Hardening: Enable RLS on tables that currently have it disabled
-- This fixes the "RLS Disabled in Public" errors from Supabase advisors

-- Note: sessions table does not exist in this database, skipping

-- Enable RLS on pricing_config table
ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;

-- Enable RLS on course_enrollments_archive table
ALTER TABLE public.course_enrollments_archive ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for pricing_config table
-- Only admins can view pricing config
CREATE POLICY "Admins can view pricing_config"
  ON public.pricing_config FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()::text
      AND users.role = 'admin'
  ));

-- Only admins can insert pricing config
CREATE POLICY "Admins can insert pricing_config"
  ON public.pricing_config FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()::text
      AND users.role = 'admin'
  ));

-- Only admins can update pricing config
CREATE POLICY "Admins can update pricing_config"
  ON public.pricing_config FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()::text
      AND users.role = 'admin'
  ));

-- Only admins can delete pricing config
CREATE POLICY "Admins can delete pricing_config"
  ON public.pricing_config FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()::text
      AND users.role = 'admin'
  ));

-- Add RLS policies for course_enrollments_archive table
-- Only admins can view archived enrollments
CREATE POLICY "Admins can view course_enrollments_archive"
  ON public.course_enrollments_archive FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()::text
      AND users.role = 'admin'
  ));

-- Only admins can insert into archive
CREATE POLICY "Admins can insert course_enrollments_archive"
  ON public.course_enrollments_archive FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()::text
      AND users.role = 'admin'
  ));

-- Only admins can delete from archive
CREATE POLICY "Admins can delete course_enrollments_archive"
  ON public.course_enrollments_archive FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()::text
      AND users.role = 'admin'
  ));
