-- ============================================
-- SUPABASE RLS POLICIES - FIXED VERSION
-- varchar user_id compatible
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
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "users_view_own_profile" ON users
  FOR SELECT USING (auth.uid()::text = id);

-- Users can update their own profile
CREATE POLICY "users_update_own_profile" ON users
  FOR UPDATE USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

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
  FOR SELECT USING (auth.uid()::text = instructor_id);

-- Instructors can create courses
CREATE POLICY "courses_instructors_create" ON courses
  FOR INSERT WITH CHECK (auth.uid()::text = instructor_id);

-- Instructors can update their own courses
CREATE POLICY "courses_instructors_update_own" ON courses
  FOR UPDATE USING (auth.uid()::text = instructor_id)
  WITH CHECK (auth.uid()::text = instructor_id);

-- Instructors can delete their own unpublished courses
CREATE POLICY "courses_instructors_delete_own" ON courses
  FOR DELETE USING (auth.uid()::text = instructor_id AND is_published = false);

-- ============================================
-- MODULES TABLE POLICIES
-- ============================================

-- Anyone can view modules from published courses
CREATE POLICY "modules_view_from_published_courses" ON modules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = modules.course_id
      AND courses.is_published = true
    )
  );

-- Instructors can view modules in their courses
CREATE POLICY "modules_instructors_view_own" ON modules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = modules.course_id
      AND courses.instructor_id = auth.uid()::text
    )
  );

-- ============================================
-- ENROLLMENTS TABLE POLICIES
-- ============================================

-- Users can view their own enrollments
CREATE POLICY "enrollments_view_own" ON enrollments
  FOR SELECT USING (auth.uid()::text = user_id);

-- Instructors can view enrollments in their courses
CREATE POLICY "enrollments_instructors_view" ON enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = enrollments.course_id 
      AND courses.instructor_id = auth.uid()::text
    )
  );

-- Users can enroll in courses
CREATE POLICY "enrollments_users_create" ON enrollments
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own enrollment progress
CREATE POLICY "enrollments_users_update_own" ON enrollments
  FOR UPDATE USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- ============================================
-- PROGRESS TABLE POLICIES
-- ============================================

-- Users can view their own progress
CREATE POLICY "progress_view_own" ON progress
  FOR SELECT USING (auth.uid()::text = user_id);

-- Users can update their own progress
CREATE POLICY "progress_update_own" ON progress
  FOR UPDATE USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Users can create progress records
CREATE POLICY "progress_users_create" ON progress
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

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
      AND courses.instructor_id = auth.uid()::text
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
      AND enrollments.user_id = auth.uid()::text
    )
  );

-- Instructors can view assignments in their courses
CREATE POLICY "assignments_instructors_view" ON assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lessons
      JOIN modules ON modules.id = lessons.module_id
      JOIN courses ON courses.id = modules.course_id
      WHERE lessons.id = assignments.lesson_id
      AND courses.instructor_id = auth.uid()::text
    )
  );

-- ============================================
-- ASSIGNMENT SUBMISSIONS TABLE POLICIES
-- ============================================

-- Users can view their own submissions
CREATE POLICY "assignment_submissions_view_own" ON assignment_submissions
  FOR SELECT USING (auth.uid()::text = user_id);

-- Instructors can view submissions for their courses
CREATE POLICY "assignment_submissions_instructors_view" ON assignment_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignments
      JOIN lessons ON lessons.id = assignments.lesson_id
      JOIN modules ON modules.id = lessons.module_id
      JOIN courses ON courses.id = modules.course_id
      WHERE assignments.id = assignment_submissions.assignment_id
      AND courses.instructor_id = auth.uid()::text
    )
  );

-- Users can submit assignments
CREATE POLICY "assignment_submissions_users_create" ON assignment_submissions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Instructors can grade submissions
CREATE POLICY "assignment_submissions_instructors_update" ON assignment_submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM assignments
      JOIN lessons ON lessons.id = assignments.lesson_id
      JOIN modules ON modules.id = lessons.module_id
      JOIN courses ON courses.id = modules.course_id
      WHERE assignments.id = assignment_submissions.assignment_id
      AND courses.instructor_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assignments
      JOIN lessons ON lessons.id = assignments.lesson_id
      JOIN modules ON modules.id = lessons.module_id
      JOIN courses ON courses.id = modules.course_id
      WHERE assignments.id = assignment_submissions.assignment_id
      AND courses.instructor_id = auth.uid()::text
    )
  );

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
      AND enrollments.user_id = auth.uid()::text
    )
  );

-- Instructors can view all quizzes in their courses
CREATE POLICY "quizzes_instructors_view" ON quizzes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lessons
      JOIN modules ON modules.id = lessons.module_id
      JOIN courses ON courses.id = modules.course_id
      WHERE lessons.id = quizzes.lesson_id
      AND courses.instructor_id = auth.uid()::text
    )
  );

-- Users can view their own quiz attempts
CREATE POLICY "quiz_attempts_view_own" ON quiz_attempts
  FOR SELECT USING (auth.uid()::text = user_id);

-- Instructors can view attempts for their courses
CREATE POLICY "quiz_attempts_instructors_view" ON quiz_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quizzes
      JOIN lessons ON lessons.id = quizzes.lesson_id
      JOIN modules ON modules.id = lessons.module_id
      JOIN courses ON courses.id = modules.course_id
      WHERE quizzes.id = quiz_attempts.quiz_id
      AND courses.instructor_id = auth.uid()::text
    )
  );

-- Users can create quiz attempts
CREATE POLICY "quiz_attempts_users_create" ON quiz_attempts
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own incomplete quiz attempts
CREATE POLICY "quiz_attempts_users_update_own" ON quiz_attempts
  FOR UPDATE USING (auth.uid()::text = user_id AND completed_at IS NULL)
  WITH CHECK (auth.uid()::text = user_id);

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
    auth.uid()::text = user_id AND
    EXISTS (
      SELECT 1 FROM enrollments
      WHERE enrollments.user_id = auth.uid()::text
      AND enrollments.course_id = reviews.course_id
    )
  );

-- Users can update their own reviews
CREATE POLICY "reviews_users_update_own" ON reviews
  FOR UPDATE USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- ============================================
-- FAVORITES TABLE POLICIES
-- ============================================

-- Users can view their own favorites
CREATE POLICY "favorites_view_own" ON favorites
  FOR SELECT USING (auth.uid()::text = user_id);

-- Users can add courses to favorites
CREATE POLICY "favorites_users_create" ON favorites
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Users can remove their own favorites
CREATE POLICY "favorites_users_delete_own" ON favorites
  FOR DELETE USING (auth.uid()::text = user_id);

-- ============================================
-- CERTIFICATIONS TABLE POLICIES
-- ============================================

-- Users can view their own certifications
CREATE POLICY "certifications_view_own" ON certifications
  FOR SELECT USING (auth.uid()::text = user_id);

-- Public can view any certification (with verification)
CREATE POLICY "certifications_view_public" ON certifications
  FOR SELECT USING (true);

-- ============================================
-- CATEGORIES TABLE POLICIES
-- ============================================

-- Anyone can view all categories
CREATE POLICY "categories_view_public" ON categories
  FOR SELECT USING (true);

-- ============================================
-- INSTRUCTOR APPLICATIONS POLICIES
-- ============================================

-- Users can create their own application
CREATE POLICY "instructor_applications_users_create" ON instructor_applications
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Users can view their own application
CREATE POLICY "instructor_applications_view_own" ON instructor_applications
  FOR SELECT USING (auth.uid()::text = user_id);

-- Admin/staff can view all applications
CREATE POLICY "instructor_applications_admins_view" ON instructor_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND (users.role = 'admin' OR users.role = 'staff')
    )
  );

-- ============================================
-- INSTRUCTOR PAYOUTS POLICIES
-- ============================================

-- Instructors can view their own payouts
CREATE POLICY "instructor_payouts_view_own" ON instructor_payouts
  FOR SELECT USING (auth.uid()::text = instructor_id);

-- Admin can view all payouts
CREATE POLICY "instructor_payouts_admin_view" ON instructor_payouts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
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
      AND enrollments.user_id = auth.uid()::text
    )
  );

-- Enrolled users can create discussions
CREATE POLICY "discussions_users_create" ON discussions
  FOR INSERT WITH CHECK (
    auth.uid()::text = user_id AND
    EXISTS (
      SELECT 1 FROM enrollments
      WHERE enrollments.course_id = discussions.course_id
      AND enrollments.user_id = auth.uid()::text
    )
  );

-- Enrolled users can view replies
CREATE POLICY "replies_view_enrolled" ON replies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM discussions
      JOIN enrollments ON enrollments.course_id = discussions.course_id
      WHERE discussions.id = replies.discussion_id
      AND enrollments.user_id = auth.uid()::text
    )
  );

-- Enrolled users can create replies
CREATE POLICY "replies_users_create" ON replies
  FOR INSERT WITH CHECK (
    auth.uid()::text = user_id AND
    EXISTS (
      SELECT 1 FROM discussions
      JOIN enrollments ON enrollments.course_id = discussions.course_id
      WHERE discussions.id = replies.discussion_id
      AND enrollments.user_id = auth.uid()::text
    )
  );

-- Users can delete their own replies
CREATE POLICY "replies_users_delete_own" ON replies
  FOR DELETE USING (auth.uid()::text = user_id);

-- ============================================
-- ORDERS TABLE POLICIES
-- ============================================

-- Users can view their own orders
CREATE POLICY "orders_view_own" ON orders
  FOR SELECT USING (auth.uid()::text = user_id);

-- Users can create orders
CREATE POLICY "orders_users_create" ON orders
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Instructors can view orders for their courses
CREATE POLICY "orders_instructors_view" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = orders.course_id
      AND courses.instructor_id = auth.uid()::text
    )
  );

-- ============================================
-- SESSIONS TABLE POLICIES
-- ============================================

-- Users can only access their own sessions
CREATE POLICY "sessions_view_own" ON sessions
  FOR SELECT USING (auth.uid()::text = (sess->>'userId'));

-- ============================================
-- PERFORMANCE INDEXES (Run these separately)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_lesson_id ON progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_courses_instructor_id ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_is_published ON courses(is_published);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_user_id ON assignment_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_id ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_reviews_course_id ON reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_discussions_course_id ON discussions(course_id);
CREATE INDEX IF NOT EXISTS idx_replies_discussion_id ON replies(discussion_id);