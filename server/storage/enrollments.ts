/**
 * Storage module: Enrollments
 * Uses Supabase client (service role) for all database operations.
 * All results are transformed to camelCase before returning.
 */

import type {
  Enrollment,
  InsertEnrollment,
  Progress,
  InsertProgress,
} from "@shared/schema";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function enrollUser(
  enrollment: InsertEnrollment,
): Promise<Enrollment> {
  const insertPayload = {
    user_id: enrollment.userId,
    course_id: enrollment.courseId,
    progress: enrollment.progress,
  };

  const { data, error } = await supabaseAdmin
    .from("enrollments")
    .insert(insertPayload)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getUserEnrollments(userId: string): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from("enrollments")
    .select("*, course:courses(*)")
    .eq("user_id", userId);

  if (error) throw error;
  return data || [];
}

export async function isUserEnrolled(
  userId: string,
  courseId: string,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (error) return false;
  return !!data;
}

export async function updateEnrollmentProgress(
  userId: string,
  courseId: string,
  progressValue: number,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("enrollments")
    .update({ progress: progressValue.toString() })
    .eq("user_id", userId)
    .eq("course_id", courseId);

  if (error) throw error;
}

export async function getEnrollment(
  userId: string,
  courseId: string,
): Promise<Enrollment | undefined> {
  const { data, error } = await supabaseAdmin
    .from("enrollments")
    .select("*")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (error || !data) return undefined;
  return data;
}

// Progress operations
export async function updateProgress(
  progressData: InsertProgress,
): Promise<Progress> {
  const { data, error } = await supabaseAdmin
    .from("progress")
    .upsert(
      {
        ...progressData,
        last_accessed: new Date().toISOString(),
      },
      { onConflict: "user_id,lesson_id" },
    )
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getUserProgress(
  userId: string,
  courseId: string,
): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from("progress")
    .select("*, lesson:lessons!inner(*, module:modules!inner(*))")
    .eq("user_id", userId)
    .eq("lesson.module.course_id", courseId);

  if (error) throw error;
  return data || [];
}

export async function getUserOverallProgress(userId: string): Promise<{
  totalCourses: number;
  completedCourses: number;
  totalHours: number;
}> {
  const { data: userEnrollments, error } = await supabaseAdmin
    .from("enrollments")
    .select("progress, course:courses(duration_hours)")
    .eq("user_id", userId);

  if (error) throw error;

  const totalCourses = (userEnrollments || []).length;
  const completedCourses = (userEnrollments || []).filter(
    (e) => Number(e.progress) >= 100,
  ).length;
  const totalHours = (userEnrollments || []).reduce((sum, e: any) => {
    const course = Array.isArray(e.course) ? e.course[0] : e.course;
    return sum + (course?.duration_hours || 0);
  }, 0);

  return { totalCourses, completedCourses, totalHours };
}

// Student dashboard methods
export async function getStudentPendingAssignments(
  userId: string,
): Promise<any[]> {
  const { data: enrollmentsData, error: enrollError } = await supabaseAdmin
    .from("enrollments")
    .select("course_id")
    .eq("user_id", userId);

  if (enrollError) throw enrollError;
  const courseIds = (enrollmentsData || []).map((e) => e.course_id);
  if (courseIds.length === 0) return [];

  const { data: assignmentsData, error } = await supabaseAdmin
    .from("assignments")
    .select(
      `
        *,
        lesson:lessons!inner(
          module:modules!inner(
            course_id,
            course:courses(title)
          )
        )
      `,
    )
    .in("lesson.module.course_id", courseIds);

  if (error) throw error;

  const { data: submissions } = await supabaseAdmin
    .from("assignment_submissions")
    .select("assignment_id")
    .eq("user_id", userId);

  const submittedIds = new Set(submissions?.map((s) => s.assignment_id) || []);

  return (assignmentsData || [])
    .filter((a) => !submittedIds.has(a.id))
    .map((a) => {
      const course = Array.isArray(a.lesson?.module?.course)
        ? a.lesson.module.course[0]
        : a.lesson?.module?.course;
      return {
        id: a.id,
        title: a.title,
        course: { title: course?.title },
        dueDate: a.due_date,
        submissionStatus: "pending",
      };
    });
}

export async function getStudentPendingQuizzes(userId: string): Promise<any[]> {
  const { data: enrollmentsData, error: enrollError } = await supabaseAdmin
    .from("enrollments")
    .select("course_id")
    .eq("user_id", userId);

  if (enrollError) throw enrollError;
  const courseIds = (enrollmentsData || []).map((e) => e.course_id);
  if (courseIds.length === 0) return [];

  const { data: quizzesData, error } = await supabaseAdmin
    .from("quizzes")
    .select(
      `
        *,
        lesson:lessons!inner(
          module:modules!inner(
            course_id,
            course:courses(title)
          )
        ),
        quiz_questions(id)
      `,
    )
    .in("lesson.module.course_id", courseIds);

  if (error) throw error;

  const { data: attempts } = await supabaseAdmin
    .from("quiz_attempts")
    .select("quiz_id")
    .eq("user_id", userId)
    .not("completed_at", "is", null);

  const completedQuizIds = new Set(attempts?.map((a) => a.quiz_id) || []);

  return (quizzesData || [])
    .filter((q) => !completedQuizIds.has(q.id))
    .map((q) => {
      const course = Array.isArray(q.lesson?.module?.course)
        ? q.lesson.module.course[0]
        : q.lesson?.module?.course;
      return {
        id: q.id,
        title: q.title,
        course: { title: course?.title },
        questionCount: q.quiz_questions?.length || 0,
        timeLimit: q.time_limit,
      };
    });
}

export async function getStudentDownloadableResources(
  userId: string,
): Promise<any[]> {
  const { data: enrolled, error: enrollError } = await supabaseAdmin
    .from("enrollments")
    .select("course_id")
    .eq("user_id", userId);

  if (enrollError) throw enrollError;
  const courseIds = (enrolled || [])
    .map((e) => e.course_id)
    .filter(Boolean) as string[];
  if (courseIds.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from("course_resources")
    .select("*")
    .in("course_id", courseIds)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return data || [];
}
