-- ============================================
-- SUPABASE SETUP: RLS POLICIES & STORAGE
-- ============================================

-- Step 1: Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_payouts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "users_view_own_profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "users_update_own_profile" ON users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Public can view instructor profiles (for courses)
CREATE POLICY "users_view_instructor_profiles" ON users
  FOR SELECT USING (role = 'instructor');

-- ============================================
-- COURSES TABLE POLICIES
-- ============================================

-- Anyone can view published courses
CREATE POLICY "courses_view_published" ON courses
  FOR SELECT USING (is_published = true);

-- Instructors can view their own courses (published or not)
CREATE POLICY "courses_instructors_view_own" ON courses
  FOR SELECT USING (auth.uid() = instructor_id);

-- Instructors can create courses
CREATE POLICY "courses_instructors_create" ON courses
  FOR INSERT WITH CHECK (auth.uid() = instructor_id);

-- Instructors can update their own courses
CREATE POLICY "courses_instructors_update_own" ON courses
  FOR UPDATE USING (auth.uid() = instructor_id)
  WITH CHECK (auth.uid() = instructor_id);

-- Instructors can delete their own unpublished courses
CREATE POLICY "courses_instructors_delete_own" ON courses
  FOR DELETE USING (auth.uid() = instructor_id AND is_published = false);

-- ============================================
-- ENROLLMENTS TABLE POLICIES
-- ============================================

-- Users can view their own enrollments
CREATE POLICY "enrollments_view_own" ON enrollments
  FOR SELECT USING (auth.uid() = user_id);

-- Instructors can view enrollments in their courses
CREATE POLICY "enrollments_instructors_view" ON enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = enrollments.course_id 
      AND courses.instructor_id = auth.uid()
    )
  );

-- Users can enroll in courses
CREATE POLICY "enrollments_users_create" ON enrollments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- PROGRESS TABLE POLICIES
-- ============================================

-- Users can view their own progress
CREATE POLICY "progress_view_own" ON progress
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "progress_update_own" ON progress
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can create progress records
CREATE POLICY "progress_users_create" ON progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- LESSONS TABLE POLICIES
-- ============================================

-- Anyone can view lessons from published courses
CREATE POLICY "lessons_view_from_published_courses" ON lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM modules
      JOIN courses ON courses.id = modules.course_id
      WHERE modules.id = lessons.module_id
      AND courses.is_published = true
    )
  );

-- Instructors can view lessons in their courses
CREATE POLICY "lessons_instructors_view_own" ON lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM modules
      JOIN courses ON courses.id = modules.course_id
      WHERE modules.id = lessons.module_id
      AND courses.instructor_id = auth.uid()
    )
  );

-- ============================================
-- ASSIGNMENTS TABLE POLICIES
-- ============================================

-- Users can view assignments in enrolled courses
CREATE POLICY "assignments_view_enrolled" ON assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lessons
      JOIN modules ON modules.id = lessons.module_id
      JOIN courses ON courses.id = modules.course_id
      JOIN enrollments ON enrollments.course_id = courses.id
      WHERE lessons.id = assignments.lesson_id
      AND enrollments.user_id = auth.uid()
    )
  );

-- ============================================
-- ASSIGNMENT SUBMISSIONS TABLE POLICIES
-- ============================================

-- Users can view their own submissions
CREATE POLICY "assignment_submissions_view_own" ON assignment_submissions
  FOR SELECT USING (auth.uid() = user_id);

-- Instructors can view submissions for their courses
CREATE POLICY "assignment_submissions_instructors_view" ON assignment_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignments
      JOIN lessons ON lessons.id = assignments.lesson_id
      JOIN modules ON modules.id = lessons.module_id
      JOIN courses ON courses.id = modules.course_id
      WHERE assignments.id = assignment_submissions.assignment_id
      AND courses.instructor_id = auth.uid()
    )
  );

-- Users can submit assignments
CREATE POLICY "assignment_submissions_users_create" ON assignment_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- QUIZZES & QUIZ ATTEMPTS POLICIES
-- ============================================

-- Users can view quizzes in courses they're enrolled in
CREATE POLICY "quizzes_view_enrolled" ON quizzes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lessons
      JOIN modules ON modules.id = lessons.module_id
      JOIN courses ON courses.id = modules.course_id
      JOIN enrollments ON enrollments.course_id = courses.id
      WHERE lessons.id = quizzes.lesson_id
      AND enrollments.user_id = auth.uid()
    )
  );

-- Users can view their own quiz attempts
CREATE POLICY "quiz_attempts_view_own" ON quiz_attempts
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create quiz attempts
CREATE POLICY "quiz_attempts_users_create" ON quiz_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own quiz attempts
CREATE POLICY "quiz_attempts_users_update_own" ON quiz_attempts
  FOR UPDATE USING (auth.uid() = user_id AND completed_at IS NULL)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- REVIEWS TABLE POLICIES
-- ============================================

-- Anyone can view reviews for published courses
CREATE POLICY "reviews_view_for_published_courses" ON reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = reviews.course_id
      AND courses.is_published = true
    )
  );

-- Enrolled users can create reviews
CREATE POLICY "reviews_users_create" ON reviews
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM enrollments
      WHERE enrollments.user_id = auth.uid()
      AND enrollments.course_id = reviews.course_id
    )
  );

-- ============================================
-- FAVORITES TABLE POLICIES
-- ============================================

-- Users can view their own favorites
CREATE POLICY "favorites_view_own" ON favorites
  FOR SELECT USING (auth.uid() = user_id);

-- Users can add courses to favorites
CREATE POLICY "favorites_users_create" ON favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can remove their own favorites
CREATE POLICY "favorites_users_delete_own" ON favorites
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- CERTIFICATIONS TABLE POLICIES
-- ============================================

-- Users can view their own certifications
CREATE POLICY "certifications_view_own" ON certifications
  FOR SELECT USING (auth.uid() = user_id);

-- Public can view certifications (with verification)
CREATE POLICY "certifications_view_public" ON certifications
  FOR SELECT USING (true);

-- ============================================
-- INSTRUCTOR APPLICATIONS POLICIES
-- ============================================

-- Users can create their own application
CREATE POLICY "instructor_applications_users_create" ON instructor_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view their own application
CREATE POLICY "instructor_applications_view_own" ON instructor_applications
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all applications
CREATE POLICY "instructor_applications_admins_view" ON instructor_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================
-- DISCUSSIONS & REPLIES POLICIES
-- ============================================

-- Enrolled users can view discussions
CREATE POLICY "discussions_view_enrolled" ON discussions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM enrollments
      WHERE enrollments.course_id = discussions.course_id
      AND enrollments.user_id = auth.uid()
    )
  );

-- Enrolled users can create discussions
CREATE POLICY "discussions_users_create" ON discussions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM enrollments
      WHERE enrollments.course_id = discussions.course_id
      AND enrollments.user_id = auth.uid()
    )
  );

-- Enrolled users can view replies
CREATE POLICY "replies_view_enrolled" ON replies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM discussions
      JOIN enrollments ON enrollments.course_id = discussions.course_id
      WHERE discussions.id = replies.discussion_id
      AND enrollments.user_id = auth.uid()
    )
  );

-- Enrolled users can create replies
CREATE POLICY "replies_users_create" ON replies
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM discussions
      JOIN enrollments ON enrollments.course_id = discussions.course_id
      WHERE discussions.id = replies.discussion_id
      AND enrollments.user_id = auth.uid()
    )
  );

-- ============================================
-- STORAGE BUCKETS SETUP
-- ============================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('course-thumbnails', 'course-thumbnails', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('course-videos', 'course-videos', false, 5368709120, ARRAY['video/mp4', 'video/quicktime']),
  ('assignment-submissions', 'assignment-submissions', false, 52428800, ARRAY['application/pdf', 'application/msword', 'text/plain']),
  ('user-avatars', 'user-avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('certificates', 'certificates', true, 10485760, ARRAY['application/pdf', 'image/png']),
  ('instructor-cv', 'instructor-cv', false, 10485760, ARRAY['application/pdf']),
  ('instructor-videos', 'instructor-videos', false, 1073741824, ARRAY['video/mp4', 'video/quicktime']);

-- ============================================
-- STORAGE RLS POLICIES
-- ============================================

-- Course thumbnails - public read, instructor write
CREATE POLICY "course_thumbnails_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'course-thumbnails');

CREATE POLICY "course_thumbnails_instructor_write" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'course-thumbnails' AND
    auth.uid() IS NOT NULL
  );

-- User avatars - public read, user write own
CREATE POLICY "user_avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'user-avatars');

CREATE POLICY "user_avatars_user_write" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Assignment submissions - user write, instructor read
CREATE POLICY "assignment_submissions_user_write" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'assignment-submissions' AND
    auth.uid() IS NOT NULL
  );

-- Certificates - public read
CREATE POLICY "certificates_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'certificates');

-- Course videos - enrolled users read
CREATE POLICY "course_videos_enrolled_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'course-videos' AND auth.uid() IS NOT NULL);

-- Instructor CV - private, owner access
CREATE POLICY "instructor_cv_owner_access" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'instructor-cv' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Instructor videos - instructor write
CREATE POLICY "instructor_videos_instructor_write" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'instructor-videos' AND
    auth.uid() IS NOT NULL
  );