
-- =============================================
-- 1. Add missing columns to profiles table
-- =============================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS nationality text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS profile_photo_url text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS referral_source text,
  ADD COLUMN IF NOT EXISTS organisation text,
  ADD COLUMN IF NOT EXISTS professional_background text,
  ADD COLUMN IF NOT EXISTS highest_qualification text,
  ADD COLUMN IF NOT EXISTS membership_level text NOT NULL DEFAULT 'associate',
  ADD COLUMN IF NOT EXISTS level_assigned_by text DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS level_assigned_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS level_assignment_reason text,
  ADD COLUMN IF NOT EXISTS override_reason text,
  ADD COLUMN IF NOT EXISTS bio_data_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Rename existing columns for clarity (institution → organisation if needed)
-- institution already exists, so organisation is a separate field or we keep both
-- Keep institution as-is since it's already in use

-- =============================================
-- 2. Create level_history table
-- =============================================

CREATE TABLE IF NOT EXISTS public.level_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  changed_from text NOT NULL,
  changed_to text NOT NULL,
  changed_by text NOT NULL DEFAULT 'system',
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.level_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all level history"
  ON public.level_history FOR SELECT
  TO authenticated
  USING (is_admin((auth.uid())::text));

CREATE POLICY "Admins can insert level history"
  ON public.level_history FOR INSERT
  TO authenticated
  WITH CHECK (is_admin((auth.uid())::text));

CREATE POLICY "Users can view own level history"
  ON public.level_history FOR SELECT
  TO authenticated
  USING (user_id = (auth.uid())::text);

CREATE INDEX idx_level_history_user_id ON public.level_history (user_id);

-- =============================================
-- 3. Create activity_log table
-- =============================================

CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  event_type text NOT NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all activity logs"
  ON public.activity_log FOR SELECT
  TO authenticated
  USING (is_admin((auth.uid())::text));

CREATE POLICY "Admins can insert activity logs"
  ON public.activity_log FOR INSERT
  TO authenticated
  WITH CHECK (is_admin((auth.uid())::text));

CREATE POLICY "Users can view own activity logs"
  ON public.activity_log FOR SELECT
  TO authenticated
  USING (user_id = (auth.uid())::text);

CREATE POLICY "System can insert activity logs"
  ON public.activity_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (auth.uid())::text);

CREATE INDEX idx_activity_log_user_id ON public.activity_log (user_id);
CREATE INDEX idx_activity_log_event_type ON public.activity_log (event_type);
CREATE INDEX idx_activity_log_created_at ON public.activity_log (created_at DESC);

-- =============================================
-- 4. Create level calculation function
-- =============================================

CREATE OR REPLACE FUNCTION public.calculate_member_level(p_user_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_level text;
  v_current_level text;
  v_reason text;
BEGIN
  -- Get current level
  SELECT membership_level INTO v_current_level
  FROM public.profiles
  WHERE user_id = p_user_id;

  IF v_current_level IS NULL THEN
    RETURN 'associate';
  END IF;

  -- Check for Fellow-level course completion
  IF EXISTS (
    SELECT 1 FROM public.course_enrollments ce
    JOIN public.courses c ON c.id = ce.course_id
    WHERE ce.user_id = p_user_id
      AND ce.payment_status = 'confirmed'
      AND c.level = 'fellow'
  ) THEN
    v_new_level := 'fellow';
    v_reason := 'Completed Fellow-level course';
  -- Check for Member-level or Associate-level course completion
  ELSIF EXISTS (
    SELECT 1 FROM public.course_enrollments ce
    JOIN public.courses c ON c.id = ce.course_id
    WHERE ce.user_id = p_user_id
      AND ce.payment_status = 'confirmed'
      AND c.level IN ('member', 'associate')
  ) THEN
    v_new_level := 'member';
    v_reason := 'Completed Associate/Member-level course';
  ELSE
    v_new_level := 'associate';
    v_reason := 'Default level';
  END IF;

  -- Only update if level changed and is an upgrade
  IF v_new_level != v_current_level AND (
    (v_new_level = 'fellow') OR
    (v_new_level = 'member' AND v_current_level = 'associate')
  ) THEN
    -- Log the change
    INSERT INTO public.level_history (user_id, changed_from, changed_to, changed_by, reason)
    VALUES (p_user_id, v_current_level, v_new_level, 'system', v_reason);

    -- Update profile
    UPDATE public.profiles
    SET membership_level = v_new_level,
        level_assigned_by = 'system',
        level_assigned_at = now(),
        level_assignment_reason = v_reason
    WHERE user_id = p_user_id;

    -- Log activity
    INSERT INTO public.activity_log (user_id, event_type, description, metadata)
    VALUES (
      p_user_id,
      'level_upgrade',
      'Level upgraded: ' || v_current_level || ' → ' || v_new_level,
      jsonb_build_object('from', v_current_level, 'to', v_new_level, 'reason', v_reason)
    );
  END IF;

  RETURN v_new_level;
END;
$$;
