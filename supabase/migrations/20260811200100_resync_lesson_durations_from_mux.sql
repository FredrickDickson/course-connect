-- A client-side bug in LectureContentEditor was overwriting lessons.duration_seconds
-- with null on every "Save Lecture" click for Mux-sourced videos, even after the
-- webhook/mux-asset-status had correctly written the real duration to mux_assets.
-- A similar backfill ran in May but every lecture saved since then hit the bug
-- again, so re-sync from mux_assets (the source of truth reported by Mux) now
-- that the client-side bug is fixed.
UPDATE public.lessons l
SET duration_seconds = m.duration_seconds
FROM public.mux_assets m
WHERE m.lesson_id = l.id
  AND m.duration_seconds > 0
  AND (l.duration_seconds IS NULL OR l.duration_seconds = 0);
