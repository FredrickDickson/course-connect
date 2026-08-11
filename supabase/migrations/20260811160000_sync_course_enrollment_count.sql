-- courses.enrollment_count existed but was never kept in sync after the
-- migration off the legacy course_enrollments table (client code was doing
-- N+1 client-side counts against course_enrollments, which no longer
-- exists, causing 404s on course-search/course-browser). Maintain the
-- counter via trigger on public.enrollments instead, and backfill it now.

CREATE OR REPLACE FUNCTION public.sync_course_enrollment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.courses SET enrollment_count = (
      SELECT COUNT(*) FROM public.enrollments
      WHERE course_id = OLD.course_id AND status != 'DROPPED'
    ) WHERE id = OLD.course_id;
    RETURN OLD;
  END IF;

  UPDATE public.courses SET enrollment_count = (
    SELECT COUNT(*) FROM public.enrollments
    WHERE course_id = NEW.course_id AND status != 'DROPPED'
  ) WHERE id = NEW.course_id;

  IF TG_OP = 'UPDATE' AND OLD.course_id IS DISTINCT FROM NEW.course_id THEN
    UPDATE public.courses SET enrollment_count = (
      SELECT COUNT(*) FROM public.enrollments
      WHERE course_id = OLD.course_id AND status != 'DROPPED'
    ) WHERE id = OLD.course_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.sync_course_enrollment_count() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enrollments_sync_course_count ON public.enrollments;
CREATE TRIGGER enrollments_sync_course_count
AFTER INSERT OR UPDATE OF status, course_id OR DELETE ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.sync_course_enrollment_count();

-- Backfill current counts
UPDATE public.courses c SET enrollment_count = (
  SELECT COUNT(*) FROM public.enrollments e
  WHERE e.course_id = c.id AND e.status != 'DROPPED'
);
