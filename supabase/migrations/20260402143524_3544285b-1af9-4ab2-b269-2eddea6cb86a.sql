
-- ============================================
-- CIMA LEARNING PLATFORM - COMPLETE SCHEMA
-- ============================================

-- Helper function: updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================
-- TABLE CREATION
-- ============================================

CREATE TABLE public.users (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
  email varchar UNIQUE,
  first_name varchar,
  last_name varchar,
  profile_image_url varchar,
  role varchar DEFAULT 'student',
  bio text,
  country varchar,
  timezone varchar,
  paystack_customer_code varchar,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  name varchar(100) NOT NULL,
  description text,
  slug varchar(100) NOT NULL UNIQUE,
  created_at timestamp DEFAULT now()
);

CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  title varchar(200) NOT NULL,
  subtitle varchar(300),
  description text,
  instructor_id varchar REFERENCES public.users(id) ON DELETE NO ACTION,
  category_id uuid REFERENCES public.categories(id) ON DELETE NO ACTION,
  level varchar DEFAULT 'beginner',
  price numeric(10,2) NOT NULL,
  currency varchar(3) DEFAULT 'USD',
  thumbnail_url varchar,
  promo_video_url varchar,
  duration_hours integer,
  is_published boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  avg_rating numeric(3,2) DEFAULT '0',
  rating_count integer DEFAULT 0,
  enrollment_count integer DEFAULT 0,
  tags text[],
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE public.modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  title varchar(200) NOT NULL,
  description text,
  "order" integer NOT NULL,
  created_at timestamp DEFAULT now()
);

CREATE TABLE public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  module_id uuid REFERENCES public.modules(id) ON DELETE CASCADE,
  title varchar(200) NOT NULL,
  description text,
  content_type varchar DEFAULT 'video',
  video_url varchar,
  duration_seconds integer,
  content text,
  "order" integer NOT NULL,
  is_free boolean DEFAULT false,
  created_at timestamp DEFAULT now()
);

CREATE TABLE public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id varchar REFERENCES public.users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at timestamp DEFAULT now(),
  completed_at timestamp,
  progress numeric(5,2) DEFAULT '0'
);

CREATE TABLE public.progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id varchar REFERENCES public.users(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed boolean DEFAULT false,
  watch_time_seconds integer DEFAULT 0,
  last_watched_at timestamp DEFAULT now()
);

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id varchar REFERENCES public.users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  rating integer NOT NULL,
  comment text,
  created_at timestamp DEFAULT now()
);

CREATE TABLE public.discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id varchar REFERENCES public.users(id) ON DELETE CASCADE,
  title varchar(200) NOT NULL,
  content text NOT NULL,
  created_at timestamp DEFAULT now()
);

CREATE TABLE public.replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  discussion_id uuid REFERENCES public.discussions(id) ON DELETE CASCADE,
  user_id varchar REFERENCES public.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  parent_id uuid,
  created_at timestamp DEFAULT now()
);

CREATE TABLE public.certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id varchar REFERENCES public.users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  certificate_url varchar,
  issued_at timestamp DEFAULT now(),
  valid_until timestamp
);

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id varchar REFERENCES public.users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  currency varchar(3) DEFAULT 'USD',
  status varchar DEFAULT 'pending',
  paystack_reference varchar,
  created_at timestamp DEFAULT now()
);

CREATE TABLE public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id varchar REFERENCES public.users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at timestamp DEFAULT now()
);

CREATE TABLE public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
  title varchar(200) NOT NULL,
  description text,
  time_limit_minutes integer,
  passing_score integer DEFAULT 80,
  max_attempts integer DEFAULT 3,
  is_required boolean DEFAULT false,
  created_at timestamp DEFAULT now()
);

CREATE TABLE public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question text NOT NULL,
  question_type varchar DEFAULT 'multiple_choice',
  points integer DEFAULT 1,
  "order" integer NOT NULL,
  created_at timestamp DEFAULT now()
);

CREATE TABLE public.quiz_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  question_id uuid REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  answer text NOT NULL,
  is_correct boolean DEFAULT false,
  "order" integer NOT NULL,
  created_at timestamp DEFAULT now()
);

CREATE TABLE public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id varchar REFERENCES public.users(id) ON DELETE CASCADE,
  quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE,
  score numeric(5,2),
  total_points integer,
  passed boolean DEFAULT false,
  time_spent_minutes integer,
  started_at timestamp DEFAULT now(),
  completed_at timestamp
);

CREATE TABLE public.quiz_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  attempt_id uuid REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id uuid REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  answer_id uuid REFERENCES public.quiz_answers(id) ON DELETE NO ACTION,
  response_text text,
  is_correct boolean DEFAULT false,
  points_earned integer DEFAULT 0,
  created_at timestamp DEFAULT now()
);

CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
  title varchar(200) NOT NULL,
  description text NOT NULL,
  instructions text,
  due_date timestamp,
  max_score integer DEFAULT 100,
  allow_late_submission boolean DEFAULT true,
  is_required boolean DEFAULT false,
  created_at timestamp DEFAULT now()
);

CREATE TABLE public.assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id varchar REFERENCES public.users(id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES public.assignments(id) ON DELETE CASCADE,
  content text NOT NULL,
  attachment_urls text[],
  score integer,
  feedback text,
  graded_at timestamp,
  graded_by varchar REFERENCES public.users(id) ON DELETE NO ACTION,
  is_late_submission boolean DEFAULT false,
  submitted_at timestamp DEFAULT now()
);

CREATE TABLE public.instructor_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id varchar REFERENCES public.users(id) ON DELETE CASCADE,
  first_name varchar(100) NOT NULL,
  last_name varchar(100) NOT NULL,
  email varchar(255) NOT NULL,
  phone varchar(50) NOT NULL,
  bio text NOT NULL,
  experience text NOT NULL,
  qualifications text NOT NULL,
  previous_teaching text NOT NULL,
  areas_of_expertise text[] NOT NULL,
  cv_url varchar,
  video_intro_url varchar,
  status varchar DEFAULT 'pending',
  submitted_at timestamp DEFAULT now(),
  reviewed_at timestamp,
  reviewed_by varchar REFERENCES public.users(id) ON DELETE NO ACTION,
  review_comments text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE public.instructor_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  instructor_id varchar REFERENCES public.users(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  currency varchar(3) DEFAULT 'USD',
  period varchar(7) NOT NULL,
  revenue_share numeric(5,2) DEFAULT '70.00',
  total_revenue numeric(10,2) NOT NULL,
  status varchar DEFAULT 'pending',
  payout_reference varchar,
  processed_at timestamp,
  created_at timestamp DEFAULT now()
);

CREATE TABLE public.sessions (
  sid varchar PRIMARY KEY NOT NULL,
  sess jsonb NOT NULL,
  expire timestamp NOT NULL
);

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_instructor_applications_updated_at BEFORE UPDATE ON public.instructor_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- SECURITY DEFINER FUNCTION (prevents RLS recursion)
-- ============================================

CREATE OR REPLACE FUNCTION public.is_admin(_user_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = _user_id AND role = 'admin'
  )
$$;

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- USERS
CREATE POLICY "users_view_own_profile" ON public.users FOR SELECT USING (auth.uid()::text = id);
CREATE POLICY "users_update_own_profile" ON public.users FOR UPDATE USING (auth.uid()::text = id) WITH CHECK (auth.uid()::text = id);
CREATE POLICY "users_view_instructor_profiles" ON public.users FOR SELECT USING (role = 'instructor');
CREATE POLICY "users_insert_own" ON public.users FOR INSERT WITH CHECK (auth.uid()::text = id);

-- COURSES
CREATE POLICY "courses_view_published" ON public.courses FOR SELECT USING (is_published = true);
CREATE POLICY "courses_instructors_view_own" ON public.courses FOR SELECT USING (auth.uid()::text = instructor_id);
CREATE POLICY "courses_instructors_create" ON public.courses FOR INSERT WITH CHECK (auth.uid()::text = instructor_id);
CREATE POLICY "courses_instructors_update_own" ON public.courses FOR UPDATE USING (auth.uid()::text = instructor_id) WITH CHECK (auth.uid()::text = instructor_id);
CREATE POLICY "courses_instructors_delete_own" ON public.courses FOR DELETE USING (auth.uid()::text = instructor_id AND is_published = false);

-- CATEGORIES
CREATE POLICY "categories_view_public" ON public.categories FOR SELECT USING (true);

-- MODULES
CREATE POLICY "modules_view_from_published_courses" ON public.modules FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.courses WHERE courses.id = modules.course_id AND courses.is_published = true)
);
CREATE POLICY "modules_instructors_view_own" ON public.modules FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.courses WHERE courses.id = modules.course_id AND courses.instructor_id = auth.uid()::text)
);
CREATE POLICY "modules_instructors_create" ON public.modules FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.courses WHERE courses.id = modules.course_id AND courses.instructor_id = auth.uid()::text)
);
CREATE POLICY "modules_instructors_update" ON public.modules FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.courses WHERE courses.id = modules.course_id AND courses.instructor_id = auth.uid()::text)
);
CREATE POLICY "modules_instructors_delete" ON public.modules FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.courses WHERE courses.id = modules.course_id AND courses.instructor_id = auth.uid()::text)
);

-- LESSONS
CREATE POLICY "lessons_view_from_published_courses" ON public.lessons FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.modules JOIN public.courses ON courses.id = modules.course_id WHERE modules.id = lessons.module_id AND courses.is_published = true)
);
CREATE POLICY "lessons_instructors_view_own" ON public.lessons FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.modules JOIN public.courses ON courses.id = modules.course_id WHERE modules.id = lessons.module_id AND courses.instructor_id = auth.uid()::text)
);
CREATE POLICY "lessons_instructors_create" ON public.lessons FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.modules JOIN public.courses ON courses.id = modules.course_id WHERE modules.id = lessons.module_id AND courses.instructor_id = auth.uid()::text)
);
CREATE POLICY "lessons_instructors_update" ON public.lessons FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.modules JOIN public.courses ON courses.id = modules.course_id WHERE modules.id = lessons.module_id AND courses.instructor_id = auth.uid()::text)
);
CREATE POLICY "lessons_instructors_delete" ON public.lessons FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.modules JOIN public.courses ON courses.id = modules.course_id WHERE modules.id = lessons.module_id AND courses.instructor_id = auth.uid()::text)
);

-- ENROLLMENTS
CREATE POLICY "enrollments_view_own" ON public.enrollments FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "enrollments_instructors_view" ON public.enrollments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.courses WHERE courses.id = enrollments.course_id AND courses.instructor_id = auth.uid()::text)
);
CREATE POLICY "enrollments_users_create" ON public.enrollments FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "enrollments_users_update_own" ON public.enrollments FOR UPDATE USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

-- PROGRESS
CREATE POLICY "progress_view_own" ON public.progress FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "progress_update_own" ON public.progress FOR UPDATE USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "progress_users_create" ON public.progress FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- ASSIGNMENTS
CREATE POLICY "assignments_view_enrolled" ON public.assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.lessons JOIN public.modules ON modules.id = lessons.module_id JOIN public.courses ON courses.id = modules.course_id JOIN public.enrollments ON enrollments.course_id = courses.id WHERE lessons.id = assignments.lesson_id AND enrollments.user_id = auth.uid()::text)
);
CREATE POLICY "assignments_instructors_view" ON public.assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.lessons JOIN public.modules ON modules.id = lessons.module_id JOIN public.courses ON courses.id = modules.course_id WHERE lessons.id = assignments.lesson_id AND courses.instructor_id = auth.uid()::text)
);
CREATE POLICY "assignments_instructors_create" ON public.assignments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.lessons JOIN public.modules ON modules.id = lessons.module_id JOIN public.courses ON courses.id = modules.course_id WHERE lessons.id = assignments.lesson_id AND courses.instructor_id = auth.uid()::text)
);

-- ASSIGNMENT SUBMISSIONS
CREATE POLICY "assignment_submissions_view_own" ON public.assignment_submissions FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "assignment_submissions_instructors_view" ON public.assignment_submissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.assignments JOIN public.lessons ON lessons.id = assignments.lesson_id JOIN public.modules ON modules.id = lessons.module_id JOIN public.courses ON courses.id = modules.course_id WHERE assignments.id = assignment_submissions.assignment_id AND courses.instructor_id = auth.uid()::text)
);
CREATE POLICY "assignment_submissions_users_create" ON public.assignment_submissions FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "assignment_submissions_instructors_update" ON public.assignment_submissions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.assignments JOIN public.lessons ON lessons.id = assignments.lesson_id JOIN public.modules ON modules.id = lessons.module_id JOIN public.courses ON courses.id = modules.course_id WHERE assignments.id = assignment_submissions.assignment_id AND courses.instructor_id = auth.uid()::text)
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.assignments JOIN public.lessons ON lessons.id = assignments.lesson_id JOIN public.modules ON modules.id = lessons.module_id JOIN public.courses ON courses.id = modules.course_id WHERE assignments.id = assignment_submissions.assignment_id AND courses.instructor_id = auth.uid()::text)
);

-- QUIZZES
CREATE POLICY "quizzes_view_enrolled" ON public.quizzes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.lessons JOIN public.modules ON modules.id = lessons.module_id JOIN public.courses ON courses.id = modules.course_id JOIN public.enrollments ON enrollments.course_id = courses.id WHERE lessons.id = quizzes.lesson_id AND enrollments.user_id = auth.uid()::text)
);
CREATE POLICY "quizzes_instructors_view" ON public.quizzes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.lessons JOIN public.modules ON modules.id = lessons.module_id JOIN public.courses ON courses.id = modules.course_id WHERE lessons.id = quizzes.lesson_id AND courses.instructor_id = auth.uid()::text)
);
CREATE POLICY "quizzes_instructors_create" ON public.quizzes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.lessons JOIN public.modules ON modules.id = lessons.module_id JOIN public.courses ON courses.id = modules.course_id WHERE lessons.id = quizzes.lesson_id AND courses.instructor_id = auth.uid()::text)
);

-- QUIZ QUESTIONS (visible if quiz is visible)
CREATE POLICY "quiz_questions_view" ON public.quiz_questions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.quizzes JOIN public.lessons ON lessons.id = quizzes.lesson_id JOIN public.modules ON modules.id = lessons.module_id JOIN public.courses ON courses.id = modules.course_id LEFT JOIN public.enrollments ON enrollments.course_id = courses.id AND enrollments.user_id = auth.uid()::text WHERE quizzes.id = quiz_questions.quiz_id AND (enrollments.id IS NOT NULL OR courses.instructor_id = auth.uid()::text))
);
CREATE POLICY "quiz_questions_instructors_create" ON public.quiz_questions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.quizzes JOIN public.lessons ON lessons.id = quizzes.lesson_id JOIN public.modules ON modules.id = lessons.module_id JOIN public.courses ON courses.id = modules.course_id WHERE quizzes.id = quiz_questions.quiz_id AND courses.instructor_id = auth.uid()::text)
);

-- QUIZ ANSWERS
CREATE POLICY "quiz_answers_view" ON public.quiz_answers FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.quiz_questions JOIN public.quizzes ON quizzes.id = quiz_questions.quiz_id JOIN public.lessons ON lessons.id = quizzes.lesson_id JOIN public.modules ON modules.id = lessons.module_id JOIN public.courses ON courses.id = modules.course_id LEFT JOIN public.enrollments ON enrollments.course_id = courses.id AND enrollments.user_id = auth.uid()::text WHERE quiz_questions.id = quiz_answers.question_id AND (enrollments.id IS NOT NULL OR courses.instructor_id = auth.uid()::text))
);
CREATE POLICY "quiz_answers_instructors_create" ON public.quiz_answers FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.quiz_questions JOIN public.quizzes ON quizzes.id = quiz_questions.quiz_id JOIN public.lessons ON lessons.id = quizzes.lesson_id JOIN public.modules ON modules.id = lessons.module_id JOIN public.courses ON courses.id = modules.course_id WHERE quiz_questions.id = quiz_answers.question_id AND courses.instructor_id = auth.uid()::text)
);

-- QUIZ ATTEMPTS
CREATE POLICY "quiz_attempts_view_own" ON public.quiz_attempts FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "quiz_attempts_instructors_view" ON public.quiz_attempts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.quizzes JOIN public.lessons ON lessons.id = quizzes.lesson_id JOIN public.modules ON modules.id = lessons.module_id JOIN public.courses ON courses.id = modules.course_id WHERE quizzes.id = quiz_attempts.quiz_id AND courses.instructor_id = auth.uid()::text)
);
CREATE POLICY "quiz_attempts_users_create" ON public.quiz_attempts FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "quiz_attempts_users_update_own" ON public.quiz_attempts FOR UPDATE USING (auth.uid()::text = user_id AND completed_at IS NULL) WITH CHECK (auth.uid()::text = user_id);

-- QUIZ RESPONSES
CREATE POLICY "quiz_responses_view_own" ON public.quiz_responses FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.quiz_attempts WHERE quiz_attempts.id = quiz_responses.attempt_id AND quiz_attempts.user_id = auth.uid()::text)
);
CREATE POLICY "quiz_responses_users_create" ON public.quiz_responses FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.quiz_attempts WHERE quiz_attempts.id = quiz_responses.attempt_id AND quiz_attempts.user_id = auth.uid()::text)
);

-- REVIEWS
CREATE POLICY "reviews_view_for_published_courses" ON public.reviews FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.courses WHERE courses.id = reviews.course_id AND courses.is_published = true)
);
CREATE POLICY "reviews_users_create" ON public.reviews FOR INSERT WITH CHECK (
  auth.uid()::text = user_id AND EXISTS (SELECT 1 FROM public.enrollments WHERE enrollments.user_id = auth.uid()::text AND enrollments.course_id = reviews.course_id)
);
CREATE POLICY "reviews_users_update_own" ON public.reviews FOR UPDATE USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

-- FAVORITES
CREATE POLICY "favorites_view_own" ON public.favorites FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "favorites_users_create" ON public.favorites FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "favorites_users_delete_own" ON public.favorites FOR DELETE USING (auth.uid()::text = user_id);

-- CERTIFICATIONS
CREATE POLICY "certifications_view_own" ON public.certifications FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "certifications_view_public" ON public.certifications FOR SELECT USING (true);

-- ORDERS
CREATE POLICY "orders_view_own" ON public.orders FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "orders_users_create" ON public.orders FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "orders_instructors_view" ON public.orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.courses WHERE courses.id = orders.course_id AND courses.instructor_id = auth.uid()::text)
);

-- DISCUSSIONS
CREATE POLICY "discussions_view_enrolled" ON public.discussions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.enrollments WHERE enrollments.course_id = discussions.course_id AND enrollments.user_id = auth.uid()::text)
);
CREATE POLICY "discussions_instructors_view" ON public.discussions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.courses WHERE courses.id = discussions.course_id AND courses.instructor_id = auth.uid()::text)
);
CREATE POLICY "discussions_users_create" ON public.discussions FOR INSERT WITH CHECK (
  auth.uid()::text = user_id AND EXISTS (SELECT 1 FROM public.enrollments WHERE enrollments.course_id = discussions.course_id AND enrollments.user_id = auth.uid()::text)
);

-- REPLIES
CREATE POLICY "replies_view_enrolled" ON public.replies FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.discussions JOIN public.enrollments ON enrollments.course_id = discussions.course_id WHERE discussions.id = replies.discussion_id AND enrollments.user_id = auth.uid()::text)
);
CREATE POLICY "replies_users_create" ON public.replies FOR INSERT WITH CHECK (
  auth.uid()::text = user_id AND EXISTS (SELECT 1 FROM public.discussions JOIN public.enrollments ON enrollments.course_id = discussions.course_id WHERE discussions.id = replies.discussion_id AND enrollments.user_id = auth.uid()::text)
);
CREATE POLICY "replies_users_delete_own" ON public.replies FOR DELETE USING (auth.uid()::text = user_id);

-- INSTRUCTOR APPLICATIONS (uses security definer to avoid recursion)
CREATE POLICY "instructor_applications_users_create" ON public.instructor_applications FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "instructor_applications_view_own" ON public.instructor_applications FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "instructor_applications_admins_view" ON public.instructor_applications FOR SELECT USING (public.is_admin(auth.uid()::text));

-- INSTRUCTOR PAYOUTS (uses security definer to avoid recursion)
CREATE POLICY "instructor_payouts_view_own" ON public.instructor_payouts FOR SELECT USING (auth.uid()::text = instructor_id);
CREATE POLICY "instructor_payouts_admin_view" ON public.instructor_payouts FOR SELECT USING (public.is_admin(auth.uid()::text));

-- SESSIONS
CREATE POLICY "sessions_view_own" ON public.sessions FOR SELECT USING (auth.uid()::text = (sess->>'userId'));

-- ============================================
-- PERFORMANCE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON public.enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON public.progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_lesson_id ON public.progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON public.quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_courses_instructor_id ON public.courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_is_published ON public.courses(is_published);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_user_id ON public.assignment_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_id ON public.assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_reviews_course_id ON public.reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_discussions_course_id ON public.discussions(course_id);
CREATE INDEX IF NOT EXISTS idx_replies_discussion_id ON public.replies(discussion_id);

-- ============================================
-- STORAGE BUCKETS
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('course-thumbnails', 'course-thumbnails', true, 5242880, ARRAY['image/jpeg','image/png','image/webp']),
  ('course-videos', 'course-videos', false, 5368709120, ARRAY['video/mp4','video/quicktime']),
  ('assignment-submissions', 'assignment-submissions', false, 52428800, ARRAY['application/pdf','application/msword','text/plain']),
  ('user-avatars', 'user-avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp']),
  ('certificates', 'certificates', true, 10485760, ARRAY['application/pdf','image/png']),
  ('instructor-cv', 'instructor-cv', false, 10485760, ARRAY['application/pdf']),
  ('instructor-videos', 'instructor-videos', false, 1073741824, ARRAY['video/mp4','video/quicktime']);

-- STORAGE POLICIES
CREATE POLICY "course_thumbnails_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'course-thumbnails');
CREATE POLICY "course_thumbnails_instructor_write" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'course-thumbnails' AND auth.uid() IS NOT NULL);
CREATE POLICY "user_avatars_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'user-avatars');
CREATE POLICY "user_avatars_user_write" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'user-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "assignment_submissions_user_write" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'assignment-submissions' AND auth.uid() IS NOT NULL);
CREATE POLICY "certificates_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'certificates');
CREATE POLICY "course_videos_enrolled_read" ON storage.objects FOR SELECT USING (bucket_id = 'course-videos' AND auth.uid() IS NOT NULL);
CREATE POLICY "instructor_cv_owner_access" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'instructor-cv' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "instructor_videos_instructor_write" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'instructor-videos' AND auth.uid() IS NOT NULL);
