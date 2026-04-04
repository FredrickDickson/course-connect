/**
 * Storage module: Assignments
 * Uses Supabase client (service role) for all database operations.
 * All results are transformed to camelCase before returning.
 */

import type {
  Assignment,
  InsertAssignment,
  AssignmentSubmission,
  InsertAssignmentSubmission,
} from "@shared/schema";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function createAssignment(
  assignment: InsertAssignment,
): Promise<Assignment> {
  const { data, error } = await supabaseAdmin
    .from("assignments")
    .insert(assignment)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getAssignmentById(
  id: string,
): Promise<Assignment | undefined> {
  const { data, error } = await supabaseAdmin
    .from("assignments")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return undefined;
  return data;
}

export async function getAssignmentByLessonId(
  lessonId: string,
): Promise<Assignment | null> {
  const { data, error } = await supabaseAdmin
    .from("assignments")
    .select("*")
    .eq("lesson_id", lessonId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function getLessonAssignments(
  lessonId: string,
): Promise<Assignment[]> {
  const { data, error } = await supabaseAdmin
    .from("assignments")
    .select("*")
    .eq("lesson_id", lessonId);
  if (error) throw error;
  return data || [];
}

export async function deleteAssignment(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("assignments")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function submitAssignment(
  submission: InsertAssignmentSubmission,
): Promise<AssignmentSubmission> {
  const { data, error } = await supabaseAdmin
    .from("assignment_submissions")
    .insert(submission)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function gradeAssignment(
  submissionId: string,
  score: number,
  feedback: string,
  graderId: string,
): Promise<AssignmentSubmission> {
  const { data, error } = await supabaseAdmin
    .from("assignment_submissions")
    .update({
      score,
      feedback,
      graded_by: graderId,
      graded_at: new Date().toISOString(),
    })
    .eq("id", submissionId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getUserAssignmentSubmissions(
  userId: string,
  assignmentId: string,
): Promise<AssignmentSubmission[]> {
  const { data, error } = await supabaseAdmin
    .from("assignment_submissions")
    .select("*")
    .eq("user_id", userId)
    .eq("assignment_id", assignmentId);
  if (error) throw error;
  return data || [];
}

export async function createOrUpdateAssignment(
  lessonId: string,
  assignmentData: any,
) {
  const assignmentPayload = {
    lesson_id: lessonId,
    title: assignmentData.title,
    description: assignmentData.description,
    instructions: assignmentData.instructions ?? null,
    max_score: assignmentData.maxScore ?? assignmentData.maxPoints ?? 100,
    due_date: assignmentData.dueDate
      ? new Date(assignmentData.dueDate).toISOString()
      : null,
    allow_late_submission: assignmentData.allowLateSubmission ?? true,
    is_required: assignmentData.isRequired ?? false,
  };

  const { data, error } = await supabaseAdmin
    .from("assignments")
    .upsert(assignmentPayload, { onConflict: "lesson_id" })
    .select()
    .single();

  if (error) throw error;
  return data;
}
