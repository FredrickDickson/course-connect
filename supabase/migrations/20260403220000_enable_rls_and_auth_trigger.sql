-- Migrate user schema to use Supabase Auth and native RLS
-- First, enable RLS on all tables
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "courses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "modules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lessons" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "enrollments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "progress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "discussions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "replies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "instructor_applications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "certifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quizzes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quiz_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quiz_answers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quiz_attempts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quiz_responses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "course_resources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assignment_submissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "instructor_payouts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "favorites" ENABLE ROW LEVEL SECURITY;

-- Ensure Cascading Deletes (Alter existing constraints)
-- This assumes the tables were created by Drizzle. We need to drop and re-add constraints or ensure they exist.
-- To keep it simple and safe for existing data, we will just add policies for now.
-- In a real migration, we'd use: ALTER TABLE "courses" DROP CONSTRAINT ... ADD CONSTRAINT ... FOREIGN KEY ... ON DELETE CASCADE;

-- 1. Users table policies
CREATE POLICY "Users can view all users" ON "users" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update their own profile" ON "users" FOR UPDATE TO authenticated USING (auth.uid()::text = id);

-- 2. Categories
CREATE POLICY "Categories are viewable by everyone" ON "categories" FOR SELECT USING (true);

-- 3. Courses table policies
CREATE POLICY "Published courses are viewable by everyone" ON "courses" FOR SELECT USING (is_published = true OR auth.uid()::text = instructor_id);
CREATE POLICY "Instructors can manage their own courses" ON "courses" FOR ALL TO authenticated USING (auth.uid()::text = instructor_id);
CREATE POLICY "Admins can manage all courses" ON "courses" FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'admin'));

-- 4. Modules & Lessons
CREATE POLICY "Modules are viewable if course is viewable" ON "modules" FOR SELECT USING (EXISTS (SELECT 1 FROM courses WHERE id = course_id AND (is_published = true OR auth.uid()::text = instructor_id)));
CREATE POLICY "Instructors can manage modules of their courses" ON "modules" FOR ALL USING (EXISTS (SELECT 1 FROM courses WHERE id = course_id AND auth.uid()::text = instructor_id));

CREATE POLICY "Lessons are viewable if course is viewable" ON "lessons" FOR SELECT USING (EXISTS (SELECT 1 FROM modules JOIN courses ON modules.course_id = courses.id WHERE modules.id = module_id AND (courses.is_published = true OR auth.uid()::text = courses.instructor_id)));
CREATE POLICY "Instructors can manage lessons of their modules" ON "lessons" FOR ALL USING (EXISTS (SELECT 1 FROM modules JOIN courses ON modules.course_id = courses.id WHERE modules.id = module_id AND auth.uid()::text = courses.instructor_id));

-- 5. Enrollments
CREATE POLICY "Users can view their own enrollments" ON "enrollments" FOR SELECT TO authenticated USING (auth.uid()::text = user_id);
CREATE POLICY "Instructors can view enrollments for their courses" ON "enrollments" FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM courses WHERE id = course_id AND instructor_id = auth.uid()::text));

-- 6. Progress
CREATE POLICY "Users can manage their own progress" ON "progress" FOR ALL TO authenticated USING (auth.uid()::text = user_id);

-- 7. Reviews
CREATE POLICY "Reviews are viewable by everyone" ON "reviews" FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create reviews" ON "reviews" FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id);

-- 8. Discussions & Replies
CREATE POLICY "Discussions are viewable by everyone" ON "discussions" FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage their own discussions" ON "discussions" FOR ALL TO authenticated USING (auth.uid()::text = user_id);

CREATE POLICY "Replies are viewable by everyone" ON "replies" FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage their own replies" ON "replies" FOR ALL TO authenticated USING (auth.uid()::text = user_id);

-- 9. Orders
CREATE POLICY "Users can view their own orders" ON "orders" FOR SELECT TO authenticated USING (auth.uid()::text = user_id);
CREATE POLICY "Admins can view all orders" ON "orders" FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'admin'));

-- 10. Instructor Applications
CREATE POLICY "Users can view/create their own applications" ON "instructor_applications" FOR ALL TO authenticated USING (auth.uid()::text = user_id);
CREATE POLICY "Admins can view all applications" ON "instructor_applications" FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'admin'));

-- 11. Certifications, Quizzes, Assignments
CREATE POLICY "Certifications are viewable by owner" ON "certifications" FOR SELECT TO authenticated USING (auth.uid()::text = user_id);
CREATE POLICY "Quizzes are viewable if lesson is viewable" ON "quizzes" FOR SELECT USING (EXISTS (SELECT 1 FROM lessons WHERE id = lesson_id));
CREATE POLICY "Assignments are viewable if lesson is viewable" ON "assignments" FOR SELECT USING (EXISTS (SELECT 1 FROM lessons WHERE id = lesson_id));

-- Auth.users trigger to sync public.users
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, role)
  VALUES (
    new.id::text, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'first_name', ''), 
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'student')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
