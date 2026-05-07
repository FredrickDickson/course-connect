create or replace function public.debug_lessons_insert(_module_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_uid uuid;
  v_owns boolean;
  v_module_exists boolean;
  v_instructor text;
begin
  v_uid := auth.uid();
  v_owns := public.user_owns_module(_module_id, v_uid);
  select exists(select 1 from public.modules where id = _module_id) into v_module_exists;
  select c.instructor_id::text into v_instructor
    from public.modules m join public.courses c on c.id = m.course_id
    where m.id = _module_id;
  return jsonb_build_object(
    'auth_uid', v_uid,
    'auth_uid_text', v_uid::text,
    'module_exists', v_module_exists,
    'instructor_id', v_instructor,
    'user_owns_module', v_owns,
    'request_role', current_setting('request.jwt.claim.role', true),
    'request_sub', current_setting('request.jwt.claim.sub', true),
    'request_claims', current_setting('request.jwt.claims', true)
  );
end;
$$;

grant execute on function public.debug_lessons_insert(uuid) to authenticated, anon;