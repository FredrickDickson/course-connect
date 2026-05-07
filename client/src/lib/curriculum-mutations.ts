import { supabase } from "@/integrations/supabase/client";

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

export async function upsertQuiz(lessonId: string, input: QuizInput) {
  // Delete existing quiz (cascade removes questions and answers)
  const { data: existing } = await supabase
    .from("quizzes")
    .select("id")
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (existing) {
    const { error: delErr } = await supabase
      .from("quizzes")
      .delete()
      .eq("id", existing.id);
    if (delErr) throw delErr;
  }

  const { data: quiz, error: quizErr } = await supabase
    .from("quizzes")
    .insert({
      lesson_id: lessonId,
      title: input.title,
      description: input.description || null,
      time_limit_minutes: input.timeLimit || null,
      passing_score: input.passingScore ?? 80,
      max_attempts: input.maxAttempts ?? 3,
    })
    .select("id")
    .single();
  if (quizErr) throw quizErr;

  const questionsToInsert = (input.questions || []).map((q, idx) => ({
    quiz_id: quiz.id,
    question: q.question,
    question_type: q.questionType,
    points: q.points ?? 1,
    order: q.order ?? idx,
  }));

  if (questionsToInsert.length === 0) return quiz.id;

  const { data: insertedQuestions, error: qErr } = await supabase
    .from("quiz_questions")
    .insert(questionsToInsert)
    .select("id");
  if (qErr) throw qErr;

  const answerRows: any[] = [];
  insertedQuestions.forEach((row: any, i: number) => {
    const src = input.questions[i];
    if (src.questionType === "fill_blank") {
      const v = (src.correctAnswer || "").trim();
      if (v) {
        answerRows.push({
          question_id: row.id,
          answer: v,
          is_correct: true,
          order: 0,
        });
      }
    } else {
      (src.answers || []).forEach((a, idx) =>
        answerRows.push({
          question_id: row.id,
          answer: a.answer,
          is_correct: !!a.isCorrect,
          order: a.order ?? idx,
        }),
      );
    }
  });

  if (answerRows.length > 0) {
    const { error: aErr } = await supabase.from("quiz_answers").insert(answerRows);
    if (aErr) throw aErr;
  }

  return quiz.id;
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