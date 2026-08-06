UPDATE public.lessons l
SET duration_seconds = ma.duration_seconds
FROM public.mux_assets ma
WHERE ma.lesson_id = l.id
  AND ma.duration_seconds IS NOT NULL
  AND ma.duration_seconds > 0
  AND (l.duration_seconds IS NULL OR l.duration_seconds = 0)
  AND l.mux_playback_id IS NOT NULL;