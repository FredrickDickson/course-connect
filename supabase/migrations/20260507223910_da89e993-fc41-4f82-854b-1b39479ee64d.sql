CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_full_name text;
  v_first text;
  v_last text;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '');
  v_first := COALESCE(
    NEW.raw_user_meta_data->>'first_name',
    NULLIF(split_part(v_full_name, ' ', 1), ''),
    split_part(NEW.email, '@', 1),
    'User'
  );
  v_last := COALESCE(
    NEW.raw_user_meta_data->>'last_name',
    NULLIF(NULLIF(regexp_replace(v_full_name, '^\S+\s*', ''), ''), v_full_name),
    ''
  );

  -- Ensure public.users row exists before any FK-dependent inserts run
  INSERT INTO public.users (id, email, first_name, last_name, role, profile_image_url, created_at, updated_at)
  VALUES (
    NEW.id,
    LOWER(COALESCE(NEW.email, '')),
    v_first,
    v_last,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    NEW.raw_user_meta_data->>'avatar_url',
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Initialize track_progress (safe now that public.users exists)
  INSERT INTO public.track_progress (user_id, track, level, pathway)
  VALUES
    (NEW.id, 'ARBITRATION', 'NONE', 'STANDARD'),
    (NEW.id, 'MEDIATION', 'NONE', 'STANDARD')
  ON CONFLICT (user_id, track) DO NOTHING;

  RETURN NEW;
END;
$function$;