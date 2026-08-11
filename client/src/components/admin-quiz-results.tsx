/**
 * Admin Quiz Results — platform-wide, read-only view of quiz attempts and
 * scores. Quiz authoring (create/edit/bulk-import) already happens in the
 * curriculum editor; this tab covers the piece that was missing: seeing how
 * students actually performed.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Search, ClipboardList, CheckCircle2, XCircle, Clock, Users,
} from "lucide-react";

interface QuizRow {
  id: string;
  title: string;
  passing_score: number | null;
  max_attempts: number | null;
  lesson: {
    title: string | null;
    module: {
      course: { id: string; title: string } | null;
    } | null;
  } | null;
}

interface AttemptRow {
  id: string;
  quiz_id: string | null;
  user_id: string | null;
  score: number | null;
  total_points: number | null;
  passed: boolean | null;
  started_at: string | null;
  completed_at: string | null;
  time_spent_minutes: number | null;
  user?: { first_name: string | null; last_name: string | null; email: string | null } | null;
}

interface ResponseRow {
  id: string;
  question_id: string | null;
  answer_id: string | null;
  response_text: string | null;
  is_correct: boolean | null;
  points_earned: number | null;
  question?: { question: string; points: number | null } | null;
  answer?: { answer: string } | null;
}

export default function AdminQuizResults() {
  const [search, setSearch] = useState("");
  const [selectedQuiz, setSelectedQuiz] = useState<QuizRow | null>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<AttemptRow | null>(null);

  const { data: quizzes = [], isLoading: quizzesLoading } = useQuery({
    queryKey: ["admin-quizzes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select(
          "id, title, passing_score, max_attempts, lesson:lessons(title, module:modules(course:courses(id, title)))",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as QuizRow[];
    },
  });

  const { data: attempts = [], isLoading: attemptsLoading } = useQuery({
    queryKey: ["admin-quiz-attempts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("id, quiz_id, user_id, score, total_points, passed, started_at, completed_at, time_spent_minutes, user:users(first_name, last_name, email)")
        .order("started_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as AttemptRow[];
    },
  });

  const { data: attemptResponses = [], isLoading: responsesLoading } = useQuery({
    queryKey: ["admin-quiz-attempt-responses", selectedAttempt?.id],
    enabled: !!selectedAttempt,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_responses")
        .select("id, question_id, answer_id, response_text, is_correct, points_earned, question:quiz_questions(question, points), answer:quiz_answers(answer)")
        .eq("attempt_id", selectedAttempt!.id);
      if (error) throw error;
      return (data || []) as unknown as ResponseRow[];
    },
  });

  const attemptsByQuiz = attempts.reduce<Record<string, AttemptRow[]>>((acc, a) => {
    if (!a.quiz_id) return acc;
    (acc[a.quiz_id] ||= []).push(a);
    return acc;
  }, {});

  const filteredQuizzes = quizzes.filter((q) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      q.title.toLowerCase().includes(s) ||
      q.lesson?.module?.course?.title?.toLowerCase().includes(s) ||
      q.lesson?.title?.toLowerCase().includes(s)
    );
  });

  const selectedAttempts = selectedQuiz ? attemptsByQuiz[selectedQuiz.id] || [] : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Quiz Results</h2>
        <Badge variant="secondary">{quizzes.length} quizzes</Badge>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search quizzes, lessons, courses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {quizzesLoading || attemptsLoading ? (
        <Card className="animate-pulse"><CardContent className="p-6"><div className="h-40 bg-muted rounded" /></CardContent></Card>
      ) : filteredQuizzes.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No quizzes found</h3>
        </CardContent></Card>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Quiz</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Course</th>
                <th className="text-left p-3 font-medium hidden lg:table-cell">Lesson</th>
                <th className="text-right p-3 font-medium">Attempts</th>
                <th className="text-right p-3 font-medium">Avg Score</th>
                <th className="text-right p-3 font-medium">Pass Rate</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuizzes.map((q) => {
                const qAttempts = attemptsByQuiz[q.id] || [];
                const completed = qAttempts.filter((a) => a.completed_at);
                const avgScore = completed.length
                  ? Math.round(completed.reduce((s, a) => s + (a.score || 0), 0) / completed.length)
                  : null;
                const passRate = completed.length
                  ? Math.round((completed.filter((a) => a.passed).length / completed.length) * 100)
                  : null;
                return (
                  <tr key={q.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedQuiz(q)}>
                    <td className="p-3 font-medium max-w-[220px] truncate">{q.title}</td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground text-xs">{q.lesson?.module?.course?.title || "—"}</td>
                    <td className="p-3 hidden lg:table-cell text-muted-foreground text-xs">{q.lesson?.title || "—"}</td>
                    <td className="p-3 text-right">{qAttempts.length}</td>
                    <td className="p-3 text-right">{avgScore != null ? `${avgScore}%` : "—"}</td>
                    <td className="p-3 text-right">
                      {passRate != null ? (
                        <Badge className={passRate >= 70 ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>
                          {passRate}%
                        </Badge>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Quiz detail drawer — attempts list */}
      <Sheet open={!!selectedQuiz} onOpenChange={(open) => { if (!open) { setSelectedQuiz(null); setSelectedAttempt(null); } }}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader><SheetTitle>{selectedQuiz?.title}</SheetTitle></SheetHeader>
          {selectedQuiz && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold">{selectedAttempts.length}</p>
                  <p className="text-[10px] text-muted-foreground">Attempts</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold">{selectedQuiz.passing_score ?? "—"}%</p>
                  <p className="text-[10px] text-muted-foreground">Passing Score</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold">{selectedQuiz.max_attempts ?? "∞"}</p>
                  <p className="text-[10px] text-muted-foreground">Max Attempts</p>
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  <Users className="w-3.5 h-3.5 inline mr-1" /> Attempts
                </h4>
                {selectedAttempts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No attempts yet.</p>
                ) : (
                  selectedAttempts.map((a) => (
                    <button
                      key={a.id}
                      className="w-full text-left flex items-center justify-between py-2 px-2 rounded hover:bg-muted/30 text-sm"
                      onClick={() => setSelectedAttempt(a)}
                    >
                      <div>
                        <p className="font-medium">
                          {a.user ? `${a.user.first_name || ""} ${a.user.last_name || ""}`.trim() || a.user.email : "Unknown user"}
                        </p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {a.completed_at ? new Date(a.completed_at).toLocaleString() : "In progress"}
                          {a.time_spent_minutes != null && ` · ${a.time_spent_minutes} min`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono">{a.score != null ? `${a.score}%` : "—"}</span>
                        {a.passed === true && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                        {a.passed === false && <XCircle className="w-4 h-4 text-red-500" />}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Attempt detail drawer — per-question breakdown */}
      <Sheet open={!!selectedAttempt} onOpenChange={(open) => { if (!open) setSelectedAttempt(null); }}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {selectedAttempt?.user
                ? `${selectedAttempt.user.first_name || ""} ${selectedAttempt.user.last_name || ""}`.trim() || selectedAttempt.user.email
                : "Attempt"}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {responsesLoading ? (
              <div className="h-40 bg-muted rounded animate-pulse" />
            ) : attemptResponses.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No responses recorded.</p>
            ) : (
              attemptResponses.map((r) => (
                <Card key={r.id}>
                  <CardContent className="p-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{r.question?.question || "Question"}</p>
                      {r.is_correct === true && <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />}
                      {r.is_correct === false && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Answered: {r.answer?.answer || r.response_text || "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {r.points_earned ?? 0} / {r.question?.points ?? "?"} points
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
