import { supabaseAdmin } from "./db";
import { E2E_SEED_COURSE_TITLE } from "./test-users";

let cachedCourseId: string | null = null;
let cachedQuizId: string | null = null;

/** Looks up the id of the course seeded by seed-test-data.ts (stable, known title). */
export async function getSeededCourseId(): Promise<string> {
  if (cachedCourseId) return cachedCourseId;
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("id")
    .eq("title", E2E_SEED_COURSE_TITLE)
    .single();
  if (error) throw error;
  cachedCourseId = data.id;
  return data.id;
}

/** Looks up the id of the quiz seed-test-data.ts attaches to the seeded course's first lesson. */
export async function getSeededQuizId(): Promise<string> {
  if (cachedQuizId) return cachedQuizId;
  const courseId = await getSeededCourseId();
  const { data: courseModule, error: moduleError } = await supabaseAdmin
    .from("modules")
    .select("id")
    .eq("course_id", courseId)
    .single();
  if (moduleError) throw moduleError;
  const { data: lesson, error: lessonError } = await supabaseAdmin
    .from("lessons")
    .select("id")
    .eq("module_id", courseModule.id)
    .eq("title", "Lesson 1: Getting Started")
    .single();
  if (lessonError) throw lessonError;
  const { data: quiz, error: quizError } = await supabaseAdmin
    .from("quizzes")
    .select("id")
    .eq("lesson_id", lesson.id)
    .single();
  if (quizError) throw quizError;
  cachedQuizId = quiz.id;
  return quiz.id;
}
