import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  assignmentId: string;
  maxScore: number;
  groupMode: "individual" | "group";
}

interface Submission {
  id: string;
  user_id: string | null;
  group_id: string | null;
  content: string;
  attachment_urls: string[] | null;
  score: number | null;
  feedback: string | null;
  user?: { first_name: string; last_name: string } | null;
  group?: { id: string; name: string } | null;
  groupMembers?: { id: string; first_name: string; last_name: string }[];
}

function SubmissionRow({ submission, maxScore }: { submission: Submission; maxScore: number }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [score, setScore] = useState(submission.score != null ? String(submission.score) : "");
  const [feedback, setFeedback] = useState(submission.feedback || "");

  const grade = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/assignments-ext/assignment-submissions/${submission.id}/grade`, {
        score: Number(score),
        feedback,
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignment-submissions", submission.id] });
      toast({ title: "Graded" });
    },
    onError: (e: any) => toast({ title: "Failed to save grade", description: e?.message, variant: "destructive" }),
  });

  const who = submission.group
    ? `${submission.group.name} (${(submission.groupMembers || []).map((m) => `${m.first_name} ${m.last_name}`).join(", ") || "no members yet"})`
    : submission.user
    ? `${submission.user.first_name} ${submission.user.last_name}`
    : "Unknown";

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{who}</CardTitle>
          {submission.score != null && (
            <Badge className="bg-blue-600 text-white border-0">
              {submission.score}/{maxScore}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm whitespace-pre-line">{submission.content || <span className="text-muted-foreground">No text response</span>}</p>
        {submission.attachment_urls && submission.attachment_urls.length > 0 && (
          <div className="text-xs text-muted-foreground">{submission.attachment_urls.length} file(s) attached</div>
        )}
        <div className="grid grid-cols-[100px_1fr] gap-2 items-start">
          <Input type="number" min={0} max={maxScore} placeholder={`/ ${maxScore}`} value={score} onChange={(e) => setScore(e.target.value)} />
          <Textarea placeholder="Feedback (optional)" rows={2} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => grade.mutate()} disabled={grade.isPending || score === ""}>
            {grade.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
            Save grade
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function GradingPanel({ assignmentId, maxScore, groupMode }: Props) {
  const { data: submissions, isLoading } = useQuery<Submission[]>({
    queryKey: ["assignment-submissions", assignmentId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/assignments-ext/assignments/${assignmentId}/submissions`);
      return res.json();
    },
  });

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin mx-auto my-6" />;

  if (!submissions || submissions.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No submissions yet.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {submissions.length} {groupMode === "group" ? "group submission(s)" : "submission(s)"}
      </p>
      {submissions.map((s) => (
        <SubmissionRow key={s.id} submission={s} maxScore={maxScore} />
      ))}
    </div>
  );
}
