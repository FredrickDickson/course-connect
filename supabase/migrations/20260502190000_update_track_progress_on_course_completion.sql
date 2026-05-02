-- Update track_progress.level when enrollment status becomes COMPLETED
-- This ensures that completing a course automatically updates the user's level
-- and unlocks the next level courses in the eligibility check

CREATE OR REPLACE FUNCTION update_track_progress_on_enrollment_completion()
RETURNS TRIGGER AS $$
DECLARE
  course_level TEXT;
  course_track TEXT;
  current_level TEXT;
  new_level TEXT;
BEGIN
  -- Only proceed when status changes to COMPLETED
  IF NEW.status != 'COMPLETED' OR (OLD.status = 'COMPLETED') THEN
    RETURN NEW;
  END IF;

  -- Get course details
  SELECT c.level, c.track INTO course_level, course_track
  FROM courses c
  WHERE c.id = NEW.course_id;

  -- If course doesn't have level/track, do nothing
  IF course_level IS NULL OR course_track IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get current track progress level
  SELECT level INTO current_level
  FROM track_progress
  WHERE user_id = NEW.user_id AND track = course_track;

  -- Normalize levels for comparison
  course_level := UPPER(course_level);
  current_level := COALESCE(UPPER(current_level), 'NONE');

  -- Determine new level (only upgrade, never downgrade)
  -- If course is ASSOCIATE and current is NONE, upgrade to ASSOCIATE
  -- If course is MEMBER and current is ASSOCIATE or NONE, upgrade to MEMBER
  -- If course is FELLOW and current is MEMBER or lower, upgrade to FELLOW
  IF course_level = 'ASSOCIATE' AND current_level = 'NONE' THEN
    new_level := 'ASSOCIATE';
  ELSIF course_level = 'MEMBER' AND current_level IN ('NONE', 'ASSOCIATE') THEN
    new_level := 'MEMBER';
  ELSIF course_level = 'FELLOW' AND current_level IN ('NONE', 'ASSOCIATE', 'MEMBER') THEN
    new_level := 'FELLOW';
  ELSE
    -- No upgrade needed
    RETURN NEW;
  END IF;

  -- Update track_progress with new level
  UPDATE track_progress
  SET level = new_level,
      updated_at = NOW()
  WHERE user_id = NEW.user_id AND track = course_track;

  RAISE NOTICE 'Updated track_progress for user %, track % from % to %',
    NEW.user_id, course_track, current_level, new_level;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_enrollment_status_change ON enrollments;

-- Create trigger to update track_progress on enrollment completion
CREATE TRIGGER on_enrollment_status_change
  AFTER UPDATE OF status ON enrollments
  FOR EACH ROW
  WHEN (NEW.status = 'COMPLETED')
  EXECUTE FUNCTION update_track_progress_on_enrollment_completion();

COMMENT ON FUNCTION update_track_progress_on_enrollment_completion() IS 
'Automatically updates track_progress.level when a user completes a course, enabling progression through the qualification pathway.';
