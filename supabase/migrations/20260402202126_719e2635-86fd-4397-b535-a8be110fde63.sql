CREATE POLICY "authenticated_users_can_insert_categories"
ON public.categories
FOR INSERT
TO authenticated
WITH CHECK (true);