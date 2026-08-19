-- Atomic module creation, mirroring create_lesson's pattern.
-- Fixes a race condition where the client computed the next `order` via a
-- separate SELECT MAX(order) followed by an INSERT: concurrent/rapid
-- "Add Section" attempts could all read the same MAX(order) and insert
-- duplicate order values, making new sections look like they never appeared.
CREATE OR REPLACE FUNCTION public.create_module(_course_id uuid, _title text, _description text DEFAULT NULL)
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
    SELECT 1 FROM public.courses c
    WHERE c.id = _course_id
      AND (c.instructor_id::text = v_uid::text OR public.is_admin(v_uid::text))
  ) INTO v_owns;

  IF NOT v_owns THEN
    RAISE EXCEPTION 'You do not own this course' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(MAX("order"), 0) + 1 INTO v_next_order
  FROM public.modules WHERE course_id = _course_id;

  INSERT INTO public.modules (course_id, title, description, "order")
  VALUES (_course_id, _title, _description, v_next_order)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_module(uuid, text, text) TO authenticated;
