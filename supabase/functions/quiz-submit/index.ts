import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(401, { error: "Unauthorized" });
    }
    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) return json(401, { error: "Unauthorized" });
    const userId = userData.user.id;

    const body = await req.json().catch(() => null) as
      | { quizId?: string; responses?: any[]; timeSpentSeconds?: number }
      | null;
    if (!body || typeof body.quizId !== "string" || !Array.isArray(body.responses)) {
      return json(400, { error: "Invalid request body" });
    }
    const { quizId, responses, timeSpentSeconds = 0 } = body;

    const admin = createClient(supabaseUrl, serviceKey);

    // Load quiz with questions + answers
    const { data: quiz, error: quizErr } = await admin
      .from("quizzes")
      .select(
        `id, passing_score, max_attempts,
         questions:quiz_questions!quiz_questions_quiz_id_fkey(
           id, question_type, points,
           answers:quiz_answers!quiz_answers_question_id_fkey(id, answer, is_correct)
         )`,
      )
      .eq("id", quizId)
      .single();
    if (quizErr || !quiz) return json(404, { error: "Quiz not found" });

    // Enforce max_attempts
    const { count: attemptsCount } = await admin
      .from("quiz_attempts")
      .select("id", { count: "exact", head: true })
      .eq("quiz_id", quizId)
      .eq("user_id", userId);
    const maxAttempts = quiz.max_attempts ?? 3;
    if ((attemptsCount ?? 0) >= maxAttempts) {
      return json(403, { error: "Maximum attempts reached" });
    }

    const respByQ = new Map<string, { answerId?: string; responseText?: string }>();
    for (const r of responses) {
      if (r && typeof r.questionId === "string") {
        respByQ.set(r.questionId, {
          answerId: typeof r.answerId === "string" ? r.answerId : undefined,
          responseText: typeof r.responseText === "string" ? r.responseText : undefined,
        });
      }
    }

    let totalPoints = 0;
    let earnedPoints = 0;
    const responseRows: any[] = [];

    for (const q of (quiz.questions ?? []) as any[]) {
      const points = q.points ?? 1;
      totalPoints += points;
      const r = respByQ.get(q.id);
      let isCorrect: boolean | null = false;
      let pointsEarned = 0;
      let answerId: string | null = null;
      let responseText: string | null = null;

      if (q.question_type === "multiple_choice" || q.question_type === "true_false") {
        if (r?.answerId) {
          answerId = r.answerId;
          const chosen = (q.answers ?? []).find((a: any) => a.id === r.answerId);
          isCorrect = !!chosen?.is_correct;
          if (isCorrect) {
            pointsEarned = points;
            earnedPoints += points;
          }
        }
      } else if (q.question_type === "fill_blank") {
        responseText = r?.responseText ?? "";
        const norm = responseText.trim().toLowerCase();
        if (norm.length > 0) {
          const match = (q.answers ?? []).some(
            (a: any) => a.is_correct && a.answer.trim().toLowerCase() === norm,
          );
          isCorrect = match;
          if (match) {
            pointsEarned = points;
            earnedPoints += points;
          }
        }
      } else {
        // essay or unknown — needs manual grading
        responseText = r?.responseText ?? "";
        isCorrect = null;
      }

      responseRows.push({
        question_id: q.id,
        answer_id: answerId,
        response_text: responseText,
        is_correct: isCorrect,
        points_earned: pointsEarned,
      });
    }

    const score = totalPoints > 0
      ? Math.round((earnedPoints / totalPoints) * 100)
      : 0;
    const passed = score >= (quiz.passing_score ?? 70);
    const timeMinutes = Math.max(0, Math.ceil((timeSpentSeconds || 0) / 60));

    const { data: attempt, error: attemptErr } = await admin
      .from("quiz_attempts")
      .insert({
        user_id: userId,
        quiz_id: quizId,
        score,
        passed,
        total_points: totalPoints,
        time_spent_minutes: timeMinutes,
        started_at: new Date(Date.now() - (timeSpentSeconds || 0) * 1000).toISOString(),
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (attemptErr || !attempt) {
      return json(500, { error: attemptErr?.message ?? "Failed to record attempt" });
    }

    if (responseRows.length > 0) {
      const rows = responseRows.map((r) => ({ ...r, attempt_id: attempt.id }));
      const { error: respErr } = await admin.from("quiz_responses").insert(rows);
      if (respErr) {
        return json(500, { error: respErr.message });
      }
    }

    return json(200, {
      attemptId: attempt.id,
      score,
      passed,
      totalPoints,
      earnedPoints,
    });
  } catch (e) {
    console.error("quiz-submit error", e);
    return json(500, { error: (e as Error)?.message ?? "Internal error" });
  }
});