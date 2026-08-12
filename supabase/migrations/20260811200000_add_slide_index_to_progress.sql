-- The `progress` table only ever had `watch_time_seconds`, designed for video
-- playback position. Presentation lessons were bolted on later and reused
-- that same column to store a slide index, corrupting anything that reads
-- `watch_time_seconds` expecting real seconds (resume toast, total study
-- hours). Give presentations their own column and migrate existing rows.
ALTER TABLE public.progress
  ADD COLUMN slide_index integer;

UPDATE public.progress p
SET slide_index = p.watch_time_seconds,
    watch_time_seconds = 0
FROM public.lessons l
WHERE l.id = p.lesson_id
  AND l.content_type = 'presentation'
  AND p.slide_index IS NULL;
