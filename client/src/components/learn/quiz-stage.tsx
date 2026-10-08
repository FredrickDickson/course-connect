import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { HelpCircle, Play, Check, ChevronLeft, ChevronRight, Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { LearnLesson } from "./types";

const sb: any = supabase;

interface QuizQuestion {
  id: string;
  question: string;
  question_type: string;
  points: number;
  order: number;
  answers?: QuizAnswer[];
}

interface QuizAnswer {
  id: string;
  answer: string;
  is_correct: boolean;
  order: number;
}

export default function QuizStage({ lesson, onComplete }: { lesson: LearnLesson; onComplete?: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [attemptResult, setAttemptResult] = useState<any>(null);

  const { data: quiz } = useQuery({
    queryKey: ["lesson-quiz", lesson.id],
    queryFn: async () => {
      const { data: quizRow, error } = await sb.from("quizzes")
        .select("*")
        .eq("lesson_id", lesson.id).maybeSingle();
      if (error) throw error;
      if (!quizRow) return null;

      const { data: questions, error: qErr } = await sb
        .from("quiz_questions")
        .select("*, answers:quiz_answers!quiz_answers_question_id_fkey(*)")
        .eq("quiz_id", quizRow.id)
        .order("order", { ascending: true })
        .order("order", { referencedTable: "quiz_answers", ascending: true });
      if (qErr) throw qErr;

      return { ...quizRow, questions: questions || [] };
    },
  });

  const { data: attempts = [] } = useQuery({
    queryKey: ["quiz-attempts-stage", quiz?.id, user?.id],
    enabled: !!quiz?.id && !!user?.id,
    queryFn: async () => {
      const { data, error } = await sb.from("quiz_attempts")
        .select("*").eq("quiz_id", quiz.id).eq("user_id", user!.id)
        .order("completed_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const passed = attempts.some((a: any) => a.passed);
  const used = attempts.length;
  const max = quiz?.max_attempts || 0;
  const canRetake = max === 0 || used < max;

  // Timer countdown
  useEffect(() => {
    if (!quizStarted || timeRemaining <= 0 || quizSubmitted) return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [quizStarted, timeRemaining, quizSubmitted]);

  const submitQuizMutation = useMutation({
    mutationFn: async () => {
      const questionsData = quiz.questions as QuizQuestion[];
      let totalScore = 0;
      const responses: any[] = [];

      questionsData.forEach((q: QuizQuestion) => {
        const userAnswer = answers[q.id] || "";
        let isCorrect = false;
        let selectedAnswerId: string | null = null;

        if (q.question_type === "multiple_choice" || q.question_type === "true_false") {
          const correctAnswer = q.answers?.find((a: QuizAnswer) => a.is_correct);
          isCorrect = userAnswer === correctAnswer?.id;
          selectedAnswerId = userAnswer;
        } else {
          // Short answer - assume correct for now (needs manual grading)
          isCorrect = userAnswer.trim().length > 0;
        }

        if (isCorrect) totalScore += q.points || 1;

        responses.push({
          question_id: q.id,
          selected_answer_id: selectedAnswerId,
          text_response: q.question_type === "short_answer" ? userAnswer : null,
          is_correct: isCorrect,
        });
      });

      const totalPoints = questionsData.reduce((sum, q) => sum + (q.points || 1), 0);
      const scorePercent = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0;
      const isPassed = scorePercent >= (quiz.passing_score || 70);
      const timeSpent = quiz.time_limit_minutes ? quiz.time_limit_minutes - Math.floor(timeRemaining / 60) : 0;

      const { data: attempt, error: attemptError } = await sb.from("quiz_attempts")
        .insert({
          quiz_id: quiz.id,
          user_id: user!.id,
          score: scorePercent,
          passed: isPassed,
          time_spent_minutes: timeSpent,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (attemptError) throw attemptError;

      // Save responses
      const responsesWithAttempt = responses.map(r => ({ ...r, attempt_id: attempt.id }));
      const { error: responseError } = await sb.from("quiz_responses").insert(responsesWithAttempt);
      if (responseError) throw responseError;

      return { attempt, scorePercent, isPassed };
    },
    onSuccess: ({ attempt, scorePercent, isPassed }) => {
      setAttemptResult({ score: scorePercent, passed: isPassed });
      setQuizSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["quiz-attempts-stage", quiz?.id] });
      
      if (isPassed && onComplete) {
        onComplete();
      }

      toast({
        title: isPassed ? "Quiz Passed!" : "Quiz Completed",
        description: `You scored ${scorePercent}%. ${isPassed ? "Great job!" : "Keep trying!"}`,
        variant: isPassed ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Submission failed",
        description: error.message || "Failed to submit quiz",
        variant: "destructive",
      });
    },
  });

  const handleStart = () => {
    setQuizStarted(true);
    setQuizSubmitted(false);
    setAnswers({});
    setCurrentQuestion(0);
    setAttemptResult(null);
    if (quiz?.time_limit_minutes) {
      setTimeRemaining(quiz.time_limit_minutes * 60);
    }
  };

  const handleSubmit = () => {
    submitQuizMutation.mutate();
  };

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const currentQ = quiz?.questions?.[currentQuestion] as QuizQuestion | undefined;
  const totalQuestions = quiz?.questions?.length || 0;
  const answeredCount = Object.keys(answers).filter(k => answers[k]?.trim()).length;

  if (!quiz) {
    return (
      <div className="bg-[#F5F1E8] min-h-[60vh] py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <Card className="bg-white border-[#E8E4DC]">
            <CardContent className="p-6 text-sm text-[#6B6761]">
              No quiz attached to this lesson yet.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Not started - show quiz intro
  if (!quizStarted) {
    return (
      <div className="bg-[#F5F1E8] min-h-[60vh] py-8 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-2 text-xs text-[#B49A67] uppercase tracking-wide font-semibold">
            <HelpCircle className="h-4 w-4" /> Quiz Assessment
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#252525]">{quiz.title}</h1>

          <Card className="bg-white border-[#E8E4DC] shadow-sm">
            <CardContent className="p-6 space-y-4">
              {quiz.description && (
                <p className="text-sm text-[#4A4A4A]">{quiz.description}</p>
              )}
              
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-[#F5F1E8] text-[#5A2633] border border-[#E8E4DC]">
                  {totalQuestions} question{totalQuestions !== 1 ? 's' : ''}
                </Badge>
                {quiz.time_limit_minutes && (
                  <Badge className="bg-[#F5F1E8] text-[#5A2633] border border-[#E8E4DC]">
                    <Clock className="h-3 w-3 mr-1" />{quiz.time_limit_minutes} minutes
                  </Badge>
                )}
                <Badge className="bg-[#F5F1E8] text-[#5A2633] border border-[#E8E4DC]">
                  Passing score: {quiz.passing_score}%
                </Badge>
                {max > 0 && (
                  <Badge className="bg-[#F5F1E8] text-[#5A2633] border border-[#E8E4DC]">
                    Attempts: {used} / {max}
                  </Badge>
                )}
                {passed && (
                  <Badge className="bg-[#22C55E] text-white border-0">
                    <Check className="h-3 w-3 mr-1" />Passed
                  </Badge>
                )}
              </div>

              {attempts.length > 0 && (
                <div className="pt-4 border-t border-[#E8E4DC]">
                  <h3 className="text-sm font-semibold text-[#252525] mb-2">Previous Attempts</h3>
                  <div className="space-y-2">
                    {attempts.slice(0, 3).map((attempt: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-[#6B6761]">
                          {new Date(attempt.completed_at).toLocaleDateString()}
                        </span>
                        <Badge className={attempt.passed ? "bg-[#22C55E] text-white" : "bg-[#EF4444] text-white"}>
                          {attempt.score}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4">
                {canRetake ? (
                  <Button 
                    onClick={handleStart}
                    className="bg-[#5A2633] hover:bg-[#3D1A22] text-white shadow-sm"
                    size="lg"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {passed ? "Retake Quiz" : used > 0 ? "Continue" : "Start Quiz"}
                  </Button>
                ) : (
                  <Alert className="border-[#EF4444]/20 bg-[#EF4444]/10">
                    <AlertTriangle className="h-4 w-4 text-[#EF4444]" />
                    <AlertDescription className="text-[#EF4444]">
                      You've used all {max} attempts for this quiz.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Quiz submitted - show results
  if (quizSubmitted && attemptResult) {
    return (
      <div className="bg-[#F5F1E8] min-h-[60vh] py-8 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card className={`border-2 ${attemptResult.passed ? 'border-[#22C55E] bg-[#22C55E]/5' : 'border-[#EF4444] bg-[#EF4444]/5'}`}>
            <CardHeader>
              <div className="text-center space-y-4">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${attemptResult.passed ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`}>
                  <span className="text-3xl font-bold text-white">{attemptResult.score}%</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#252525]">
                    {attemptResult.passed ? "Congratulations!" : "Quiz Completed"}
                  </h2>
                  <p className="text-[#6B6761] mt-2">
                    {attemptResult.passed 
                      ? `You passed with ${attemptResult.score}%!`
                      : `You scored ${attemptResult.score}%. Keep practicing!`
                    }
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center gap-3">
                {canRetake && (
                  <Button 
                    onClick={handleStart}
                    variant="outline"
                    className="border-[#D1CEC7] text-[#5A2633] hover:bg-[#F5F1E8]"
                  >
                    Try Again
                  </Button>
                )}
                {attemptResult.passed && onComplete && (
                  <Button 
                    onClick={onComplete}
                    className="bg-[#5A2633] hover:bg-[#3D1A22] text-white"
                  >
                    Continue to Next Lesson
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Quiz in progress
  return (
    <div className="bg-[#F5F1E8] min-h-[60vh] py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Progress Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#6B6761]">
              Question {currentQuestion + 1} of {totalQuestions}
            </p>
            <Progress 
              value={((currentQuestion + 1) / totalQuestions) * 100} 
              className="h-2 mt-2 bg-[#E8E4DC] [&>div]:bg-[#5A2633]"
            />
          </div>
          {quiz.time_limit_minutes && timeRemaining > 0 && (
            <Badge className="bg-[#F5F1E8] text-[#5A2633] border border-[#E8E4DC]">
              <Clock className="h-3 w-3 mr-1" />
              {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
            </Badge>
          )}
        </div>

        {/* Question Card */}
        {currentQ && (
          <Card className="bg-white border-[#E8E4DC] shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-[#252525] mb-4">
                  {currentQ.question}
                </h3>

                {(currentQ.question_type === "multiple_choice" || currentQ.question_type === "true_false") && (
                  <RadioGroup
                    value={answers[currentQ.id] || ""}
                    onValueChange={(value) => handleAnswer(currentQ.id, value)}
                  >
                    <div className="space-y-3">
                      {currentQ.answers?.map((answer: QuizAnswer) => (
                        <div
                          key={answer.id}
                          className="flex items-center space-x-3 p-3 rounded-lg border border-[#E8E4DC] hover:bg-[#F5F1E8] transition-colors"
                        >
                          <RadioGroupItem value={answer.id} id={answer.id} />
                          <Label 
                            htmlFor={answer.id}
                            className="flex-1 cursor-pointer text-[#252525]"
                          >
                            {answer.answer}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                )}

                {currentQ.question_type === "short_answer" && (
                  <Textarea
                    value={answers[currentQ.id] || ""}
                    onChange={(e) => handleAnswer(currentQ.id, e.target.value)}
                    placeholder="Type your answer here..."
                    className="min-h-[120px] bg-white border-[#D1CEC7] text-[#252525]"
                  />
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-[#E8E4DC]">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestion === 0}
                  className="border-[#D1CEC7] text-[#5A2633] hover:bg-[#F5F1E8]"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                {currentQuestion < totalQuestions - 1 ? (
                  <Button
                    onClick={() => setCurrentQuestion(prev => prev + 1)}
                    className="bg-[#5A2633] hover:bg-[#3D1A22] text-white"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={submitQuizMutation.isPending}
                    className="bg-[#22C55E] hover:bg-[#16A34A] text-white"
                  >
                    {submitQuizMutation.isPending ? "Submitting..." : "Submit Quiz"}
                  </Button>
                )}
              </div>

              <p className="text-xs text-[#6B6761] text-center">
                Answered: {answeredCount} / {totalQuestions}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
