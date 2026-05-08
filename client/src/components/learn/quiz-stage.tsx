import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Play, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LearnLesson } from "./types";

const sb: any = supabase;

export default function QuizStage({ lesson }: { lesson: LearnLesson }) {
  const { user } = useAuth();
  const { data: quiz } = useQuery({
    queryKey: ["lesson-quiz", lesson.id],
    queryFn: async () => {
      const { data, error } = await sb.from("quizzes")
        .select("*, questions:quiz_questions(id)")
        .eq("lesson_id", lesson.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: attempts = [] } = useQuery({
    queryKey: ["quiz-attempts-stage", quiz?.id, user?.id],
    enabled: !!quiz?.id && !!user?.id,
    queryFn: async () => {
      const { data, error } = await sb.from("quiz_attempts")
        .select("*").eq("quiz_id", quiz.id).eq("user_id", user!.id);
      if (error) throw error;
      return data || [];
    },
  });
  const passed = attempts.some((a: any) => a.passed);
  const used = attempts.length;
  const max = quiz?.max_attempts || 0;

  return (
    <div className="bg-background min-h-[60vh] py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
          <HelpCircle className="h-4 w-4" /> Quiz
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-serif">{lesson.title}</h1>

        {!quiz ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">No quiz attached to this lesson yet.</CardContent></Card>
        ) : (
          <Card><CardContent className="p-6 space-y-4">
            <div>
              <h3 className="font-semibold">{quiz.title}</h3>
              {quiz.description && <p className="text-sm text-muted-foreground mt-1">{quiz.description}</p>}
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">{quiz.questions?.length || 0} questions</Badge>
              {quiz.time_limit_minutes ? <Badge variant="outline">{quiz.time_limit_minutes} min</Badge> : null}
              <Badge variant="outline">Passing {quiz.passing_score}%</Badge>
              {max > 0 && <Badge variant="outline">{used} / {max} attempts</Badge>}
              {passed && <Badge className="bg-[#22C55E] text-white border-0"><Check className="h-3 w-3 mr-1" />Passed</Badge>}
            </div>
            <div className="flex justify-end">
              <Link href={`/quiz/${quiz.id}`}>
                <Button className="bg-[#B91C1C] hover:bg-[#A01818]">
                  <Play className="h-4 w-4 mr-1" />{passed ? "Retake" : used > 0 ? "Continue" : "Start quiz"}
                </Button>
              </Link>
            </div>
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}
