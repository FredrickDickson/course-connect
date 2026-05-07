create or replace function public.debug_whoami()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'uid', auth.uid(),
    'role', auth.role(),
    'jwt_sub', current_setting('request.jwt.claim.sub', true),
    'jwt_role', current_setting('request.jwt.claim.role', true)
  );
$$;

grant execute on function public.debug_whoami() to anon, authenticated;