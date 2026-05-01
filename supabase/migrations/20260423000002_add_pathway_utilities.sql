-- Add utility functions and views for pathway management
-- This migration adds helpful functions for pathway operations and analytics

-- Function to get user's pathway post-nominals
CREATE OR REPLACE FUNCTION get_user_post_nominal(user_uuid UUID, pathway TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  user_level TEXT;
  user_pathway TEXT;
  post_nominal TEXT;
BEGIN
  -- Get user's current level from members table
  SELECT part INTO user_level
  FROM members
  WHERE user_id = user_uuid;
  
  -- Determine pathway
  IF pathway IS NOT NULL THEN
    user_pathway := pathway;
  ELSE
    SELECT COALESCE(primary_pathway, 'general') INTO user_pathway
    FROM members
    WHERE user_id = user_uuid;
  END IF;
  
  -- Return appropriate post-nominal
  post_nominal := CASE 
    WHEN user_pathway = 'arbitration' AND user_level = 'associate' THEN 'ACIMArb'
    WHEN user_pathway = 'arbitration' AND user_level = 'member' THEN 'MCIMArb'
    WHEN user_pathway = 'arbitration' AND user_level = 'fellow' THEN 'FCIMArb'
    WHEN user_pathway = 'mediation' AND user_level = 'associate' THEN 'ACIMed'
    WHEN user_pathway = 'mediation' AND user_level = 'member' THEN 'MCIMed'
    WHEN user_pathway = 'mediation' AND user_level = 'fellow' THEN 'FCIMed'
    WHEN user_level = 'associate' THEN 'ACIM'
    WHEN user_level = 'member' THEN 'MCIM'
    WHEN user_level = 'fellow' THEN 'FCIM'
    ELSE ''
  END;
  
  RETURN post_nominal;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user is eligible for next level
CREATE OR REPLACE FUNCTION check_next_level_eligibility(user_uuid UUID, pathway TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  current_progress NUMERIC;
  required_courses INTEGER;
  completed_courses INTEGER;
BEGIN
  -- Get current progress
  SELECT progress_percentage, array_length(courses_completed, 1), total_courses_required
  INTO current_progress, completed_courses, required_courses
  FROM pathway_progress
  WHERE user_id = user_uuid AND pathway = pathway;
  
  -- Check if eligible (100% progress and all required courses completed)
  RETURN current_progress >= 100.00 
         AND completed_courses >= required_courses;
END;
$$ LANGUAGE plpgsql;

-- Function to get pathway requirements
CREATE OR REPLACE FUNCTION get_pathway_requirements(pathway TEXT, level TEXT)
RETURNS JSONB AS $$
DECLARE
  requirements JSONB;
BEGIN
  requirements := CASE 
    WHEN pathway = 'arbitration' AND level = 'associate' THEN 
      '{"courses": 3, "hours": 120, "description": "Complete 3 arbitration courses totaling 120 hours"}'::JSONB
    WHEN pathway = 'arbitration' AND level = 'member' THEN 
      '{"courses": 6, "hours": 240, "description": "Complete 6 arbitration courses totaling 240 hours"}'::JSONB
    WHEN pathway = 'arbitration' AND level = 'fellow' THEN 
      '{"courses": 9, "hours": 360, "description": "Complete 9 arbitration courses totaling 360 hours"}'::JSONB
    WHEN pathway = 'mediation' AND level = 'associate' THEN 
      '{"courses": 3, "hours": 120, "description": "Complete 3 mediation courses totaling 120 hours"}'::JSONB
    WHEN pathway = 'mediation' AND level = 'member' THEN 
      '{"courses": 6, "hours": 240, "description": "Complete 6 mediation courses totaling 240 hours"}'::JSONB
    WHEN pathway = 'mediation' AND level = 'fellow' THEN 
      '{"courses": 9, "hours": 360, "description": "Complete 9 mediation courses totaling 360 hours"}'::JSONB
    ELSE 
      '{"courses": 0, "hours": 0, "description": "No requirements specified"}'::JSONB
  END;
  
  RETURN requirements;
END;
$$ LANGUAGE plpgsql;

-- Function to suggest next courses for user
CREATE OR REPLACE FUNCTION suggest_next_courses(user_uuid UUID, pathway TEXT, limit_count INTEGER DEFAULT 3)
RETURNS TABLE (
  course_id UUID,
  title TEXT,
  description TEXT,
  level TEXT,
  duration_hours INTEGER,
  pathway_match_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.title,
    c.description,
    c.level,
    c.duration_hours,
    CASE 
      WHEN c.pathway = pathway THEN 1.0
      WHEN c.pathway = 'both' THEN 0.8
      WHEN c.tags && ARRAY[pathway] THEN 0.7
      ELSE 0.5
    END as pathway_match_score
  FROM courses c
  WHERE c.is_published = true
    AND c.id NOT IN (
      SELECT unnest(courses_completed) 
      FROM pathway_progress 
      WHERE user_id = user_uuid AND pathway = pathway
    )
    AND (
      c.pathway = pathway 
      OR c.pathway = 'both'
      OR c.tags && ARRAY[pathway]
    )
  ORDER BY pathway_match_score DESC, c.level ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create comprehensive pathway dashboard view
CREATE OR REPLACE VIEW pathway_dashboard AS
SELECT 
  u.id as user_id,
  u.first_name,
  u.last_name,
  u.email,
  COALESCE(m.part, 'NONE') as current_level,
  COALESCE(m.primary_pathway, 'general') as primary_pathway,
  
  -- Arbitration progress
  COALESCE(pp_arb.current_level, 'none') as arbitration_level,
  COALESCE(pp_arb.progress_percentage, 0) as arbitration_progress,
  COALESCE(array_length(pp_arb.courses_completed, 1), 0) as arbitration_courses_completed,
  COALESCE(pp_arb.total_courses_required, 3) as arbitration_courses_required,
  check_next_level_eligibility(u.id, 'arbitration') as arbitration_eligible_for_next,
  
  -- Mediation progress
  COALESCE(pp_med.current_level, 'none') as mediation_level,
  COALESCE(pp_med.progress_percentage, 0) as mediation_progress,
  COALESCE(array_length(pp_med.courses_completed, 1), 0) as mediation_courses_completed,
  COALESCE(pp_med.total_courses_required, 3) as mediation_courses_required,
  check_next_level_eligibility(u.id, 'mediation') as mediation_eligible_for_next,
  
  -- Overall stats
  COUNT(DISTINCT ce.course_id) as total_enrollments,
  COUNT(DISTINCT CASE WHEN ce.pathway = 'arbitration' THEN ce.course_id END) as arbitration_enrollments,
  COUNT(DISTINCT CASE WHEN ce.pathway = 'mediation' THEN ce.course_id END) as mediation_enrollments,
  COUNT(DISTINCT pc.id) as total_certificates,
  COUNT(DISTINCT CASE WHEN pc.pathway = 'arbitration' THEN pc.id END) as arbitration_certificates,
  COUNT(DISTINCT CASE WHEN pc.pathway = 'mediation' THEN pc.id END) as mediation_certificates,
  
  -- Post-nominals
  get_user_post_nominal(u.id, m.primary_pathway) as current_post_nominal,
  get_user_post_nominal(u.id, 'arbitration') as arbitration_post_nominal,
  get_user_post_nominal(u.id, 'mediation') as mediation_post_nominal,
  
  -- Last activity
  MAX(ce.enrolled_at) as last_enrollment_date,
  MAX(pc.issued_at) as last_certificate_date

FROM users u
LEFT JOIN members m ON u.id = m.user_id
LEFT JOIN pathway_progress pp_arb ON u.id = pp_arb.user_id AND pp_arb.pathway = 'arbitration'
LEFT JOIN pathway_progress pp_med ON u.id = pp_med.user_id AND pp_med.pathway = 'mediation'
LEFT JOIN course_enrollments ce ON u.id = ce.user_id AND ce.status = 'ACTIVE'
LEFT JOIN pathway_certificates pc ON u.id = pc.user_id
GROUP BY u.id, u.first_name, u.last_name, u.email, m.part, m.primary_pathway, 
         pp_arb.current_level, pp_arb.progress_percentage, pp_arb.courses_completed, pp_arb.total_courses_required,
         pp_med.current_level, pp_med.progress_percentage, pp_med.courses_completed, pp_med.total_courses_required;

-- Create pathway statistics view
CREATE OR REPLACE VIEW pathway_statistics AS
SELECT 
  'arbitration' as pathway,
  COUNT(DISTINCT pp.user_id) as total_users,
  COUNT(DISTINCT CASE WHEN pp.current_level = 'associate' THEN pp.user_id END) as associates,
  COUNT(DISTINCT CASE WHEN pp.current_level = 'member' THEN pp.user_id END) as members,
  COUNT(DISTINCT CASE WHEN pp.current_level = 'fellow' THEN pp.user_id END) as fellows,
  AVG(pp.progress_percentage) as avg_progress,
  COUNT(DISTINCT pc.id) as certificates_issued,
  COUNT(DISTINCT CASE WHEN pc.level = 'associate' THEN pc.id END) as associate_certificates,
  COUNT(DISTINCT CASE WHEN pc.level = 'member' THEN pc.id END) as member_certificates,
  COUNT(DISTINCT CASE WHEN pc.level = 'fellow' THEN pc.id END) as fellow_certificates
FROM pathway_progress pp
LEFT JOIN pathway_certificates pc ON pp.user_id = pc.user_id AND pc.pathway = 'arbitration'
WHERE pp.pathway = 'arbitration'

UNION ALL

SELECT 
  'mediation' as pathway,
  COUNT(DISTINCT pp.user_id) as total_users,
  COUNT(DISTINCT CASE WHEN pp.current_level = 'associate' THEN pp.user_id END) as associates,
  COUNT(DISTINCT CASE WHEN pp.current_level = 'member' THEN pp.user_id END) as members,
  COUNT(DISTINCT CASE WHEN pp.current_level = 'fellow' THEN pp.user_id END) as fellows,
  AVG(pp.progress_percentage) as avg_progress,
  COUNT(DISTINCT pc.id) as certificates_issued,
  COUNT(DISTINCT CASE WHEN pc.level = 'associate' THEN pc.id END) as associate_certificates,
  COUNT(DISTINCT CASE WHEN pc.level = 'member' THEN pc.id END) as member_certificates,
  COUNT(DISTINCT CASE WHEN pc.level = 'fellow' THEN pc.id END) as fellow_certificates
FROM pathway_progress pp
LEFT JOIN pathway_certificates pc ON pp.user_id = pc.user_id AND pc.pathway = 'mediation'
WHERE pp.pathway = 'mediation';

-- Function to generate pathway report
CREATE OR REPLACE FUNCTION generate_pathway_report(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  report JSONB;
BEGIN
  SELECT jsonb_build_object(
    'user_id', user_uuid,
    'primary_pathway', COALESCE(m.primary_pathway, 'general'),
    'current_level', COALESCE(m.part, 'NONE'),
    'current_post_nominal', get_user_post_nominal(user_uuid, m.primary_pathway),
    'arbitration', jsonb_build_object(
      'level', COALESCE(pp_arb.current_level, 'none'),
      'progress', COALESCE(pp_arb.progress_percentage, 0),
      'courses_completed', COALESCE(array_length(pp_arb.courses_completed, 1), 0),
      'courses_required', COALESCE(pp_arb.total_courses_required, 3),
      'eligible_for_next', check_next_level_eligibility(user_uuid, 'arbitration'),
      'post_nominal', get_user_post_nominal(user_uuid, 'arbitration'),
      'certificates', (SELECT COUNT(*) FROM pathway_certificates WHERE user_id = user_uuid AND pathway = 'arbitration')
    ),
    'mediation', jsonb_build_object(
      'level', COALESCE(pp_med.current_level, 'none'),
      'progress', COALESCE(pp_med.progress_percentage, 0),
      'courses_completed', COALESCE(array_length(pp_med.courses_completed, 1), 0),
      'courses_required', COALESCE(pp_med.total_courses_required, 3),
      'eligible_for_next', check_next_level_eligibility(user_uuid, 'mediation'),
      'post_nominal', get_user_post_nominal(user_uuid, 'mediation'),
      'certificates', (SELECT COUNT(*) FROM pathway_certificates WHERE user_id = user_uuid AND pathway = 'mediation')
    ),
    'total_enrollments', (SELECT COUNT(*) FROM course_enrollments WHERE user_id = user_uuid AND status = 'ACTIVE'),
    'total_certificates', (SELECT COUNT(*) FROM pathway_certificates WHERE user_id = user_uuid),
    'suggested_courses', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', course_id,
          'title', title,
          'level', level,
          'match_score', pathway_match_score
        )
      )
      FROM suggest_next_courses(user_uuid, COALESCE(m.primary_pathway, 'arbitration'), 3)
    )
  ) INTO report
  FROM members m
  LEFT JOIN pathway_progress pp_arb ON user_uuid = pp_arb.user_id AND pp_arb.pathway = 'arbitration'
  LEFT JOIN pathway_progress pp_med ON user_uuid = pp_med.user_id AND pp_med.pathway = 'mediation'
  WHERE m.user_id = user_uuid;
  
  RETURN COALESCE(report, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for new functions and views
GRANT EXECUTE ON FUNCTION get_user_post_nominal(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_next_level_eligibility(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pathway_requirements(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION suggest_next_courses(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_pathway_report(UUID) TO authenticated;

GRANT SELECT ON pathway_dashboard TO authenticated;
GRANT SELECT ON pathway_statistics TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION get_user_post_nominal(UUID, TEXT) IS 'Returns the appropriate post-nominal for a user based on their level and pathway';
COMMENT ON FUNCTION check_next_level_eligibility(UUID, TEXT) IS 'Checks if user is eligible for next level in specified pathway';
COMMENT ON FUNCTION get_pathway_requirements(TEXT, TEXT) IS 'Returns requirements for a specific pathway and level';
COMMENT ON FUNCTION suggest_next_courses(UUID, TEXT, INTEGER) IS 'Suggests next courses for user to complete in their pathway';
COMMENT ON FUNCTION generate_pathway_report(UUID) IS 'Generates comprehensive pathway report for a user';
COMMENT ON VIEW pathway_dashboard IS 'Comprehensive dashboard view for pathway information';
COMMENT ON VIEW pathway_statistics IS 'Statistics view for pathway analytics';

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Pathway utilities migration completed successfully';
  RAISE NOTICE 'Created % utility functions', 5;
  RAISE NOTICE 'Created % analytical views', 2;
END $$;
