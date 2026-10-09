import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ClipboardList, Send, Check, AlertTriangle, Clock, FileText, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { LearnLesson } from "./types";

const sb: any = supabase;

export default function AssignmentStage({ lesson, onComplete }: { lesson: LearnLesson; onComplete?: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [assignmentStarted, setAssignmentStarted] = useState(false);
  const [assignmentSubmitted, setAssignmentSubmitted] = useState(false);
  const [response, setResponse] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [isGrading, setIsGrading] = useState(false);

  const { data: assignment } = useQuery({
    queryKey: ["lesson-assignment", lesson.id],
    queryFn: async () => {
      const { data, error } = await sb.from("assignments")
        .select("*").eq("lesson_id", lesson.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ["assignment-submissions", assignment?.id, user?.id],
    enabled: !!assignment?.id && !!user?.id,
    queryFn: async () => {
      const { data, error } = await sb.from("assignment_submissions")
        .select("*")
        .eq("assignment_id", assignment.id)
        .eq("user_id", user!.id)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const latestSubmission = submissions[0];
  const isGraded = latestSubmission?.graded_at;
  const canRetry = !assignment?.max_attempts || submissions.length < assignment.max_attempts;

  // AI Grading Mutation
  const gradeAssignmentMutation = useMutation({
    mutationFn: async ({ submissionId, content }: { submissionId: string; content: string }) => {
      setIsGrading(true);
      
      // Call AI grading endpoint
      const response = await fetch('/api/ai-tutor/grade-assignment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await sb.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          assignmentId: assignment.id,
          submissionId,
          response: content,
          assignmentTitle: assignment.title,
          assignmentInstructions: assignment.instructions,
          maxScore: assignment.max_score || 100,
          lessonContext: {
            courseId: lesson.id,
            lessonTitle: lesson.title,
            lessonType: 'assignment',
          },
        }),
      });

      if (!response.ok) {
        throw new Error('AI grading failed');
      }

      const result = await response.json();
      return result;
    },
    onSuccess: async (result) => {
      // Update submission with AI grading
      const { error } = await sb.from("assignment_submissions").update({
        score: result.score,
        feedback: result.feedback,
        graded_at: new Date().toISOString(),
        graded_by_ai: true,
      }).eq("id", result.submissionId);

      if (error) throw error;

      setSubmissionResult(result);
      setIsGrading(false);
      setAssignmentSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["assignment-submissions", assignment?.id] });

      // Auto-complete if passed
      if (result.passed && onComplete) {
        onComplete();
      }

      toast({
        title: result.passed ? "Assignment Passed!" : "Assignment Graded",
        description: `You scored ${result.score}/${assignment.max_score}`,
        variant: result.passed ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      setIsGrading(false);
      toast({
        title: "Grading failed",
        description: error.message || "Failed to grade assignment",
        variant: "destructive",
      });
    },
  });

  // Submit Assignment Mutation
  const submitAssignmentMutation = useMutation({
    mutationFn: async () => {
      if (!response.trim() && files.length === 0) {
        throw new Error("Please provide a response or upload files");
      }

      // Upload files if any
      const attachmentUrls: string[] = [];
      for (const file of files) {
        const path = `${user!.id}/${assignment.id}/${crypto.randomUUID()}-${file.name}`;
        const { error: uploadError } = await sb.storage
          .from("assignment-submissions")
          .upload(path, file);
        
        if (uploadError) throw uploadError;
        attachmentUrls.push(path);
      }

      const isLate = assignment.due_date ? new Date() > new Date(assignment.due_date) : false;

      // Create submission
      const { data: submission, error } = await sb.from("assignment_submissions").insert({
        assignment_id: assignment.id,
        user_id: user!.id,
        content: response.trim(),
        attachment_urls: attachmentUrls,
        submitted_at: new Date().toISOString(),
        is_late_submission: isLate,
      }).select().single();

      if (error) throw error;

      return submission;
    },
    onSuccess: (submission) => {
      // Immediately grade with AI
      gradeAssignmentMutation.mutate({
        submissionId: submission.id,
        content: response.trim(),
      });
    },
    onError: (error: any) => {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStart = () => {
    setAssignmentStarted(true);
    setAssignmentSubmitted(false);
    setResponse("");
    setFiles([]);
    setSubmissionResult(null);
  };

  const handleSubmit = () => {
    submitAssignmentMutation.mutate();
  };

  if (!assignment) {
    return (
      <div className="bg-[#F5F1E8] min-h-[60vh] py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <Card className="bg-white border-[#E8E4DC]">
            <CardContent className="p-6 text-sm text-[#6B6761]">
              No assignment attached to this lesson yet.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Not started - show assignment intro
  if (!assignmentStarted && !latestSubmission) {
    return (
      <div className="bg-[#F5F1E8] min-h-[60vh] py-8 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-2 text-xs text-[#B49A67] uppercase tracking-wide font-semibold">
            <ClipboardList className="h-4 w-4" /> Assignment
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#252525]">{assignment.title}</h1>

          <Card className="bg-white border-[#E8E4DC] shadow-sm">
            <CardContent className="p-6 space-y-4">
              {assignment.description && (
                <p className="text-sm text-[#4A4A4A]">{assignment.description}</p>
              )}

              {assignment.instructions && (
                <div className="p-4 bg-[#F5F1E8] rounded-lg border border-[#E8E4DC]">
                  <h3 className="text-sm font-semibold text-[#252525] mb-2">Instructions</h3>
                  <p className="text-sm text-[#4A4A4A] whitespace-pre-line">{assignment.instructions}</p>
                </div>
              )}
              
              <div className="flex flex-wrap gap-2">
                {assignment.due_date && (
                  <Badge className="bg-[#F5F1E8] text-[#5A2633] border border-[#E8E4DC]">
                    <Clock className="h-3 w-3 mr-1" />
                    Due: {new Date(assignment.due_date).toLocaleDateString()}
                  </Badge>
                )}
                <Badge className="bg-[#F5F1E8] text-[#5A2633] border border-[#E8E4DC]">
                  Max Score: {assignment.max_score || 100} points
                </Badge>
                {assignment.max_attempts && (
                  <Badge className="bg-[#F5F1E8] text-[#5A2633] border border-[#E8E4DC]">
                    Attempts: {submissions.length} / {assignment.max_attempts}
                  </Badge>
                )}
                <Badge className="bg-[#B49A67]/10 text-[#5A2633] border border-[#B49A67]/30">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI Graded
                </Badge>
              </div>

              <Alert className="border-[#B49A67]/30 bg-[#B49A67]/5">
                <Sparkles className="h-4 w-4 text-[#B49A67]" />
                <AlertDescription className="text-[#5A2633] text-sm">
                  This assignment will be automatically graded by our AI teaching assistant. You'll receive instant feedback and a score upon submission.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end pt-4">
                {canRetry ? (
                  <Button 
                    onClick={handleStart}
                    className="bg-[#5A2633] hover:bg-[#3D1A22] text-white shadow-sm"
                    size="lg"
                  >
                    <ClipboardList className="h-4 w-4 mr-2" />
                    {submissions.length > 0 ? "Try Again" : "Start Assignment"}
                  </Button>
                ) : (
                  <Alert className="border-[#EF4444]/20 bg-[#EF4444]/10">
                    <AlertTriangle className="h-4 w-4 text-[#EF4444]" />
                    <AlertDescription className="text-[#EF4444]">
                      You've used all {assignment.max_attempts} attempts for this assignment.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Show previous submissions */}
          {submissions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[#252525]">Previous Submissions</h3>
              {submissions.slice(0, 3).map((sub: any, idx: number) => (
                <Card key={idx} className="bg-white border-[#E8E4DC]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-[#6B6761]">
                          {new Date(sub.submitted_at).toLocaleString()}
                        </p>
                        {sub.graded_at && (
                          <p className="text-xs text-[#4A4A4A] mt-1">
                            Score: {sub.score}/{assignment.max_score}
                          </p>
                        )}
                      </div>
                      <Badge className={sub.score >= (assignment.passing_score || 70) ? "bg-[#22C55E] text-white" : "bg-[#EF4444] text-white"}>
                        {sub.score}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Assignment submitted - show AI grading results
  if ((assignmentSubmitted && submissionResult) || (latestSubmission && !assignmentStarted)) {
    const result = submissionResult || latestSubmission;
    const passed = result.score >= (assignment.passing_score || 70);

    return (
      <div className="bg-[#F5F1E8] min-h-[60vh] py-8 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card className={`border-2 ${passed ? 'border-[#22C55E] bg-[#22C55E]/5' : 'border-[#EF4444] bg-[#EF4444]/5'}`}>
            <CardHeader>
              <div className="text-center space-y-4">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${passed ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`}>
                  <span className="text-3xl font-bold text-white">{result.score}</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#252525]">
                    {passed ? "Excellent Work!" : "Assignment Completed"}
                  </h2>
                  <p className="text-[#6B6761] mt-2">
                    {passed 
                      ? `You scored ${result.score}/${assignment.max_score}!`
                      : `You scored ${result.score}/${assignment.max_score}. Keep practicing!`
                    }
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.feedback && (
                <div className="bg-white p-4 rounded-lg border border-[#E8E4DC]">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-[#B49A67]" />
                    <h3 className="text-sm font-semibold text-[#252525]">AI Feedback</h3>
                  </div>
                  <p className="text-sm text-[#4A4A4A] whitespace-pre-line">{result.feedback}</p>
                </div>
              )}

              <div className="flex justify-center gap-3 pt-4">
                {canRetry && (
                  <Button 
                    onClick={handleStart}
                    variant="outline"
                    className="border-[#D1CEC7] text-[#5A2633] hover:bg-[#F5F1E8]"
                  >
                    Try Again
                  </Button>
                )}
                {passed && onComplete && (
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

  // Assignment in progress
  return (
    <div className="bg-[#F5F1E8] min-h-[60vh] py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Assignment Header */}
        <div>
          <div className="flex items-center gap-2 text-xs text-[#B49A67] uppercase tracking-wide font-semibold mb-2">
            <ClipboardList className="h-4 w-4" /> Assignment
          </div>
          <h1 className="text-2xl font-bold text-[#252525]">{assignment.title}</h1>
        </div>

        {/* Assignment Instructions */}
        {assignment.instructions && (
          <Card className="bg-white border-[#E8E4DC] shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-[#252525] mb-2">Instructions</h3>
              <p className="text-sm text-[#4A4A4A] whitespace-pre-line">{assignment.instructions}</p>
            </CardContent>
          </Card>
        )}

        {/* Response Input */}
        <Card className="bg-white border-[#E8E4DC] shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="text-sm font-semibold text-[#252525] mb-2 block">
                Your Response
              </label>
              <Textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Type your assignment response here..."
                className="min-h-[300px] bg-white border-[#D1CEC7] text-[#252525]"
                disabled={isGrading || submitAssignmentMutation.isPending}
              />
              <p className="text-xs text-[#6B6761] mt-2">
                {response.length} characters
              </p>
            </div>

            {/* File Upload */}
            <div>
              <label className="text-sm font-semibold text-[#252525] mb-2 block flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Attachments (Optional)
              </label>
              <Input
                type="file"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
                className="bg-white border-[#D1CEC7] text-[#252525]"
                disabled={isGrading || submitAssignmentMutation.isPending}
              />
              {files.length > 0 && (
                <p className="text-xs text-[#6B6761] mt-2">
                  {files.length} file(s) selected
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4 border-t border-[#E8E4DC]">
              <Button
                onClick={handleSubmit}
                disabled={isGrading || submitAssignmentMutation.isPending || (!response.trim() && files.length === 0)}
                className="bg-[#5A2633] hover:bg-[#3D1A22] text-white"
                size="lg"
              >
                {isGrading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    AI is grading...
                  </>
                ) : submitAssignmentMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Assignment
                  </>
                )}
              </Button>
            </div>

            {isGrading && (
              <Alert className="border-[#B49A67]/30 bg-[#B49A67]/5">
                <Sparkles className="h-4 w-4 text-[#B49A67] animate-pulse" />
                <AlertDescription className="text-[#5A2633] text-sm">
                  Our AI teaching assistant is reviewing your assignment. This may take a moment...
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
