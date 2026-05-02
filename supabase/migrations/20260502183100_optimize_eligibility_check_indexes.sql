-- Optimize eligibility check performance with targeted indexes
-- These indexes significantly speed up the parallel queries in check-eligibility.ts

-- Index for track_progress lookups (user_id, track) - used in getTrackLevel
CREATE INDEX IF NOT EXISTS idx_track_progress_user_track 
ON track_progress(user_id, track);

-- Index for enrollment checks (user_id, course_id) - used in getEnrollment
CREATE INDEX IF NOT EXISTS idx_enrollments_user_course 
ON enrollments(user_id, course_id);

-- Index for course lookups by id - used in course fetch
CREATE INDEX IF NOT EXISTS idx_courses_id 
ON courses(id);

-- Index for user lookups by id - used in user fetch
CREATE INDEX IF NOT EXISTS idx_users_id 
ON users(id);

-- Composite index for active enrollments (optimizes already enrolled check)
CREATE INDEX IF NOT EXISTS idx_enrollments_user_course_status 
ON enrollments(user_id, course_id, status) 
WHERE status IN ('ACTIVE', 'PENDING_APPROVAL', 'APPROVED');
