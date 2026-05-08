import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { isUnauthorizedError } from "@/lib/authUtils";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/header";

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

interface Quiz {
  id: string;
  title: string;
  description: string;
  time_limit_minutes: number;
  passing_score: number;
  max_attempts: number;
  questions: QuizQuestion[];
}

interface QuizAttempt {
  id: string;
  score: number | string;
  passed: boolean;
  time_spent_minutes?: number;
  completed_at?: string;
}

export default function QuizPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You need to be logged in to take quizzes.",
        variant: "destructive",
      });
      setTimeout(() => {
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: quiz = null, isLoading: quizLoading } = useQuery<any>({
    queryKey: ["quiz", quizId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select(
          `
          *,
          questions:quiz_questions!quiz_questions_quiz_id_fkey(*, answers:quiz_answers!quiz_answers_question_id_fkey(*))
        `,
        )
        .eq("id", quizId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!quizId && isAuthenticated,
  });

  const { data: attempts = [] } = useQuery<any[]>({
    queryKey: ["quiz-attempts", quizId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("*")
        .eq("quiz_id", quizId)
        .eq("user_id", user!.id)
        .order("completed_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!quizId && !!user && isAuthenticated,
  });

  // Timer effect
  useEffect(() => {
    if (!quizStarted || timeRemaining <= 0 || quizSubmitted) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizStarted, timeRemaining, quizSubmitted]);

  // Submit quiz mutation
  const submitQuizMutation = useMutation({
    mutationFn: async (quizAnswers: Record<string, string>) => {
      // Transform { questionId: value } → [{ questionId, answerId|responseText }]
      const responses = (quiz?.questions || []).map((q: QuizQuestion) => {
        const value = quizAnswers[q.id] ?? "";
        if (
          q.question_type === "multiple_choice" ||
          q.question_type === "true_false"
        ) {
          return { questionId: q.id, answerId: value || undefined };
        }
        return { questionId: q.id, responseText: value };
      });

      const response = await fetch(`/api/quizzes/${quizId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          responses,
          timeSpent: quiz ? quiz.time_limit_minutes * 60 - timeRemaining : 0,
        }),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Failed to submit quiz");
      }
      return response.json();
    },
    onSuccess: () => {
      setQuizSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["quiz-attempts", quizId] });
      toast({
        title: "Quiz Submitted",
        description: "Your quiz has been submitted successfully!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          setTimeout(() => {
            window.location.href = "/login";
          }, 500);
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to submit quiz. Please try again.",
        variant: "destructive",
      });
    },
  });

  const startQuiz = () => {
    setQuizStarted(true);
    setTimeRemaining((quiz?.time_limit_minutes || 30) * 60);
    setCurrentQuestion(0);
    setAnswers({});
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleSubmitQuiz = () => {
    if (quizSubmitted) return;
    submitQuizMutation.mutate(answers);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const nextQuestion = () => {
    if (quiz && currentQuestion < (quiz.questions?.length || 0) - 1) {
      setCurrentQuestion((prev) => prev + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="animate-pulse p-8">
          <div className="h-64 bg-muted rounded mb-4"></div>
          <div className="h-8 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (quizLoading || !quiz) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="animate-pulse p-8">
          <div className="h-64 bg-muted rounded mb-4"></div>
          <div className="h-8 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  // Check if user has exceeded max attempts
  const hasExceededAttempts = attempts.length >= (quiz.max_attempts || 3);

  if (hasExceededAttempts && !quizSubmitted) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div
          className="max-w-4xl mx-auto px-4 py-16 text-center"
          data-testid="max-attempts-reached"
        >
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Maximum Attempts Reached
          </h1>
          <p className="text-muted-foreground mb-8">
            You have reached the maximum number of attempts ({quiz.max_attempts}
            ) for this quiz.
          </p>
          <Button
            onClick={() => setLocation("/dashboard")}
            data-testid="back-to-dashboard"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (quizSubmitted) {
    const latestAttempt = attempts[0];
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div
          className="max-w-4xl mx-auto px-4 py-16"
          data-testid="quiz-results"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Quiz Complete!</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div className="text-6xl font-bold text-primary">
                {latestAttempt?.score || "N/A"}%
              </div>
              <div>
                <Badge
                  variant={latestAttempt?.passed ? "default" : "destructive"}
                  className="text-lg px-4 py-2"
                >
                  {latestAttempt?.passed ? "PASSED" : "FAILED"}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Passing score: {quiz.passing_score}%
              </p>
              <div className="flex justify-center space-x-4">
                <Button
                  variant="outline"
                  onClick={() => setLocation("/dashboard")}
                  data-testid="back-to-dashboard"
                >
                  Back to Dashboard
                </Button>
                {!latestAttempt?.passed &&
                  attempts.length < quiz.max_attempts && (
                    <Button
                      onClick={() => {
                        setQuizSubmitted(false);
                        setQuizStarted(false);
                        setAnswers({});
                        setCurrentQuestion(0);
                      }}
                      data-testid="retake-quiz"
                    >
                      Retake Quiz
                    </Button>
                  )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!quizStarted) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-16" data-testid="quiz-intro">
          <Card>
            <CardHeader>
              <CardTitle>{quiz.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">{quiz.description}</p>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">Quiz Details</h3>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>Questions: {quiz.questions?.length || 0}</div>
                    <div>
                      Time Limit: {formatTime(quiz.time_limit_minutes * 60)}
                    </div>
                    <div>Passing Score: {quiz.passing_score}%</div>
                    <div>Max Attempts: {quiz.max_attempts}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Your Attempts</h3>
                  <div className="text-sm text-muted-foreground">
                    {attempts.length > 0 ? (
                      <div>
                        <div>
                          Attempts: {attempts.length} / {quiz.max_attempts}
                        </div>
                        <div>
                          Best Score:{" "}
                          {Math.max(
                            ...attempts.map((a: QuizAttempt) =>
                              parseInt(String(a.score || "0")),
                            ),
                          )}
                          %
                        </div>
                      </div>
                    ) : (
                      <div>No previous attempts</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <Button onClick={startQuiz} size="lg" data-testid="start-quiz">
                  Start Quiz
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentQ = quiz.questions?.[currentQuestion];
  const progressPercentage =
    ((currentQuestion + 1) / (quiz.questions?.length || 1)) * 100;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-8" data-testid="quiz-taking">
        {/* Quiz Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-foreground">{quiz.title}</h1>
            <div className="text-right">
              <div
                className="text-lg font-semibold text-primary"
                data-testid="timer"
              >
                {formatTime(timeRemaining)}
              </div>
              <div className="text-sm text-muted-foreground">
                Time Remaining
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                Question {currentQuestion + 1} of {quiz.questions?.length}
              </span>
              <span>{progressPercentage.toFixed(0)}% Complete</span>
            </div>
            <Progress
              value={progressPercentage}
              className="h-2"
              data-testid="quiz-progress"
            />
          </div>
        </div>

        {/* Current Question */}
        {currentQ && (
          <Card className="mb-6" data-testid="current-question">
            <CardHeader>
              <CardTitle className="text-lg">
                {currentQ.question}
                <Badge variant="outline" className="ml-2">
                  {currentQ.points} points
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentQ.question_type === "multiple_choice" &&
                currentQ.answers && (
                  <RadioGroup
                    value={answers[currentQ.id] || ""}
                    onValueChange={(value: string) =>
                      handleAnswerChange(currentQ.id, value)
                    }
                    data-testid="multiple-choice-answers"
                    className="gap-3"
                  >
                    {currentQ.answers
                      .sort((a: QuizAnswer, b: QuizAnswer) => a.order - b.order)
                      .map((answer: QuizAnswer) => {
                        const selected = answers[currentQ.id] === answer.id;
                        return (
                          <Label
                            key={answer.id}
                            htmlFor={answer.id}
                            className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors hover:bg-accent ${
                              selected
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : "border-border"
                            }`}
                          >
                            <RadioGroupItem value={answer.id} id={answer.id} />
                            <span className="flex-1 text-sm">{answer.answer}</span>
                          </Label>
                        );
                      })}
                  </RadioGroup>
                )}

              {currentQ.question_type === "essay" && (
                <Textarea
                  placeholder="Type your answer here..."
                  value={answers[currentQ.id] || ""}
                  onChange={(e) =>
                    handleAnswerChange(currentQ.id, e.target.value)
                  }
                  className="min-h-[150px]"
                  data-testid="essay-answer"
                />
              )}

              {currentQ.question_type === "true_false" && (
                <RadioGroup
                  value={answers[currentQ.id] || ""}
                  onValueChange={(value: string) =>
                    handleAnswerChange(currentQ.id, value)
                  }
                  data-testid="true-false-answers"
                  className="gap-3"
                >
                  {(currentQ.answers && currentQ.answers.length > 0
                    ? [...currentQ.answers].sort(
                        (a: QuizAnswer, b: QuizAnswer) => a.order - b.order,
                      )
                    : [
                        { id: `${currentQ.id}-true`, answer: "True", is_correct: false, order: 0 },
                        { id: `${currentQ.id}-false`, answer: "False", is_correct: false, order: 1 },
                      ]
                  ).map((answer: QuizAnswer) => {
                    const selected = answers[currentQ.id] === answer.id;
                    return (
                      <Label
                        key={answer.id}
                        htmlFor={answer.id}
                        className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors hover:bg-accent ${
                          selected
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border"
                        }`}
                      >
                        <RadioGroupItem value={answer.id} id={answer.id} />
                        <span className="flex-1 text-sm">{answer.answer}</span>
                      </Label>
                    );
                  })}
                </RadioGroup>
              )}

              {currentQ.question_type === "fill_blank" && (
                <Textarea
                  placeholder="Type your answer here..."
                  value={answers[currentQ.id] || ""}
                  onChange={(e) =>
                    handleAnswerChange(currentQ.id, e.target.value)
                  }
                  className="min-h-[80px]"
                  data-testid="fill-blank-answer"
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <div>
            {currentQuestion > 0 && (
              <Button
                variant="outline"
                onClick={prevQuestion}
                data-testid="prev-question"
              >
                Previous
              </Button>
            )}
          </div>

          <div className="flex space-x-2">
            {currentQuestion < (quiz.questions?.length || 0) - 1 ? (
              <Button onClick={nextQuestion} data-testid="next-question">
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSubmitQuiz}
                disabled={submitQuizMutation.isPending}
                data-testid="submit-quiz"
              >
                {submitQuizMutation.isPending ? "Submitting..." : "Submit Quiz"}
              </Button>
            )}
          </div>
        </div>

        {/* Question Overview */}
        <Card className="mt-6" data-testid="question-overview">
          <CardHeader>
            <CardTitle className="text-lg">Question Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
              {quiz.questions?.map((q: QuizQuestion, index: number) => (
                <Button
                  key={q.id}
                  variant={
                    index === currentQuestion
                      ? "default"
                      : answers[q.id]
                        ? "secondary"
                        : "outline"
                  }
                  size="sm"
                  onClick={() => setCurrentQuestion(index)}
                  className="aspect-square"
                  data-testid={`question-nav-${index + 1}`}
                >
                  {index + 1}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
