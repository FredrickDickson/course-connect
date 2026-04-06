
-- Add foreign keys for courses
ALTER TABLE public.courses
  ADD CONSTRAINT courses_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES public.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT courses_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

-- Add foreign keys for modules
ALTER TABLE public.modules
  ADD CONSTRAINT modules_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

-- Add foreign keys for lessons
ALTER TABLE public.lessons
  ADD CONSTRAINT lessons_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE;

-- Add foreign keys for enrollments
ALTER TABLE public.enrollments
  ADD CONSTRAINT enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

-- Add foreign keys for reviews
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE,
  ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Add foreign keys for favorites
ALTER TABLE public.favorites
  ADD CONSTRAINT favorites_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

-- Add foreign keys for certifications
ALTER TABLE public.certifications
  ADD CONSTRAINT certifications_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

-- Add foreign keys for orders
ALTER TABLE public.orders
  ADD CONSTRAINT orders_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL;

-- Add foreign keys for discussions
ALTER TABLE public.discussions
  ADD CONSTRAINT discussions_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

-- Add foreign keys for replies
ALTER TABLE public.replies
  ADD CONSTRAINT replies_discussion_id_fkey FOREIGN KEY (discussion_id) REFERENCES public.discussions(id) ON DELETE CASCADE;

-- Add foreign keys for quizzes
ALTER TABLE public.quizzes
  ADD CONSTRAINT quizzes_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;

-- Add foreign keys for quiz_questions
ALTER TABLE public.quiz_questions
  ADD CONSTRAINT quiz_questions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;

-- Add foreign keys for quiz_answers
ALTER TABLE public.quiz_answers
  ADD CONSTRAINT quiz_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.quiz_questions(id) ON DELETE CASCADE;

-- Add foreign keys for quiz_attempts
ALTER TABLE public.quiz_attempts
  ADD CONSTRAINT quiz_attempts_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;

-- Add foreign keys for quiz_responses
ALTER TABLE public.quiz_responses
  ADD CONSTRAINT quiz_responses_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  ADD CONSTRAINT quiz_responses_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  ADD CONSTRAINT quiz_responses_answer_id_fkey FOREIGN KEY (answer_id) REFERENCES public.quiz_answers(id) ON DELETE SET NULL;

-- Add foreign keys for assignments
ALTER TABLE public.assignments
  ADD CONSTRAINT assignments_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;

-- Add foreign keys for assignment_submissions
ALTER TABLE public.assignment_submissions
  ADD CONSTRAINT assignment_submissions_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;

-- Add foreign keys for progress
ALTER TABLE public.progress
  ADD CONSTRAINT progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;
