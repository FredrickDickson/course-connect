-- create_lesson has two overloads. The client always supplies the mux_*
-- params (LectureContentEditor.tsx), so PostgREST resolves every real call
-- to the 12-arg overload below -- which had NO ownership/admin check at
-- all, and was executable even by `anon` (unauthenticated). Any caller
-- could insert a lesson into any course's module. The 9-arg overload does
-- check ownership but predates admin support (is_admin was added later in
-- 20260811000000_fix_admin_curriculum_access.sql) and still rejects admins
-- managing another instructor's course, which is what surfaced as
-- user_owns_module() returning false in the client's debug logging.

CREATE OR REPLACE FUNCTION public.create_lesson(
  _module_id uuid,
  _title text,
  _description text DEFAULT NULL::text,
  _content_type text DEFAULT 'video'::text,
  _content text DEFAULT NULL::text,
  _video_url text DEFAULT NULL::text,
  _video_platform text DEFAULT NULL::text,
  _video_id text DEFAULT NULL::text,
  _duration_seconds integer DEFAULT NULL::integer,
  _mux_asset_id text DEFAULT NULL::text,
  _mux_playback_id text DEFAULT NULL::text,
  _mux_status text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_owns boolean;
  v_next_order integer;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.modules m
    JOIN public.courses c ON c.id = m.course_id
    WHERE m.id = _module_id
      AND (c.instructor_id::text = v_uid::text OR public.is_admin(v_uid::text))
  ) INTO v_owns;

  IF NOT v_owns THEN
    RAISE EXCEPTION 'You do not own this module' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(MAX("order"), 0) + 1 INTO v_next_order
  FROM public.lessons WHERE module_id = _module_id;

  INSERT INTO public.lessons (
    module_id, title, description, content_type, content,
    video_url, video_platform, video_id, duration_seconds,
    mux_asset_id, mux_playback_id, mux_status, "order"
  )
  VALUES (
    _module_id, _title, _description, _content_type, _content,
    _video_url, _video_platform, _video_id, _duration_seconds,
    _mux_asset_id, _mux_playback_id, _mux_status, v_next_order
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

-- Bring the 9-arg overload's ownership check up to date with admin support too.
CREATE OR REPLACE FUNCTION public.create_lesson(
  _module_id uuid,
  _title text,
  _description text DEFAULT NULL::text,
  _content_type text DEFAULT 'video'::text,
  _content text DEFAULT NULL::text,
  _video_url text DEFAULT NULL::text,
  _video_platform text DEFAULT NULL::text,
  _video_id text DEFAULT NULL::text,
  _duration_seconds integer DEFAULT NULL::integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_owns boolean;
  v_next_order integer;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.modules m
    JOIN public.courses c ON c.id = m.course_id
    WHERE m.id = _module_id
      AND (c.instructor_id::text = v_uid::text OR public.is_admin(v_uid::text))
  ) INTO v_owns;

  IF NOT v_owns THEN
    RAISE EXCEPTION 'You do not own this module' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(MAX("order"), 0) + 1 INTO v_next_order
  FROM public.lessons WHERE module_id = _module_id;

  INSERT INTO public.lessons (
    module_id, title, description, content_type, content,
    video_url, video_platform, video_id, duration_seconds, "order"
  )
  VALUES (
    _module_id, _title, _description, _content_type, _content,
    _video_url, _video_platform, _video_id, _duration_seconds, v_next_order
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_lesson(uuid, text, text, text, text, text, text, text, integer) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_lesson(uuid, text, text, text, text, text, text, text, integer, text, text, text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_lesson(uuid, text, text, text, text, text, text, text, integer, text, text, text) TO authenticated;
