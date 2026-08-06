
CREATE OR REPLACE FUNCTION public.create_lesson(
  _module_id uuid,
  _title text,
  _description text DEFAULT NULL,
  _content_type text DEFAULT 'video',
  _content text DEFAULT NULL,
  _video_url text DEFAULT NULL,
  _video_platform text DEFAULT NULL,
  _video_id text DEFAULT NULL,
  _duration_seconds integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      AND c.instructor_id::text = v_uid::text
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
$$;

GRANT EXECUTE ON FUNCTION public.create_lesson(uuid, text, text, text, text, text, text, text, integer) TO authenticated;
