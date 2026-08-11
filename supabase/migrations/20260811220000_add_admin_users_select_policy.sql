-- public.users has UPDATE support for admins (users_admin_update_roles) but no admin
-- SELECT policy. Effective SELECT policies were only "view own row" and "view any
-- instructor row", so the admin dashboard (admin-users-profiles.tsx, admin-dashboard.tsx)
-- could never see student rows when querying auth'd as an admin via the browser client.
-- Mirror the existing "Admins can view all enrollments" / "Admins can view all orders"
-- precedent using the standard is_admin() helper.

CREATE POLICY "Admins can view all users"
ON public.users
FOR SELECT
TO authenticated
USING (is_admin((auth.uid())::text));
