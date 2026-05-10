-- Populate pathway data for existing courses and enrollments
-- This migration updates existing records with pathway information

-- Update existing courses with pathway detection based on titles and tags
UPDATE courses
SET
  pathway = CASE
    WHEN title ILIKE '%mediation%' OR tags && ARRAY['mediation'] THEN 'mediation'
    WHEN title ILIKE '%arbitration%' OR tags && ARRAY['arbitration'] THEN 'arbitration'
    WHEN (title ILIKE '%mediation%' OR tags && ARRAY['mediation']) AND
         (title ILIKE '%arbitration%' OR tags && ARRAY['arbitration']) THEN 'both'
    ELSE 'general'
  END,
  pathway_tags = CASE
    WHEN title ILIKE '%mediation%' OR tags && ARRAY['mediation'] THEN
      (SELECT array_agg(DISTINCT x) FROM unnest(COALESCE(tags, ARRAY[]::TEXT[]) || ARRAY['mediation']) x)
    WHEN title ILIKE '%arbitration%' OR tags && ARRAY['arbitration'] THEN
      (SELECT array_agg(DISTINCT x) FROM unnest(COALESCE(tags, ARRAY[]::TEXT[]) || ARRAY['arbitration']) x)
    ELSE COALESCE(tags, ARRAY[]::TEXT[])
  END
WHERE pathway IS NULL OR pathway = 'general';

-- Update existing enrollments with pathway detection
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'course_enrollments') THEN
    UPDATE course_enrollments ce
    SET 
      pathway = c.pathway,
      pathway_detected_at = NOW()
    FROM courses c
    WHERE ce.course_id = c.id 
      AND (ce.pathway IS NULL OR ce.pathway = 'general');
  END IF;
END $$;

-- Create pathway progress records for existing active members
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'course_enrollments') THEN
    INSERT INTO pathway_progress (user_id, pathway, current_level, progress_percentage, courses_completed, total_courses_required)
    SELECT 
      m.user_id,
      CASE 
        WHEN COUNT(CASE WHEN ce.pathway = 'mediation' THEN 1 END) > 
             COUNT(CASE WHEN ce.pathway = 'arbitration' THEN 1 END) THEN 'mediation'
        WHEN COUNT(CASE WHEN ce.pathway = 'arbitration' THEN 1 END) > 
             COUNT(CASE WHEN ce.pathway = 'mediation' THEN 1 END) THEN 'arbitration'
        WHEN COUNT(CASE WHEN ce.pathway = 'arbitration' THEN 1 END) > 0 OR 
             COUNT(CASE WHEN ce.pathway = 'mediation' THEN 1 END) > 0 THEN 'both'
        ELSE 'general'
      END as primary_pathway,
      COALESCE(m.part, 'associate') as current_level,
      CASE 
        WHEN m.part = 'associate' THEN 33.33
        WHEN m.part = 'member' THEN 66.67
        WHEN m.part = 'fellow' THEN 100.00
        ELSE 0
      END as progress_percentage,
      ARRAY_AGG(DISTINCT ce.course_id) as courses_completed,
      CASE 
        WHEN m.part = 'associate' THEN 3
        WHEN m.part = 'member' THEN 6
        WHEN m.part = 'fellow' THEN 9
        ELSE 3
      END as total_courses_required
    FROM members m
    LEFT JOIN course_enrollments ce ON m.user_id = ce.user_id AND ce.status = 'ACTIVE'
    WHERE m.user_id NOT IN (SELECT user_id FROM pathway_progress)
      AND m.part IS NOT NULL
    GROUP BY m.user_id, m.part
    ON CONFLICT (user_id, pathway) DO NOTHING;
  END IF;
END $$;

-- Update members table with primary pathway
UPDATE members m
SET 
  primary_pathway = pp.pathway,
  pathway_confirmed_at = NOW()
FROM pathway_progress pp
WHERE m.user_id = pp.user_id
  AND m.primary_pathway IS NULL;

-- Create pathway certificates for existing members who have completed requirements
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'course_enrollments') THEN
    INSERT INTO pathway_certificates (user_id, pathway, level, post_nominal, issued_at, expires_at)
    SELECT
      m.user_id,
      pp.pathway,
      pp.current_level,
      CASE
        WHEN pp.pathway = 'arbitration' AND pp.current_level = 'associate' THEN 'ACIMArb'
        WHEN pp.pathway = 'arbitration' AND pp.current_level = 'member' THEN 'MCIMArb'
        WHEN pp.pathway = 'arbitration' AND pp.current_level = 'fellow' THEN 'FCIMArb'
        WHEN pp.pathway = 'mediation' AND pp.current_level = 'associate' THEN 'ACIMed'
        WHEN pp.pathway = 'mediation' AND pp.current_level = 'member' THEN 'MCIMed'
        WHEN pp.pathway = 'mediation' AND pp.current_level = 'fellow' THEN 'FCIMed'
        ELSE 'ACIM'
      END as post_nominal,
      NOW() as issued_at,
      CASE
        WHEN pp.current_level = 'associate' THEN NOW() + INTERVAL '2 years'
        WHEN pp.current_level = 'member' THEN NOW() + INTERVAL '3 years'
        WHEN pp.current_level = 'fellow' THEN NOW() + INTERVAL '5 years'
        ELSE NOW() + INTERVAL '2 years'
      END as expires_at
    FROM members m
    JOIN pathway_progress pp ON m.user_id = pp.user_id
    LEFT JOIN pathway_certificates pc ON m.user_id = pc.user_id AND pp.pathway = pc.pathway AND pp.current_level = pc.level
    WHERE m.part IS NOT NULL
      AND pp.current_level = m.part::text
      AND pc.id IS NULL
      AND pp.progress_percentage >= 100;
  END IF;
END $$;

-- Add indexes for better performance on the new data
CREATE INDEX IF NOT EXISTS idx_courses_pathway_status ON courses(pathway, is_published);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'course_enrollments') THEN
    CREATE INDEX IF NOT EXISTS idx_course_enrollments_pathway_status ON course_enrollments(pathway, status);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_pathway_progress_level_progress ON pathway_progress(current_level, progress_percentage);

-- Create function to automatically update pathway progress when courses are completed
CREATE OR REPLACE FUNCTION update_pathway_progress_on_enrollment()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or create pathway progress record
  INSERT INTO pathway_progress (user_id, pathway, current_level, progress_percentage, courses_completed, total_courses_required)
  VALUES (
    NEW.user_id,
    NEW.pathway,
    'associate',
    CASE 
      WHEN (SELECT COUNT(*) FROM course_enrollments WHERE user_id = NEW.user_id AND pathway = NEW.pathway AND status = 'ACTIVE') >= 1 THEN 33.33
      ELSE 0
    END,
    ARRAY[NEW.course_id],
    3
  )
  ON CONFLICT (user_id, pathway) 
  DO UPDATE SET
    courses_completed = array_distinct(pathway_progress.courses_completed || EXCLUDED.courses_completed),
    progress_percentage = CASE 
      WHEN array_length(array_distinct(pathway_progress.courses_completed || EXCLUDED.courses_completed), 1) >= 3 THEN 100.00
      WHEN array_length(array_distinct(pathway_progress.courses_completed || EXCLUDED.courses_completed), 1) >= 2 THEN 66.67
      WHEN array_length(array_distinct(pathway_progress.courses_completed || EXCLUDED.courses_completed), 1) >= 1 THEN 33.33
      ELSE 0
    END,
    last_updated_at = NOW();
  
  -- Update user's primary pathway if needed
  PERFORM update_user_primary_pathway(NEW.user_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update pathway progress on enrollment changes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'course_enrollments') THEN
    DROP TRIGGER IF EXISTS update_pathway_progress_trigger ON course_enrollments;
    CREATE TRIGGER update_pathway_progress_trigger
      AFTER INSERT OR UPDATE ON course_enrollments
      FOR EACH ROW
      EXECUTE FUNCTION update_pathway_progress_on_enrollment();
  END IF;
END $$;

-- Create view for user pathway summary
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'course_enrollments') THEN
    EXECUTE 'CREATE OR REPLACE VIEW user_pathway_summary AS
    SELECT 
      u.id as user_id,
      u.first_name,
      u.last_name,
      u.email,
      COALESCE(m.primary_pathway, ''general'') as primary_pathway,
      COALESCE(m.part::text, ''NONE'') as current_level,
      pp_arbitration.current_level as arbitration_level,
      pp_arbitration.progress_percentage as arbitration_progress,
      pp_mediation.current_level as mediation_level,
      pp_mediation.progress_percentage as mediation_progress,
      COUNT(DISTINCT ce.course_id) as total_enrollments,
      COUNT(DISTINCT CASE WHEN ce.pathway = ''arbitration'' THEN ce.course_id END) as arbitration_enrollments,
      COUNT(DISTINCT CASE WHEN ce.pathway = ''mediation'' THEN ce.course_id END) as mediation_enrollments,
      COUNT(DISTINCT pc.id) as certificates_count
    FROM users u
    LEFT JOIN members m ON u.id = m.user_id
    LEFT JOIN pathway_progress pp_arbitration ON u.id = pp_arbitration.user_id AND pp_arbitration.pathway = ''arbitration''
    LEFT JOIN pathway_progress pp_mediation ON u.id = pp_mediation.user_id AND pp_mediation.pathway = ''mediation''
    LEFT JOIN course_enrollments ce ON u.id = ce.user_id AND ce.status = ''ACTIVE''
    LEFT JOIN pathway_certificates pc ON u.id = pc.user_id
    GROUP BY u.id, u.first_name, u.last_name, u.email, m.primary_pathway, m.part, 
             pp_arbitration.current_level, pp_arbitration.progress_percentage,
             pp_mediation.current_level, pp_mediation.progress_percentage';
  END IF;
END $$;

-- Grant permissions for the new view
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_pathway_summary') THEN
    GRANT SELECT ON user_pathway_summary TO authenticated;
  END IF;
END $$;

-- Add comments for documentation
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'user_pathway_summary') THEN
    COMMENT ON VIEW user_pathway_summary IS 'Comprehensive view of user pathway information including progress and certificates';
  END IF;
END $$;
COMMENT ON FUNCTION update_pathway_progress_on_enrollment() IS 'Automatically updates pathway progress when enrollments change';

-- Log the migration completion
DO $$
BEGIN
  RAISE NOTICE 'Pathway data population completed successfully';
  RAISE NOTICE 'Updated % courses with pathway information', (SELECT COUNT(*) FROM courses WHERE pathway IS NOT NULL);
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'course_enrollments') THEN
    RAISE NOTICE 'Updated % enrollments with pathway information', (SELECT COUNT(*) FROM course_enrollments WHERE pathway IS NOT NULL);
  ELSE
    RAISE NOTICE 'course_enrollments table does not exist, skipping enrollment update';
  END IF;
  RAISE NOTICE 'Created % pathway progress records', (SELECT COUNT(*) FROM pathway_progress);
  RAISE NOTICE 'Created % pathway certificates', (SELECT COUNT(*) FROM pathway_certificates);
END $$;
