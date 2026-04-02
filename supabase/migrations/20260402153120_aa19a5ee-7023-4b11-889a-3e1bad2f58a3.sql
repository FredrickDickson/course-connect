-- Allow admins to update instructor_applications (approve/reject)
CREATE POLICY "instructor_applications_admins_update"
ON public.instructor_applications
FOR UPDATE
TO authenticated
USING (is_admin((auth.uid())::text))
WITH CHECK (is_admin((auth.uid())::text));

-- Allow admins to update user roles (needed when approving instructors)
CREATE POLICY "users_admin_update_roles"
ON public.users
FOR UPDATE
TO authenticated
USING (is_admin((auth.uid())::text))
WITH CHECK (is_admin((auth.uid())::text));