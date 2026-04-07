
-- Create profiles table for persistent biodata
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE,
  full_name text,
  phone text,
  whatsapp text,
  country text,
  address text,
  institution text,
  job_title text,
  years_experience text,
  industry text,
  role_category text,
  education_level text,
  adr_experience text DEFAULT 'none',
  profile_completed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (user_id = (auth.uid())::text);

-- Users can create their own profile
CREATE POLICY "Users can create own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = (auth.uid())::text);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = (auth.uid())::text);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (is_admin((auth.uid())::text));

-- Trigger for updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add profile_snapshot to course_enrollments
ALTER TABLE public.course_enrollments
ADD COLUMN IF NOT EXISTS profile_snapshot jsonb;
