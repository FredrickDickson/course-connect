import { supabase } from "@/integrations/supabase/client";
import { apiRequest } from "@/lib/queryClient";

export interface QuizQuestionInput {
  question: string;
  questionType: "multiple_choice" | "true_false" | "fill_blank";
  points?: number;
  order?: number;
  correctAnswer?: string;
  answers?: { answer: string; isCorrect: boolean; order?: number }[];
}

export interface QuizInput {
  title: string;
  description?: string | null;
  timeLimit?: number | null;
  passingScore?: number;
  maxAttempts?: number;
  questions: QuizQuestionInput[];
}

export interface AssignmentInput {
  title: string;
  description?: string;
  instructions?: string;
  maxPoints?: number;
  dueDate?: string | null;
  allowLateSubmission?: boolean;
}

export async function fetchQuizForLesson(lessonId: string) {
  const { data: quiz, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("lesson_id", lessonId)
    .maybeSingle();
  if (error) throw error;
  if (!quiz) return null;

  const { data: questionsRaw } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", quiz.id)
    .order("order");

  const questions = await Promise.all(
    (questionsRaw || []).map(async (q: any) => {
      const { data: answersRaw } = await supabase
        .from("quiz_answers")
        .select("*")
        .eq("question_id", q.id)
        .order("order");
      const answers = (answersRaw || []).map((a: any) => ({
        id: a.id,
        answer: a.answer,
        isCorrect: !!a.is_correct,
      }));
      return {
        id: q.id,
        question: q.question,
        questionType: q.question_type,
        points: q.points ?? 1,
        order: q.order,
        answers: q.question_type === "fill_blank" ? [] : answers,
        correctAnswer:
          q.question_type === "fill_blank" ? answers[0]?.answer || "" : undefined,
      };
    }),
  );

  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description || "",
    timeLimit: quiz.time_limit_minutes || undefined,
    passingScore: quiz.passing_score ?? 80,
    maxAttempts: quiz.max_attempts ?? 3,
    questions,
  };
}

// Same shape as fetchQuizForLesson but looked up by quiz id directly -- needed
// for course/session-anchored quizzes, which have no lesson_id to key off of.
export async function fetchQuizById(quizId: string) {
  const { data: quiz, error } = await supabase.from("quizzes").select("*").eq("id", quizId).maybeSingle();
  if (error) throw error;
  if (!quiz) return null;

  const { data: questionsRaw } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", quiz.id)
    .order("order");

  const questions = await Promise.all(
    (questionsRaw || []).map(async (q: any) => {
      const { data: answersRaw } = await supabase
        .from("quiz_answers")
        .select("*")
        .eq("question_id", q.id)
        .order("order");
      const answers = (answersRaw || []).map((a: any) => ({
        id: a.id,
        answer: a.answer,
        isCorrect: !!a.is_correct,
      }));
      return {
        id: q.id,
        question: q.question,
        questionType: q.question_type,
        points: q.points ?? 1,
        order: q.order,
        answers: q.question_type === "fill_blank" ? [] : answers,
        correctAnswer:
          q.question_type === "fill_blank" ? answers[0]?.answer || "" : undefined,
      };
    }),
  );

  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description || "",
    timeLimit: quiz.time_limit_minutes || undefined,
    passingScore: quiz.passing_score ?? 80,
    maxAttempts: quiz.max_attempts ?? 3,
    postedAt: quiz.posted_at,
    questions,
  };
}

export async function upsertQuiz(lessonId: string, input: QuizInput) {
  // A single RPC call is one DB transaction, so a failure partway through (bad row,
  // RLS denial, etc.) rolls back everything instead of leaving a broken partial quiz
  // behind, which is what the previous four-separate-calls implementation risked.
  const questionsPayload = (input.questions || []).map((q) => ({
    question: q.question,
    questionType: q.questionType,
    points: q.points ?? 1,
    correctAnswer: q.correctAnswer,
    answers:
      q.questionType === "fill_blank"
        ? []
        : (q.answers || []).map((a) => ({ answer: a.answer, isCorrect: !!a.isCorrect })),
  }));

  const { data, error } = await (supabase as any).rpc("upsert_quiz", {
    _lesson_id: lessonId,
    _title: input.title,
    _description: input.description || null,
    _time_limit_minutes: input.timeLimit || null,
    _passing_score: input.passingScore ?? 80,
    _max_attempts: input.maxAttempts ?? 3,
    _questions: questionsPayload,
  });
  if (error) throw error;
  return data as string;
}

export async function deleteQuizByLesson(lessonId: string) {
  const { error } = await supabase
    .from("quizzes")
    .delete()
    .eq("lesson_id", lessonId);
  if (error) throw error;
}

export async function fetchAssignmentForLesson(lessonId: string) {
  const { data, error } = await supabase
    .from("assignments")
    .select("*")
    .eq("lesson_id", lessonId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    title: data.title,
    description: data.description || "",
    instructions: data.instructions || "",
    maxPoints: data.max_score ?? 100,
    dueDate: data.due_date || "",
    allowLateSubmission: data.allow_late_submission ?? true,
  };
}

export async function upsertAssignment(lessonId: string, input: AssignmentInput) {
  const { data: existing } = await supabase
    .from("assignments")
    .select("id")
    .eq("lesson_id", lessonId)
    .maybeSingle();

  const payload = {
    title: input.title,
    description: input.description || "",
    instructions: input.instructions || null,
    max_score: input.maxPoints ?? 100,
    due_date: input.dueDate || null,
    allow_late_submission: input.allowLateSubmission ?? true,
  };

  if (existing) {
    const { error } = await supabase
      .from("assignments")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await supabase
    .from("assignments")
    .insert({ lesson_id: lessonId, ...payload })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function deleteAssignmentByLesson(lessonId: string) {
  const { error } = await supabase
    .from("assignments")
    .delete()
    .eq("lesson_id", lessonId);
  if (error) throw error;
}

// ============================================================================
// COURSE / SESSION-ANCHORED ASSIGNMENTS & QUIZZES
// ============================================================================
// Unlike the lesson-anchored functions above (which write directly to Supabase
// and auto-post), these go through server/routes/assignments-extended.ts: they
// start as drafts and need the server's audience-resolution + notification
// fan-out on "post", so a direct table write isn't enough.

export type CourseworkAnchor = { type: "course" | "session"; id: string };

export interface AnchoredAssignmentInput extends AssignmentInput {
  groupMode?: "individual" | "group";
  allowGroupMeetings?: boolean;
}

export async function createAnchoredAssignment(anchor: CourseworkAnchor, input: AnchoredAssignmentInput) {
  const res = await apiRequest("POST", `/api/assignments-ext/${anchor.type === "course" ? "courses" : "sessions"}/${anchor.id}/assignments`, input);
  return res.json();
}

export async function updateAssignmentById(assignmentId: string, input: Partial<AnchoredAssignmentInput>) {
  const res = await apiRequest("PATCH", `/api/assignments-ext/assignments/${assignmentId}`, input);
  return res.json();
}

export async function postAssignment(assignmentId: string) {
  const res = await apiRequest("POST", `/api/assignments-ext/assignments/${assignmentId}/post`, {});
  return res.json();
}

export async function createAnchoredQuiz(anchor: CourseworkAnchor, input: QuizInput) {
  const res = await apiRequest("POST", `/api/assignments-ext/${anchor.type === "course" ? "courses" : "sessions"}/${anchor.id}/quizzes`, input);
  return res.json();
}

export async function updateQuizById(quizId: string, input: QuizInput) {
  const res = await apiRequest("PATCH", `/api/assignments-ext/quizzes/${quizId}`, input);
  return res.json();
}

export async function postQuiz(quizId: string) {
  const res = await apiRequest("POST", `/api/assignments-ext/quizzes/${quizId}/post`, {});
  return res.json();
}

export async function fetchCourseworkFor(anchor: CourseworkAnchor): Promise<{ assignments: any[]; quizzes: any[] }> {
  const res = await apiRequest("GET", `/api/assignments-ext/${anchor.type === "course" ? "courses" : "sessions"}/${anchor.id}/assignments-and-quizzes`);
  return res.json();
}

export interface PresentationInput {
  fileUrl: string;
  fileName: string;
  fileType?: "pdf" | "pptx";
  pageCount?: number | null;
  allowDownload?: boolean;
}

export async function fetchPresentationForLesson(lessonId: string) {
  const { data, error } = await supabase
    .from("presentations")
    .select("*")
    .eq("lesson_id", lessonId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    fileUrl: data.file_url,
    fileName: data.file_name,
    fileType: data.file_type as "pdf" | "pptx",
    pageCount: data.page_count ?? null,
    allowDownload: data.allow_download ?? false,
  };
}

export async function upsertPresentation(lessonId: string, input: PresentationInput) {
  const { data: existing } = await supabase
    .from("presentations")
    .select("id")
    .eq("lesson_id", lessonId)
    .maybeSingle();

  const payload = {
    file_url: input.fileUrl,
    file_name: input.fileName,
    file_type: input.fileType || "pdf",
    page_count: input.pageCount ?? null,
    allow_download: input.allowDownload ?? true,
  };

  if (existing) {
    const { error } = await supabase
      .from("presentations")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await supabase
    .from("presentations")
    .insert({ lesson_id: lessonId, ...payload })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function deletePresentationByLesson(lessonId: string) {
  const { error } = await supabase
    .from("presentations")
    .delete()
    .eq("lesson_id", lessonId);
  if (error) throw error;
}
