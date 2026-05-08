-- Migration: Unify progress tracking to single source of truth
-- This migration makes the 'progress' table the single source of truth for lesson completion
-- and derives enrollment progress automatically via triggers

-- Function to calculate enrollment progress based on completed lessons
CREATE OR REPLACE FUNCTION calculate_enrollment_progress(course_id uuid, user_id varchar)
RETURNS numeric(5,2) AS $$
DECLARE
  total_lessons integer;
  completed_lessons integer;
  progress_percent numeric(5,2);
BEGIN
  -- Count total lessons in the course
  SELECT COUNT(l.id)
  INTO total_lessons
  FROM lessons l
  JOIN modules m ON l.module_id = m.id
  WHERE m.course_id = calculate_enrollment_progress.course_id;

  -- If no lessons, return 0
  IF total_lessons = 0 THEN
    RETURN 0;
  END IF;

  -- Count completed lessons for this user
  SELECT COUNT(p.id)
  INTO completed_lessons
  FROM progress p
  JOIN lessons l ON p.lesson_id = l.id
  JOIN modules m ON l.module_id = m.id
  WHERE m.course_id = calculate_enrollment_progress.course_id
  AND p.user_id = calculate_enrollment_progress.user_id
  AND p.completed = true;

  -- Calculate percentage
  progress_percent := (completed_lessons::numeric / total_lessons::numeric) * 100;
  
  RETURN ROUND(progress_percent, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to update enrollment progress when progress changes
CREATE OR REPLACE FUNCTION update_enrollment_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the corresponding enrollment's progress
  UPDATE enrollments e
  SET progress = calculate_enrollment_progress(
    (SELECT m.course_id 
     FROM lessons l 
     JOIN modules m ON l.module_id = m.id 
     WHERE l.id = NEW.lesson_id),
    NEW.user_id
  ),
  -- Update completed_at if progress reaches 100%
  completed_at = CASE 
    WHEN calculate_enrollment_progress(
      (SELECT m.course_id 
       FROM lessons l 
       JOIN modules m ON l.module_id = m.id 
       WHERE l.id = NEW.lesson_id),
      NEW.user_id
    ) = 100 THEN COALESCE(completed_at, NOW())
    ELSE completed_at
  END
  WHERE e.course_id = (
    SELECT m.course_id 
    FROM lessons l 
    JOIN modules m ON l.module_id = m.id 
    WHERE l.id = NEW.lesson_id
  )
  AND e.user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for progress table
DROP TRIGGER IF EXISTS on_progress_change ON progress;
CREATE TRIGGER on_progress_change
AFTER INSERT OR UPDATE OF completed ON progress
FOR EACH ROW
EXECUTE FUNCTION update_enrollment_progress();

-- Function to recalculate all enrollment progress (for data migration)
CREATE OR REPLACE FUNCTION recalculate_all_enrollment_progress()
RETURNS void AS $$
BEGIN
  UPDATE enrollments e
  SET progress = calculate_enrollment_progress(e.course_id, e.user_id::text),
      completed_at = CASE 
        WHEN calculate_enrollment_progress(e.course_id, e.user_id::text) = 100 
        THEN COALESCE(e.completed_at, NOW())
        ELSE NULL
      END;
END;
$$ LANGUAGE plpgsql;

-- Recalculate existing enrollment progress
SELECT recalculate_all_enrollment_progress();

-- Add comment to document the single source of truth pattern
COMMENT ON TABLE progress IS 'Single source of truth for lesson completion. Enrollment progress is derived automatically via triggers.';
COMMENT ON COLUMN enrollments.progress IS 'Automatically calculated from progress table via triggers. Do not update manually.';
