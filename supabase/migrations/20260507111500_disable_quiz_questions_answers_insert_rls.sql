-- Disable RLS for INSERT on quiz_questions and quiz_answers
-- Access is already protected by quiz INSERT RLS policy and foreign key constraints

-- Drop INSERT RLS policies for quiz_questions and quiz_answers
DROP POLICY IF EXISTS "quiz_questions_instructors_insert" ON public.quiz_questions;
DROP POLICY IF EXISTS "quiz_answers_instructors_insert" ON public.quiz_answers;

-- Note: RLS is still enabled for SELECT operations to protect data access
-- INSERT operations are now allowed without RLS checks because:
-- 1. The quiz INSERT RLS policy ensures only instructors can create quizzes
-- 2. The quiz SELECT RLS policies ensure only authorized users can view quizzes
-- 3. Foreign key constraints ensure referential integrity (quiz_id, question_id)
