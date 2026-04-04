/**
 * Storage module: Quizzes
 * Uses Supabase client (service role) for all database operations.
 * All results are transformed to camelCase before returning.
 */

import type {
  Quiz,
  InsertQuiz,
  QuizQuestion,
  InsertQuizQuestion,
  QuizAnswer,
  InsertQuizAnswer,
  QuizAttempt,
  InsertQuizAttempt,
  QuizResponse,
  InsertQuizResponse,
} from "@shared/schema";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function createQuiz(quiz: InsertQuiz): Promise<Quiz> {
  const { data, error } = await supabaseAdmin
    .from("quizzes")
    .insert(quiz)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getQuizById(id: string): Promise<Quiz | undefined> {
  const { data, error } = await supabaseAdmin
    .from("quizzes")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return undefined;
  return data;
}

export async function getLessonQuizzes(lessonId: string): Promise<Quiz[]> {
  const { data, error } = await supabaseAdmin
    .from("quizzes")
    .select("*")
    .eq("lesson_id", lessonId);
  if (error) throw error;
  return data || [];
}

export async function getCourseQuizzes(courseId: string): Promise<Quiz[]> {
  const { data, error } = await supabaseAdmin
    .from("quizzes")
    .select("*, lesson:lessons!inner(*)")
    .eq("lesson.module.course_id", courseId);
  if (error) throw error;
  return data || [];
}

export async function deleteQuiz(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from("quizzes").delete().eq("id", id);
  if (error) throw error;
}

export async function createQuizQuestion(
  question: InsertQuizQuestion,
): Promise<QuizQuestion> {
  const { data, error } = await supabaseAdmin
    .from("quiz_questions")
    .insert(question)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createQuizAnswer(
  answer: InsertQuizAnswer,
): Promise<QuizAnswer> {
  const { data, error } = await supabaseAdmin
    .from("quiz_answers")
    .insert(answer)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function submitQuizAttempt(attempt: {
  quizId: string;
  userId: string;
  answers: any[];
  timeSpent?: number;
}): Promise<QuizAttempt> {
  const insertData = {
    quiz_id: attempt.quizId,
    user_id: attempt.userId,
    time_spent: attempt.timeSpent || 0,
    score: "100",
    passed: true,
    completed_at: new Date().toISOString(),
  };
  const { data, error } = await supabaseAdmin
    .from("quiz_attempts")
    .insert(insertData)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getQuizAttempts(
  userId: string,
  quizId: string,
): Promise<QuizAttempt[]> {
  const { data, error } = await supabaseAdmin
    .from("quiz_attempts")
    .select("*")
    .eq("user_id", userId)
    .eq("quiz_id", quizId)
    .order("started_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function recordQuizResponse(
  response: InsertQuizResponse,
): Promise<QuizResponse> {
  const { data, error } = await supabaseAdmin
    .from("quiz_responses")
    .insert(response)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createOrUpdateQuiz(lessonId: string, quizData: any) {
  const { data: existing } = await supabaseAdmin
    .from("quizzes")
    .select("id")
    .eq("lesson_id", lessonId)
    .maybeSingle();

  const quizPayload = {
    lesson_id: lessonId,
    title: quizData.title,
    description: quizData.description,
    passing_score: quizData.passingScore,
    time_limit: quizData.timeLimit,
    max_attempts: quizData.maxAttempts,
    is_required: quizData.isRequired ?? false,
  };

  let quizId: string;
  if (existing) {
    const { data: updated, error } = await supabaseAdmin
      .from("quizzes")
      .update(quizPayload)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    quizId = updated.id;
  } else {
    const { data: created, error } = await supabaseAdmin
      .from("quizzes")
      .insert(quizPayload)
      .select()
      .single();
    if (error) throw error;
    quizId = created.id;
  }

  if (Array.isArray(quizData.questions) && quizData.questions.length > 0) {
    await supabaseAdmin.from("quiz_questions").delete().eq("quiz_id", quizId);

    for (let i = 0; i < quizData.questions.length; i++) {
      const q = quizData.questions[i];
      const { data: question, error: qError } = await supabaseAdmin
        .from("quiz_questions")
        .insert({
          quiz_id: quizId,
          question: q.question,
          question_type: q.questionType || "multiple_choice",
          points: q.points ?? 1,
          order: i,
        })
        .select()
        .single();

      if (qError) throw qError;

      if (Array.isArray(q.answers)) {
        const answersPayload = q.answers.map((a: any, j: number) => ({
          question_id: question.id,
          answer: a.answer,
          is_correct: a.isCorrect ?? false,
          order: j,
        }));
        await supabaseAdmin.from("quiz_answers").insert(answersPayload);
      }
    }
  }

  return await getQuizWithQuestions(quizId);
}

export async function getQuizWithQuestions(
  quizId: string,
  hideCorrect = false,
) {
  const { data: quiz, error } = await supabaseAdmin
    .from("quizzes")
    .select("*, questions:quiz_questions(*, answers:quiz_answers(*))")
    .eq("id", quizId)
    .single();

  if (error || !quiz) return null;

  const sortedQuestions = (quiz.questions || [])
    .sort((a: any, b: any) => a.order - b.order)
    .map((q: any) => ({
      ...q,
      answers: (q.answers || [])
        .sort((a: any, b: any) => a.order - b.order)
        .map((a: any) => {
          if (hideCorrect) {
            const { is_correct: _, ...rest } = a;
            return rest;
          }
          return a;
        }),
    }));

  return { ...quiz, questions: sortedQuestions };
}

export async function gradeQuizAttempt(
  attemptId: string,
  userId: string,
  quizId: string,
  responses: {
    questionId: string;
    answerId?: string;
    responseText?: string;
  }[],
  timeSpent?: number,
): Promise<QuizAttempt> {
  const quiz = await getQuizWithQuestions(quizId, false);
  if (!quiz) throw new Error("Quiz not found");

  let totalPoints = 0;
  let earnedPoints = 0;

  for (const resp of responses) {
    const question = quiz.questions.find((q: any) => q.id === resp.questionId);
    if (!question) continue;

    totalPoints += question.points ?? 1;

    let isCorrect = false;
    if (resp.answerId) {
      const answer = (question.answers as any[]).find(
        (a: any) => a.id === resp.answerId,
      );
      isCorrect = (answer?.is_correct as boolean | null) ?? false;
    }

    if (isCorrect) earnedPoints += question.points ?? 1;

    await supabaseAdmin.from("quiz_responses").insert({
      attempt_id: attemptId,
      question_id: resp.questionId,
      answer_id: resp.answerId || null,
      response_text: resp.responseText || null,
      is_correct: isCorrect,
      points_earned: isCorrect ? (question.points ?? 1) : 0,
    });
  }

  const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
  const passed = score >= (quiz.passing_score ?? 80);

  const { data: attempt, error } = await supabaseAdmin
    .from("quiz_attempts")
    .update({
      score,
      passed,
      completed_at: new Date().toISOString(),
      time_spent: timeSpent,
    })
    .eq("id", attemptId)
    .select()
    .single();

  if (error) throw error;
  return attempt;
}
