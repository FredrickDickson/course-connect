-- ============================================
-- FIX: Update enrollment_count in courses table
-- ============================================

-- Step 1: Update all existing enrollment counts
UPDATE courses
SET enrollment_count = (
  SELECT COUNT(*)
  FROM enrollments
  WHERE enrollments.course_id = courses.id
  AND enrollments.status = 'active'
);

-- Step 2: Verify the update worked
SELECT 
  c.id,
  c.title,
  c.enrollment_count as updated_count,
  (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id AND status = 'active') as actual_count
FROM courses
ORDER BY c.created_at DESC
LIMIT 10;

-- Step 3: Create or replace function to update enrollment count
CREATE OR REPLACE FUNCTION update_course_enrollment_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the course's enrollment_count
  UPDATE courses
  SET enrollment_count = (
    SELECT COUNT(*)
    FROM enrollments
    WHERE course_id = COALESCE(NEW.course_id, OLD.course_id)
    AND status = 'active'
  )
  WHERE id = COALESCE(NEW.course_id, OLD.course_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Step 4: Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_enrollment_count ON enrollments;

-- Step 5: Create trigger for INSERT
CREATE TRIGGER trigger_update_enrollment_count
AFTER INSERT OR UPDATE OR DELETE ON enrollments
FOR EACH ROW
EXECUTE FUNCTION update_course_enrollment_count();

-- Step 6: Verify triggers are in place
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'enrollments'
AND trigger_name = 'trigger_update_enrollment_count';

-- Final verification
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Updated enrollment counts for all courses';
  RAISE NOTICE '✅ Created function: update_course_enrollment_count()';
  RAISE NOTICE '✅ Created trigger: trigger_update_enrollment_count';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Enrollment counts will now update automatically!';
  RAISE NOTICE '';
END $$;
