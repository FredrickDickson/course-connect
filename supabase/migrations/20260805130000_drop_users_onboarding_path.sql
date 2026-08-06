-- Remove users.onboarding_path - the Professional/Adjunct onboarding path
-- fork was reverted. Every user now goes through a single onboarding flow;
-- Adjunct Courses are a course-level distinction (courses.programme_type),
-- not a user-level path. Column had zero adoption in production (added and
-- never populated beyond the reverted feature).

ALTER TABLE public.users
  DROP COLUMN IF EXISTS onboarding_path;
