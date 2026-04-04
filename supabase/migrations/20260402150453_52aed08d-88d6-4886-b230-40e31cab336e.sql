
-- 1. Drop the overly permissive certifications public policy
DROP POLICY IF EXISTS "certifications_view_public" ON public.certifications;

-- 2. Fix users self-update to prevent role escalation
-- Drop existing policy
DROP POLICY IF EXISTS "users_update_own_profile" ON public.users;

-- Create new policy that prevents role changes
CREATE POLICY "users_update_own_profile"
ON public.users
FOR UPDATE TO authenticated
USING ((auth.uid())::text = (id)::text)
WITH CHECK (
  (auth.uid())::text = (id)::text
  AND (role IS NOT DISTINCT FROM (SELECT u.role FROM public.users u WHERE u.id = users.id))
);
