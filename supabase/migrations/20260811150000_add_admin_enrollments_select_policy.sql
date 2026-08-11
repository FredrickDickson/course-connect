-- enrollments had no admin SELECT policy (only "view own" and "instructor views own course"),
-- so the admin dashboard (admin-enrollments-unified.tsx) could only ever see enrollments
-- belonging to the logged-in admin themselves. Mirror the existing "Admins can view all orders"
-- policy that already exists on public.orders.

CREATE POLICY "Admins can view all enrollments"
ON public.enrollments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id::text = (auth.uid())::text
      AND users.role::text = 'admin'
  )
);
