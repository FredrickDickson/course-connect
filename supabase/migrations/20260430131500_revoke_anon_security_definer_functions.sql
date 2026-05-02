-- Revoke anon EXECUTE on SECURITY DEFINER functions
-- This prevents unauthorized access to privileged functions
-- Fixes "Public Can Execute SECURITY DEFINER Function" warnings

-- Revoke anon EXECUTE on SECURITY DEFINER functions (only if they exist)
-- Using parameter types to match exact signatures
DO $$
BEGIN
  -- Check and revoke/grant for functions that exist
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calculate_member_level' AND pronamespace = 'public'::regnamespace) THEN
    REVOKE EXECUTE ON FUNCTION public.calculate_member_level(p_user_id text) FROM anon;
    GRANT EXECUTE ON FUNCTION public.calculate_member_level(p_user_id text) TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user' AND pronamespace = 'public'::regnamespace) THEN
    REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
    GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin' AND pronamespace = 'public'::regnamespace) THEN
    REVOKE EXECUTE ON FUNCTION public.is_admin(_user_id text) FROM anon;
    GRANT EXECUTE ON FUNCTION public.is_admin(_user_id text) TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column' AND pronamespace = 'public'::regnamespace) THEN
    REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon;
    GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated;
  END IF;
END $$;
